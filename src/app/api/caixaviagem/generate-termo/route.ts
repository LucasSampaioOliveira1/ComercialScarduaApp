import { NextRequest, NextResponse } from "next/server";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const { caixaId } = await req.json();

    // Buscar a caixa de viagem com todos os detalhes necessários
    const caixa = await prisma.caixaViagem.findUnique({
      where: { id: Number(caixaId) },
      include: {
        empresa: true,
        funcionario: true,
        veiculo: true,
        lancamentos: true,
        adiantamentos: true // Manter para cálculo do total
      },
    });

    if (!caixa) {
      return NextResponse.json({ error: "Caixa de viagem não encontrada" }, { status: 404 });
    }

    // Criar um novo documento PDF
    const pdfDoc = await PDFDocument.create();
    let page = pdfDoc.addPage([842, 595]); // Tamanho A4 paisagem
    const { height, width } = page.getSize();

    // Adicionar fonte
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    
    const BLACK = rgb(0, 0, 0);

    const fontSize = 11;
    const titleSize = 16;
    const spacing = 20;
    let y = height - 50;

    // Título centralizado
    const title = "CAIXA VIAGEM";
    const titleWidth = boldFont.widthOfTextAtSize(title, titleSize);
    page.drawText(title, {
      x: (width - titleWidth) / 2,
      y,
      size: titleSize,
      font: boldFont,
      color: BLACK,
    });

    y -= spacing * 2;

    // Número da caixa
    const caixaNumero = `Nº da Caixa: ${caixa.numeroCaixa || caixa.id}`;
    const caixaNumeroWidth = font.widthOfTextAtSize(caixaNumero, fontSize);
    page.drawText(caixaNumero, {
      x: (width - caixaNumeroWidth) / 2,
      y,
      size: fontSize,
      font: font,
      color: BLACK,
    });

    y -= spacing * 2;

    // Formatação de data (mantém igual)
    const formatDate = (dateString?: string | Date | null) => {
      if (!dateString) return "";
      try {
        // Para strings de data com formato ISO
        if (typeof dateString === 'string') {
          // Para strings ISO com timezone (formato com "T")
          if (dateString.includes('T')) {
            // Criar uma data com base na string
            const date = new Date(dateString);
            
            // Adicionar um dia para corrigir o problema do timezone
            date.setDate(date.getDate() + 1);
            
            // Retornar a data formatada
            return `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}`;
          }
          
          // Para strings de data simples YYYY-MM-DD
          if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
            const [year, month, day] = dateString.split('-').map(Number);
            const date = new Date(year, month - 1, day, 12, 0, 0);
            date.setDate(date.getDate() + 1);
            return `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}`;
          }
        }
        
        // Para objetos Date
        if (dateString instanceof Date) {
          const dateCopy = new Date(dateString);
          dateCopy.setDate(dateCopy.getDate() + 1);
          return `${dateCopy.getDate().toString().padStart(2, '0')}/${(dateCopy.getMonth() + 1).toString().padStart(2, '0')}/${dateCopy.getFullYear()}`;
        }
        
        // Último recurso
        const date = new Date(dateString);
        if (!isNaN(date.getTime())) {
          date.setDate(date.getDate() + 1);
          return `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}`;
        }
        
        return String(dateString);
      } catch (error) {
        console.error("Erro ao formatar data:", error, dateString);
        return String(dateString);
      }
    };

    // Formatação de moeda com separador de milhares
    const formatCurrency = (value: any) => {
      if (!value) return "R$ 0,00";
      const numValue = parseFloat(String(value).replace(',', '.'));
      if (isNaN(numValue)) return "R$ 0,00";
      
      // Formatar com separador de milhares (ponto) e decimais (vírgula)
      return `R$ ${numValue.toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`;
    };

    // Seção de informações da viagem
    page.drawText("INFORMAÇÕES DA VIAGEM:", {
      x: 60,
      y,
      size: fontSize,
      font: boldFont,
      color: BLACK,
    });

    y -= spacing;

    // Obter valores para exibir
    const funcionarioNome = caixa.funcionario 
      ? `${caixa.funcionario.nome} ${caixa.funcionario.sobrenome || ''}`.trim()
      : 'Funcionário não especificado';
    
    const empresaNome = caixa.empresa?.nomeEmpresa || 'Empresa não especificada';

    // Data atual formatada para exibição
    const dataAtual = new Date();
    const dataAtualFormatada = `${dataAtual.getDate().toString().padStart(2, '0')}/${(dataAtual.getMonth() + 1).toString().padStart(2, '0')}/${dataAtual.getFullYear()}`;

    // Obter saldo anterior
    const saldoAnterior = typeof caixa.saldoAnterior === 'number'
      ? caixa.saldoAnterior
      : parseFloat(String(caixa.saldoAnterior || 0));

    // Organizar informações em duas colunas para aproveitar o espaço horizontal
    const leftColumn = [
      `Empresa: ${empresaNome}`,
      `Data da Viagem: ${formatDate(caixa.data)}`,
      `Data de Emissão: ${dataAtualFormatada}`,
      `Destino: ${caixa.destino || "Não informado"}`
    ];

    const rightColumn = [
      `Funcionário: ${funcionarioNome}`,
    ];

    if (caixa.veiculo) {
      rightColumn.push(`Veículo: ${caixa.veiculo.modelo || ''} ${caixa.veiculo.placa ? `- ${caixa.veiculo.placa}` : ''}`);
    }

    // Remover o saldo anterior daqui - será movido para a tabela

    // Adicionar observação se existir
    if (caixa.observacao) {
      const obsLabel = "Observações: ";
      const obsMaxWidth = 350; // ajuste conforme necessário
      const obsText = obsLabel + caixa.observacao;
      const obsLines = wrapTextByWidth(obsText, font, fontSize, obsMaxWidth);

      if (rightColumn.length < leftColumn.length) {
        rightColumn.push(...obsLines);
      } else {
        leftColumn.push(...obsLines);
      }
    }

    // Desenhar colunas lado a lado
    const initialY = y;
    const leftX = 80;
    const rightX = 420; // Posição da segunda coluna

    // Coluna esquerda
    leftColumn.forEach(line => {
      page.drawText(line, {
        x: leftX,
        y,
        size: fontSize,
        font: font,
        color: BLACK,
      });
      y -= spacing;
    });

    // Resetar Y para a coluna direita
    y = initialY;
    
    // Coluna direita
    rightColumn.forEach(line => {
      page.drawText(line, {
        x: rightX,
        y,
        size: fontSize,
        font: font,
        color: BLACK,
      });
      y -= spacing;
    });

    // Ajustar Y para continuar após a maior coluna
    y = initialY - Math.max(leftColumn.length, rightColumn.length) * spacing;

    // Adicionar espaçamento extra entre as seções
    y -= 15;

    // Verificar se precisamos de uma nova página para os lançamentos
    if (y < 350) {
      page = pdfDoc.addPage([842, 595]); // Tamanho A4 paisagem
      y = height - 50;
    }

    // Seção de lançamentos
    const lancamentos = Array.isArray(caixa.lancamentos) ? caixa.lancamentos : [];
    const adiantamentos = Array.isArray(caixa.adiantamentos) ? caixa.adiantamentos : [];
    
    // Cálculo do total de adiantamentos (AGORA COMO VALOR POSITIVO)
    let totalAdiantamentos = 0;
    if (adiantamentos.length > 0) {
      adiantamentos.forEach(adiantamento => {
        const valorAdiantamento = adiantamento.saida ? parseFloat(String(adiantamento.saida)) : 0;
        totalAdiantamentos += valorAdiantamento;
      });
    }

    if (lancamentos.length > 0) {
      page.drawText("DETALHAMENTO DOS LANÇAMENTOS:", {
        x: 60,
        y,
        size: fontSize,
        font: boldFont,
        color: BLACK,
      });

      y -= spacing;

      // Definir dimensões da tabela - aproveitar melhor o espaço paisagem
      const tableWidth = 720; // Aumentar largura da tabela
      const tableLeft = 60;
      const tableRight = tableLeft + tableWidth;
      
      // Linha superior da tabela
      page.drawLine({
        start: { x: tableLeft, y: y + 5 },
        end: { x: tableRight, y: y + 5 },
        thickness: 1,
        color: BLACK,
      });

      // Cabeçalhos da tabela
      const headers = ["Data", "Documento", "Cliente/Forn.", "Custo", "Histórico", "Entrada", "Saída"];
      const colWidths = [80, 90, 120, 100, 150, 90, 90]; // Total = 720 - mais espaço
      
      let currentX = tableLeft;
      headers.forEach((header, index) => {
        // Calcular posição centralizada para cada cabeçalho na sua coluna
        const headerWidth = boldFont.widthOfTextAtSize(header, fontSize);
        const centerX = currentX + (colWidths[index] - headerWidth) / 2;
        
        page.drawText(header, {
          x: centerX,
          y: y - 12,
          size: fontSize,
          font: boldFont,
          color: BLACK,
        });

        // Desenhar linha vertical para separar colunas (exceto na última)
        if (index < headers.length - 1) {
          const xPos = currentX + colWidths[index];
          page.drawLine({
            start: { x: xPos, y: y + 5 },
            end: { x: xPos, y: y - 15 },
            thickness: 1,
            color: BLACK,
          });
        }
        
        currentX += colWidths[index];
      });
      
      // Linha abaixo dos cabeçalhos
      page.drawLine({
        start: { x: tableLeft, y: y - 15 },
        end: { x: tableRight, y: y - 15 },
        thickness: 1,
        color: BLACK,
      });

      y -= spacing + 5;

      // Dados dos lançamentos
      let lineHeight = spacing - 2;
      let totalEntradas = 0;
      let totalSaidas = 0;
      
      lancamentos.forEach((lancamento, index) => {
        const entrada = lancamento.entrada ? parseFloat(String(lancamento.entrada)) : 0;
        const saida = lancamento.saida ? parseFloat(String(lancamento.saida)) : 0;
        
        totalEntradas += entrada;
        totalSaidas += saida;
        
        // Verificar se precisamos de uma nova página
        if (y < 100) {
          // Fechar tabela atual
          page.drawLine({
            start: { x: tableLeft, y: y + lineHeight },
            end: { x: tableRight, y: y + lineHeight },
            thickness: 1,
            color: BLACK,
          });
          
          page.drawText("Continua na próxima página...", {
            x: width / 2 - 80,
            y: 30,
            size: 10,
            font: font,
            color: BLACK,
          });
          
          // Adicionar nova página
          page = pdfDoc.addPage([842, 595]);
          y = height - 50;
          
          page.drawText("DETALHAMENTO DOS LANÇAMENTOS (continuação):", {
            x: 60,
            y,
            size: fontSize,
            font: boldFont,
            color: BLACK,
          });
          
          y -= spacing;
          
          // Linha superior da tabela
          page.drawLine({
            start: { x: tableLeft, y: y + 5 },
            end: { x: tableRight, y: y + 5 },
            thickness: 1,
            color: BLACK,
          });
          
          // Redesenhar cabeçalhos
          currentX = tableLeft;
          headers.forEach((header, index) => {
            const headerWidth = boldFont.widthOfTextAtSize(header, fontSize);
            const centerX = currentX + (colWidths[index] - headerWidth) / 2;
            
            page.drawText(header, {
              x: centerX,
              y: y - 12,
              size: fontSize,
              font: boldFont,
              color: BLACK,
            });

            if (index < headers.length - 1) {
              const xPos = currentX + colWidths[index];
              page.drawLine({
                start: { x: xPos, y: y + 5 },
                end: { x: xPos, y: y - 15 },
                thickness: 1,
                color: BLACK,
              });
            }
            
            currentX += colWidths[index];
          });
          
          // Linha abaixo dos cabeçalhos
          page.drawLine({
            start: { x: tableLeft, y: y - 15 },
            end: { x: tableRight, y: y - 15 },
            thickness: 1,
            color: BLACK,
          });
          
          y -= spacing + 5;
        }

        // Linha para cada lançamento
        currentX = tableLeft;
        
        // Melhorar o posicionamento vertical do texto para evitar sobreposição com linhas
        const textY = y - 2;
        
        // Data
        const formattedDate = formatDate(lancamento.data);
        page.drawText(formattedDate, {
          x: currentX + 3,
          y: textY,
          size: fontSize,
          font: font,
          color: BLACK,
        });
        currentX += colWidths[0];
        
        // Linha vertical
        page.drawLine({
          start: { x: currentX, y: y + lineHeight },
          end: { x: currentX, y: y - 5 },
          thickness: 1,
          color: BLACK,
        });
        
        // Documento
        const docText = lancamento.numeroDocumento || "-";
        const maxLengthDoc = 12; // Mais espaço para documento
        const truncatedDoc = docText.length > maxLengthDoc ? 
          docText.substring(0, maxLengthDoc) + ".." : docText;
        
        page.drawText(truncatedDoc, {
          x: currentX + 3,
          y: textY,
          size: fontSize,
          font: font,
          color: BLACK,
        });
        currentX += colWidths[1];
        
        // Linha vertical
        page.drawLine({
          start: { x: currentX, y: y + lineHeight },
          end: { x: currentX, y: y - 5 },
          thickness: 1,
          color: BLACK,
        });
        
        // Cliente/Fornecedor
        const clienteFornecedor = lancamento.clienteFornecedor || "-";
        const maxLengthCF = 15; // Mais espaço
        const cfText = clienteFornecedor.length > maxLengthCF ? 
          clienteFornecedor.substring(0, maxLengthCF) + ".." : clienteFornecedor;
          
        page.drawText(cfText, {
          x: currentX + 3,
          y: textY,
          size: fontSize,
          font: font,
          color: BLACK,
        });
        currentX += colWidths[2];
        
        // Linha vertical
        page.drawLine({
          start: { x: currentX, y: y + lineHeight },
          end: { x: currentX, y: y - 5 },
          thickness: 1,
          color: BLACK,
        });
        
        // Custo
        const custoStr = typeof lancamento.custo === 'number' ? 
          formatCurrency(lancamento.custo) : 
          (lancamento.custo || "-");
        
        const maxLengthCusto = 12;
        const custoText = custoStr.length > maxLengthCusto ? 
          custoStr.substring(0, maxLengthCusto) + ".." : custoStr;
          
        page.drawText(custoText, {
          x: currentX + 3,
          y: textY,
          size: fontSize,
          font: font,
          color: BLACK,
        });
        currentX += colWidths[3];
        
        // Linha vertical
        page.drawLine({
          start: { x: currentX, y: y + lineHeight },
          end: { x: currentX, y: y - 5 },
          thickness: 1,
          color: BLACK,
        });
        
        // Histórico
        const historico = lancamento.historicoDoc || "-";
        const maxLengthHist = 20; // Muito mais espaço para histórico
        const histText = historico.length > maxLengthHist ? 
          historico.substring(0, maxLengthHist) + ".." : historico;
          
        page.drawText(histText, {
          x: currentX + 3,
          y: textY,
          size: fontSize,
          font: font,
          color: BLACK,
        });
        currentX += colWidths[4];
        
        // Linha vertical
        page.drawLine({
          start: { x: currentX, y: y + lineHeight },
          end: { x: currentX, y: y - 5 },
          thickness: 1,
          color: BLACK,
        });
        
        // Entrada (alinhado à direita dentro da coluna)
        if (entrada > 0) {
          const entradaText = formatCurrency(entrada);
          const textWidth = font.widthOfTextAtSize(entradaText, fontSize);
          page.drawText(entradaText, {
            x: currentX + colWidths[5] - textWidth - 3,
            y: textY,
            size: fontSize,
            font: font,
            color: BLACK,
          });
        } else {
          page.drawText("-", {
            x: currentX + colWidths[5]/2,
            y: textY,
            size: fontSize,
            font: font,
            color: BLACK,
          });
        }
        currentX += colWidths[5];
        
        // Linha vertical
        page.drawLine({
          start: { x: currentX, y: y + lineHeight },
          end: { x: currentX, y: y - 5 },
          thickness: 1,
          color: BLACK,
        });
        
        // Saída (alinhado à direita dentro da coluna) com formatação negativa
        if (saida > 0) {
          const saidaText = `- ${formatCurrency(saida)}`; // Sinal negativo com espaço
          const textWidth = font.widthOfTextAtSize(saidaText, fontSize);
          page.drawText(saidaText, {
            x: currentX + colWidths[6] - textWidth - 3,
            y: textY,
            size: fontSize,
            font: font,
            color: BLACK,
          });
        } else {
          page.drawText("-", {
            x: currentX + colWidths[6]/2,
            y: textY,
            size: fontSize,
            font: font,
            color: BLACK,
          });
        }
        
        // Linha horizontal abaixo do registro
        page.drawLine({
          start: { x: tableLeft, y: y - 5 },
          end: { x: tableRight, y: y - 5 },
          thickness: 1,
          color: BLACK,
        });
        
        y -= lineHeight + 1;
      });
      
      // Ajustar espaçamento vertical após o último lançamento
      y -= 5;

      // TOTAL
      // Linhas verticais para manter o formato da tabela
      let totalX = tableLeft;
      for (let i = 0; i < headers.length - 1; i++) {
        const xPos = totalX + colWidths[i];
        page.drawLine({
          start: { x: xPos, y: y + lineHeight },
          end: { x: xPos, y: y - 5 },
          thickness: 1,
          color: BLACK,
        });
        totalX += colWidths[i];
      }

      // Texto "TOTAL LANÇ.:" em negrito
      page.drawText("TOTAL LANÇ.:", {
        x: tableLeft + 3,
        y,
        size: fontSize,
        font: boldFont,
        color: BLACK,
      });

      // Valor total de entradas (alinhado à direita)
      const xEntrada = tableLeft + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3] + colWidths[4];
      const totalEntradasText = formatCurrency(totalEntradas);
      const totalEntradasWidth = boldFont.widthOfTextAtSize(totalEntradasText, fontSize);
      page.drawText(totalEntradasText, {
        x: xEntrada + colWidths[5] - totalEntradasWidth - 3,
        y,
        size: fontSize,
        font: boldFont,
        color: BLACK,
      });
      
      // Valor total de saídas (alinhado à direita) com formatação negativa
      const xSaida = xEntrada + colWidths[5];
      const totalSaidasText = `- ${formatCurrency(totalSaidas)}`;
      const totalSaidasWidth = boldFont.widthOfTextAtSize(totalSaidasText, fontSize);
      page.drawText(totalSaidasText, {
        x: xSaida + colWidths[6] - totalSaidasWidth - 3,
        y,
        size: fontSize,
        font: boldFont,
        color: BLACK,
      });
      
      // Linha abaixo do total
      page.drawLine({
        start: { x: tableLeft, y: y - 5 },
        end: { x: tableRight, y: y - 5 },
        thickness: 1,
        color: BLACK,
      });
      
      // SALDO ANTERIOR (se existir)
      if (saldoAnterior !== 0) {
        y -= lineHeight + 3;
        const textYSaldoAnt = y - 2;
        
        // Linhas verticais para manter o formato da tabela
        let saldoAntX = tableLeft;
        for (let i = 0; i < headers.length - 1; i++) {
          const xPos = saldoAntX + colWidths[i];
          page.drawLine({
            start: { x: xPos, y: y + lineHeight },
            end: { x: xPos, y: y - 5 },
            thickness: 1,
            color: BLACK,
          });
          saldoAntX += colWidths[i];
        }
        
        // Texto "SALDO ANT.:" em negrito
        page.drawText("SALDO ANT.:", {
          x: tableLeft + 3,
          y: textYSaldoAnt,
          size: fontSize,
          font: boldFont,
          color: BLACK,
        });
        
        // Valor do saldo anterior posicionado na coluna correta baseado no sinal
        if (saldoAnterior >= 0) {
          // Saldo positivo vai na coluna de Entrada
          const saldoAntText = formatCurrency(saldoAnterior);
          const saldoAntWidth = boldFont.widthOfTextAtSize(saldoAntText, fontSize);
          
          page.drawText(saldoAntText, {
            x: xEntrada + colWidths[5] - saldoAntWidth - 3, // Coluna de entrada
            y,
            size: fontSize,
            font: boldFont,
            color: BLACK,
          });
        } else {
          // Saldo negativo vai na coluna de Saída
          const saldoAntText = `- ${formatCurrency(Math.abs(saldoAnterior))}`;
          const saldoAntWidth = boldFont.widthOfTextAtSize(saldoAntText, fontSize);
          
          page.drawText(saldoAntText, {
            x: xEntrada + colWidths[5] + colWidths[6] - saldoAntWidth - 3, // Coluna de saída
            y,
            size: fontSize,
            font: boldFont,
            color: BLACK,
          });
        }
        
        // Linha abaixo do saldo anterior
        page.drawLine({
          start: { x: tableLeft, y: y - 5 },
          end: { x: tableRight, y: y - 5 },
          thickness: 1,
          color: BLACK,
        });
      }
      
      // TOTAL ADIANTAMENTOS (AGORA COMO VALOR POSITIVO)
      if (totalAdiantamentos > 0) {
        y -= lineHeight + 3;
        const textYAdiant = y - 2;
        
        // Linhas verticais para manter o formato da tabela
        let adiantX = tableLeft;
        for (let i = 0; i < headers.length - 1; i++) {
          const xPos = adiantX + colWidths[i];
          page.drawLine({
            start: { x: xPos, y: y + lineHeight },
            end: { x: xPos, y: y - 5 },
            thickness: 1,
            color: BLACK,
          });
          adiantX += colWidths[i];
        }
        
        // Texto "TOTAL ADIANT.:" em negrito
        page.drawText("TOTAL ADIA.:", {
          x: tableLeft + 3,
          y: textYAdiant,
          size: fontSize,
          font: boldFont,
          color: BLACK,
        });
        
        // Valor total de adiantamentos como POSITIVO na coluna de entrada
        const totalAdiantamentosText = formatCurrency(totalAdiantamentos);
        const totalAdiantamentosWidth = boldFont.widthOfTextAtSize(totalAdiantamentosText, fontSize);
        
        page.drawText(totalAdiantamentosText, {
          x: xEntrada + colWidths[5] - totalAdiantamentosWidth - 3, // Na coluna de entrada
          y: textYAdiant,
          size: fontSize,
          font: boldFont,
          color: BLACK,
        });
        
        // Linha abaixo do total de adiantamentos
        page.drawLine({
          start: { x: tableLeft, y: y - 5 },
          end: { x: tableRight, y: y - 5 },
          thickness: 1,
          color: BLACK,
        });
        
        y -= lineHeight + 3; // Atualizar Y após adiantamentos
      }
      
      // SALDO FINAL (agora considera adiantamentos como positivos)
      y -= lineHeight + 3; // Adicionar espaçamento antes do saldo final
      const textYSaldo = y - 2;
      const saldoFinal = saldoAnterior + totalEntradas + totalAdiantamentos - totalSaidas; // Adiantamentos agora somam

      // Texto "SALDO FINAL:" em negrito
      page.drawText("SALDO FINAL:", {
        x: tableLeft + 3,
        y: textYSaldo,
        size: fontSize,
        font: boldFont,
        color: BLACK,
      });
      
      // Valor do saldo final (alinhado à direita)
      const saldoText = saldoFinal >= 0 ? formatCurrency(saldoFinal) : `- ${formatCurrency(Math.abs(saldoFinal))}`;
      const saldoWidth = boldFont.widthOfTextAtSize(saldoText, fontSize);
      
      // Posicionar o saldo no final da tabela
      page.drawText(saldoText, {
        x: tableRight - saldoWidth - 3,
        y: textYSaldo,
        size: fontSize,
        font: boldFont,
        color: BLACK,
      });
      
      // Linha abaixo do saldo
      page.drawLine({
        start: { x: tableLeft, y: y - 5 },
        end: { x: tableRight, y: y - 5 },
        thickness: 1,
        color: BLACK,
      });
    } else if (adiantamentos.length > 0 || saldoAnterior !== 0) {
      // Se não há lançamentos, mas há adiantamentos ou saldo anterior, mostrar os totais
      const tableWidth = 720;
      const tableLeft = 60;
      const tableRight = tableLeft + tableWidth;
      const colWidths = [80, 90, 120, 100, 150, 90, 90];
      const xEntrada = tableLeft + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3] + colWidths[4];
      
      // SALDO ANTERIOR (se existir)
      if (saldoAnterior !== 0) {
        page.drawText("SALDO ANTERIOR:", {
          x: tableLeft + 3,
          y,
          size: fontSize,
          font: boldFont,
          color: BLACK,
        });
        
        // Valor do saldo anterior
        const saldoAntText = saldoAnterior >= 0 ? formatCurrency(saldoAnterior) : `- ${formatCurrency(Math.abs(saldoAnterior))}`;
        const saldoAntWidth = boldFont.widthOfTextAtSize(saldoAntText, fontSize);
        
        page.drawText(saldoAntText, {
          x: tableRight - saldoAntWidth - 3,
          y,
          size: fontSize,
          font: boldFont,
          color: BLACK,
        });
        
        // Linha abaixo do saldo anterior
        page.drawLine({
          start: { x: tableLeft, y: y - 5 },
          end: { x: tableRight, y: y - 5 },
          thickness: 1,
          color: BLACK,
        });
        
        y -= spacing + 2;
      }
      
      // TOTAL ADIANTAMENTOS (se existir)
      if (totalAdiantamentos > 0) {
        page.drawText("TOTAL ADIA.:", {
          x: tableLeft + 3,
          y,
          size: fontSize,
          font: boldFont,
          color: BLACK,
        });
        
        // Valor total de adiantamentos como POSITIVO
        const totalAdiantamentosText = formatCurrency(totalAdiantamentos);
        const totalAdiantamentosWidth = boldFont.widthOfTextAtSize(totalAdiantamentosText, fontSize);
        
        page.drawText(totalAdiantamentosText, {
          x: xEntrada + colWidths[5] - totalAdiantamentosWidth - 3,
          y,
          size: fontSize,
          font: boldFont,
          color: BLACK,
        });
        
        // Linha abaixo do total de adiantamentos
        page.drawLine({
          start: { x: tableLeft, y: y - 5 },
          end: { x: tableRight, y: y - 5 },
          thickness: 1,
          color: BLACK,
        });
        
        y -= spacing + 2;
      }
      
      // SALDO FINAL (com adiantamentos como positivos)
      const textYSaldo = y - 2;
      const saldoFinal = saldoAnterior + totalAdiantamentos; // Adiantamentos agora somam

      // Texto "SALDO FINAL:" em negrito
      page.drawText("SALDO FINAL:", {
        x: tableLeft + 3,
        y: textYSaldo,
        size: fontSize,
        font: boldFont,
        color: BLACK,
      });
      
      // Valor do saldo final
      const saldoText = saldoFinal >= 0 ? formatCurrency(saldoFinal) : `- ${formatCurrency(Math.abs(saldoFinal))}`;
      const saldoWidth = boldFont.widthOfTextAtSize(saldoText, fontSize);
      
      page.drawText(saldoText, {
        x: tableRight - saldoWidth - 3,
        y: textYSaldo,
        size: fontSize,
        font: boldFont,
        color: BLACK,
      });
      
      // Linha abaixo do saldo
      page.drawLine({
        start: { x: tableLeft, y: y - 5 },
        end: { x: tableRight, y: y - 5 },
        thickness: 1,
        color: BLACK,
      });
    }

    // Data e local para assinatura
    y -= spacing * 3;
    
    // Utilizar formatação mais elegante para a data
    const dataAssinatura = new Date();
    const dataFormatada = `${caixa.destino || 'Governador Valadares'}, ${dataAssinatura.getDate().toString().padStart(2, '0')} de ${
      ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'][dataAssinatura.getMonth()]
    } de ${dataAssinatura.getFullYear()}`;
    
    page.drawText(dataFormatada, {
      x: (width - font.widthOfTextAtSize(dataFormatada, fontSize)) / 2,
      y,
      size: fontSize,
      font: font,
      color: BLACK,
    });

    // Linha para assinatura
    y -= spacing * 3;
    
    const lineWidth = 250;
    const lineX = (width - lineWidth) / 2;
    page.drawLine({
      start: { x: lineX, y },
      end: { x: lineX + lineWidth, y },
      thickness: 1,
      color: BLACK,
    });
    
    y -= spacing * 0.5;
    
    // Texto "Responsável" abaixo da linha
    const responsavelText = "Responsável";
    const responsavelWidth = font.widthOfTextAtSize(responsavelText, fontSize);
    page.drawText(responsavelText, {
      x: (width - responsavelWidth) / 2,
      y,
      size: fontSize,
      font: font,
      color: BLACK,
    });

    // Gerar o PDF
    const pdfBytes = await pdfDoc.save();
    
    // Nome do funcionário para o nome do arquivo
    const funcionarioNomeArquivo = caixa.funcionario 
      ? `${caixa.funcionario.nome}_${caixa.funcionario.sobrenome || ''}`.trim().replace(/\s+/g, '_')
      : 'sem_funcionario';
    
    // Destino formatado para o nome do arquivo
    const destinoArquivo = caixa.destino ? caixa.destino.replace(/\s+/g, '_') : 'sem_destino';
    
    // Número da caixa para o nome do arquivo
    const numeroCaixa = caixa.numeroCaixa || caixa.id;
    
    // Nome do arquivo personalizado
    const nomeArquivo = `caixa_${numeroCaixa}_${funcionarioNomeArquivo}_${destinoArquivo}.pdf`;

    return new NextResponse(pdfBytes, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename=${nomeArquivo}`,
      },
    });
  } catch (error) {
    console.error("Erro ao gerar termo:", error);
    return NextResponse.json(
      { error: "Erro ao gerar o termo de caixa de viagem" },
      { status: 500 }
    );
  }
}

// Função para quebrar texto em múltiplas linhas baseado na largura máxima (considera palavras e textos contínuos)
function wrapTextByWidth(text: string, font: any, fontSize: number, maxWidth: number): string[] {
  const lines: string[] = [];
  let currentLine = '';

  for (let i = 0; i < text.length; i++) {
    const testLine = currentLine + text[i];
    const testWidth = font.widthOfTextAtSize(testLine, fontSize);

    if (testWidth > maxWidth && currentLine.length > 0) {
      lines.push(currentLine);
      currentLine = text[i];
    } else {
      currentLine = testLine;
    }
  }
  if (currentLine) lines.push(currentLine);
  return lines;
}