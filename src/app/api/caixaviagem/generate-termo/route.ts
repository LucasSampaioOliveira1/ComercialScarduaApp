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
        lancamentos: true
      },
    });

    if (!caixa) {
      return NextResponse.json({ error: "Caixa de viagem não encontrada" }, { status: 404 });
    }

    // Criar um novo documento PDF
    const pdfDoc = await PDFDocument.create();
    let page = pdfDoc.addPage([595, 842]); // Tamanho A4
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

    // Modificação da função formatDate para adicionar um dia a todas as datas

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
            // Criar uma data usando meio-dia para evitar problemas de fuso horário
            const [year, month, day] = dateString.split('-').map(Number);
            const date = new Date(year, month - 1, day, 12, 0, 0);
            // Adicionar um dia para corrigir o problema
            date.setDate(date.getDate() + 1);
            return `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}`;
          }
        }
        
        // Para objetos Date
        if (dateString instanceof Date) {
          const dateCopy = new Date(dateString);
          // Adicionar um dia para corrigir o problema
          dateCopy.setDate(dateCopy.getDate() + 1);
          return `${dateCopy.getDate().toString().padStart(2, '0')}/${(dateCopy.getMonth() + 1).toString().padStart(2, '0')}/${dateCopy.getFullYear()}`;
        }
        
        // Último recurso - tentar criar um objeto Date
        const date = new Date(dateString);
        if (!isNaN(date.getTime())) {
          // Adicionar um dia para corrigir o problema
          date.setDate(date.getDate() + 1);
          return `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}`;
        }
        
        return String(dateString);
      } catch (error) {
        console.error("Erro ao formatar data:", error, dateString);
        return String(dateString);
      }
    };

    // Formatação de moeda
    const formatCurrency = (value: any) => {
      if (!value) return "R$ 0,00";
      const numValue = parseFloat(String(value).replace(',', '.'));
      return isNaN(numValue) ? "R$ 0,00" : `R$ ${numValue.toFixed(2).replace('.', ',')}`;
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

    // Data atual
    const dataAtual = new Date();
    const dataAtualFormatada = `${dataAtual.getDate().toString().padStart(2, '0')}/${(dataAtual.getMonth() + 1).toString().padStart(2, '0')}/${dataAtual.getFullYear()}`;

    const infoLines = [
      `Empresa: ${empresaNome}`,
      `Data da Viagem: ${formatDate(caixa.data)}`,
      `Data de Emissão: ${dataAtualFormatada}`,
      `Destino: ${caixa.destino || "Não informado"}`,
      `Funcionário: ${funcionarioNome}`,
    ];

    if (caixa.veiculo) {
      infoLines.push(`Veículo: ${caixa.veiculo.modelo || ''} ${caixa.veiculo.placa ? `- ${caixa.veiculo.placa}` : ''}`);
    }

    if (caixa.observacao) {
      infoLines.push(`Observações: ${caixa.observacao}`);
    }

    infoLines.forEach(line => {
      page.drawText(line, {
        x: 80,
        y,
        size: fontSize,
        font: font,
        color: BLACK,
      });
      y -= spacing;
    });

    y -= spacing;

    // Verificar se precisamos de uma nova página para os lançamentos
    if (y < 350) {
      page = pdfDoc.addPage([595, 842]); // Tamanho A4
      y = height - 50;
    }

    // Seção de lançamentos
    const lancamentos = Array.isArray(caixa.lancamentos) ? caixa.lancamentos : [];
    
    if (lancamentos.length > 0) {
      page.drawText("DETALHAMENTO DOS LANÇAMENTOS:", {
        x: 60,
        y,
        size: fontSize,
        font: boldFont,
        color: BLACK,
      });

      y -= spacing;

      // Linha superior da tabela
      const tableWidth = 475;
      const tableLeft = 60;
      const tableRight = tableLeft + tableWidth;
      
      // Linha superior da tabela
      page.drawLine({
        start: { x: tableLeft, y: y + 5 },
        end: { x: tableRight, y: y + 5 },
        thickness: 1,
        color: BLACK,
      });

      // Cabeçalhos da tabela com "Custo" adicionado
      // Reduzindo os nomes dos cabeçalhos para evitar sobreposição
      const headers = ["Data", "Documento", "Cliente/Forn.", "Custo", "Histórico", "Entrada", "Saída"];

      // Reajustando larguras para melhor distribuição do espaço
      const colWidths = [60, 65, 80, 70, 80, 60, 60]; // Total = 475
      
      let currentX = tableLeft;
      headers.forEach((header, index) => {
        // Calcular posição centralizada para cada cabeçalho na sua coluna
        const headerWidth = boldFont.widthOfTextAtSize(header, fontSize);
        const centerX = currentX + (colWidths[index] - headerWidth) / 2;
        
        page.drawText(header, {
          x: centerX, // Centraliza o texto na coluna para evitar sobreposição
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
      
      lancamentos.forEach((lancamento, index) => {
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
          page = pdfDoc.addPage([595, 842]);
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
              x: centerX, // Centralização do texto
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
        const textY = y - 2; // Ajuste fino para posicionar melhor o texto
        
        // Data - com formatação corrigida
        const formattedDate = formatDate(lancamento.data);
        page.drawText(formattedDate, {
          x: currentX + 3,
          y: textY,
          size: fontSize,
          font: font,
          color: BLACK,
        });
        currentX += colWidths[0];
        
        // Vertical line
        page.drawLine({
          start: { x: currentX, y: y + lineHeight },
          end: { x: currentX, y: y - 5 },
          thickness: 1,
          color: BLACK,
        });
        
        // Documento - reduzir truncamento para evitar sobreposição
        const docText = lancamento.numeroDocumento || "-";
        const maxLengthDoc = 7;
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
        
        // Vertical line
        page.drawLine({
          start: { x: currentX, y: y + lineHeight },
          end: { x: currentX, y: y - 5 },
          thickness: 1,
          color: BLACK,
        });
        
        // Cliente/Fornecedor - diminuir tamanho máximo para evitar sobreposição
        const clienteFornecedor = lancamento.clienteFornecedor || "-";
        const maxLengthCF = 7; // Reduzir para evitar sobreposição
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
        
        // Vertical line
        page.drawLine({
          start: { x: currentX, y: y + lineHeight },
          end: { x: currentX, y: y - 5 },
          thickness: 1,
          color: BLACK,
        });
        
        // Custo - melhorar exibição
        const custoStr = typeof lancamento.custo === 'number' ? 
          formatCurrency(lancamento.custo) : 
          (lancamento.custo || "-");
        
        const maxLengthCusto = 8;
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
        
        // Vertical line
        page.drawLine({
          start: { x: currentX, y: y + lineHeight },
          end: { x: currentX, y: y - 5 },
          thickness: 1,
          color: BLACK,
        });
        
        // Histórico - diminuir tamanho para evitar sobreposição
        const historico = lancamento.historicoDoc || "-";
        const maxLengthHist = 9;
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
        
        // Vertical line
        page.drawLine({
          start: { x: currentX, y: y + lineHeight },
          end: { x: currentX, y: y - 5 },
          thickness: 1,
          color: BLACK,
        });
        
        // Entrada - alinhar à direita dentro da coluna para valores monetários
        const entrada = lancamento.entrada ? parseFloat(String(lancamento.entrada)) : 0;
        if (entrada > 0) {
          const entradaText = formatCurrency(entrada);
          const textWidth = font.widthOfTextAtSize(entradaText, fontSize);
          page.drawText(entradaText, {
            x: currentX + colWidths[5] - textWidth - 3, // Alinhamento à direita
            y: textY,
            size: fontSize,
            font: font,
            color: BLACK,
          });
        } else {
          page.drawText("-", {
            x: currentX + colWidths[5]/2, // Centralizar quando é só um hífen
            y: textY,
            size: fontSize,
            font: font,
            color: BLACK,
          });
        }
        currentX += colWidths[5];
        
        // Vertical line
        page.drawLine({
          start: { x: currentX, y: y + lineHeight },
          end: { x: currentX, y: y - 5 },
          thickness: 1,
          color: BLACK,
        });
        
        // Saída - também alinhar à direita na coluna
        const saida = lancamento.saida ? parseFloat(String(lancamento.saida)) : 0;
        if (saida > 0) {
          const saidaText = formatCurrency(saida);
          const textWidth = font.widthOfTextAtSize(saidaText, fontSize);
          page.drawText(saidaText, {
            x: currentX + colWidths[6] - textWidth - 3, // Alinhamento à direita
            y: textY,
            size: fontSize,
            font: font,
            color: BLACK,
          });
        } else {
          page.drawText("-", {
            x: currentX + colWidths[6]/2, // Centralizar quando é só um hífen
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
        
        // Aumentar levemente o espaçamento para evitar sobreposição
        y -= lineHeight + 1;
      });

      // Calcular totais
      let totalEntradas = 0;
      let totalSaidas = 0;

      lancamentos.forEach(lancamento => {
        const entrada = lancamento.entrada ? parseFloat(String(lancamento.entrada)) : 0;
        const saida = lancamento.saida ? parseFloat(String(lancamento.saida)) : 0;
        
        totalEntradas += entrada;
        totalSaidas += saida;
      });
      
      // Ajustar espaçamento vertical após o último lançamento
      y -= 5; // Pequeno espaço adicional para separar visualmente os lançamentos dos totais

      // TOTAL (vem primeiro)
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

      // Texto "TOTAL:" em negrito
      page.drawText("TOTAL:", {
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
        x: xEntrada + colWidths[5] - totalEntradasWidth - 3, // Alinhado à direita
        y,
        size: fontSize,
        font: boldFont,
        color: BLACK,
      });
      
      // Valor total de saídas (alinhado à direita)
      const xSaida = xEntrada + colWidths[5];
      const totalSaidasText = formatCurrency(totalSaidas);
      const totalSaidasWidth = boldFont.widthOfTextAtSize(totalSaidasText, fontSize);
      page.drawText(totalSaidasText, {
        x: xSaida + colWidths[6] - totalSaidasWidth - 3, // Alinhado à direita
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
      
      // SALDO (vem depois do total)
      y -= lineHeight + 3; // Aumentar espaçamento entre total e saldo
      const textYSaldo = y - 2; // Mesmo ajuste fino

      // Texto "SALDO:" em negrito
      page.drawText("SALDO:", {
        x: tableLeft + 3,
        y: textYSaldo,
        size: fontSize,
        font: boldFont,
        color: BLACK,
      });
      
      // Saldo final (alinhado à direita)
      const saldo = totalEntradas - totalSaidas;
      const saldoText = formatCurrency(saldo);
      const saldoWidth = boldFont.widthOfTextAtSize(saldoText, fontSize);
      page.drawText(saldoText, {
        x: xSaida + colWidths[6] - saldoWidth - 3, // Alinhado à direita
        y: textYSaldo,
        size: fontSize,
        font: boldFont,
        color: BLACK,
      });
      
      // Linha abaixo do saldo - Esta é a linha final da tabela
      page.drawLine({
        start: { x: tableLeft, y: y - 5 },
        end: { x: tableRight, y: y - 5 },
        thickness: 1,
        color: BLACK,
      });
    }

    // Data atual formatada
    y -= spacing * 3;
    
    // Utilizar o mesmo formatador para garantir consistência
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

    // Linha para assinatura do responsável
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