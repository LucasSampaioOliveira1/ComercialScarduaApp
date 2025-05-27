import { NextRequest, NextResponse } from "next/server";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const { contaId } = await req.json();

    // Buscar a conta corrente com todos os detalhes necessários
    const conta = await prisma.contaCorrente.findUnique({
      where: { id: Number(contaId) },
      include: {
        empresa: true,
        colaborador: true,
        user: true,
        lancamentos: true
      },
    });

    if (!conta) {
      return NextResponse.json({ error: "Conta corrente não encontrada" }, { status: 404 });
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
    const title = "CONTA CORRENTE";
    const titleWidth = boldFont.widthOfTextAtSize(title, titleSize);
    page.drawText(title, {
      x: (width - titleWidth) / 2,
      y,
      size: titleSize,
      font: boldFont,
      color: BLACK,
    });

    y -= spacing * 2;

    // Número da conta
    const contaNumero = `ID: ${conta.id}`;
    const contaNumeroWidth = font.widthOfTextAtSize(contaNumero, fontSize);
    page.drawText(contaNumero, {
      x: (width - contaNumeroWidth) / 2,
      y,
      size: fontSize,
      font: font,
      color: BLACK,
    });

    y -= spacing * 2;

    // Formatação de data
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

    // Formatação de moeda
    const formatCurrency = (value: any) => {
      if (!value) return "R$ 0,00";
      const numValue = parseFloat(String(value).replace(',', '.'));
      return isNaN(numValue) ? "R$ 0,00" : `R$ ${numValue.toFixed(2).replace('.', ',')}`;
    };

    // Seção de informações da conta
    page.drawText("INFORMAÇÕES DA CONTA:", {
      x: 60,
      y,
      size: fontSize,
      font: boldFont,
      color: BLACK,
    });

    y -= spacing;

    // Obter valores para exibir
    const colaboradorNome = conta.colaborador 
      ? `${conta.colaborador.nome} ${conta.colaborador.sobrenome || ''}`.trim()
      : 'Colaborador não especificado';
    
    const empresaNome = conta.empresa?.nomeEmpresa || 'Empresa não especificada';

    // Data atual formatada para exibição
    const dataAtual = new Date();
    const dataAtualFormatada = `${dataAtual.getDate().toString().padStart(2, '0')}/${(dataAtual.getMonth() + 1).toString().padStart(2, '0')}/${dataAtual.getFullYear()}`;

    const infoLines = [
      `Empresa: ${empresaNome}`,
      `Data da Conta: ${formatDate(conta.data)}`,
      `Data de Emissão: ${dataAtualFormatada}`,
      `Fornecedor/Cliente: ${conta.fornecedorCliente || "Não informado"}`,
      `Colaborador: ${colaboradorNome}`,
      `Tipo: ${conta.tipo === 'EXTRA_CAIXA' ? 'Extra Caixa' : conta.tipo === 'PERMUTA' ? 'Permuta' : conta.tipo === 'DEVOLUCAO' ? 'Devolução' : conta.tipo || "Não informado"}`,
      `Setor: ${conta.setor || "Não informado"}`,
    ];

    if (conta.observacao) {
      infoLines.push(`Observações: ${conta.observacao}`);
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
    const lancamentos = Array.isArray(conta.lancamentos) ? conta.lancamentos : [];
    
    if (lancamentos.length > 0) {
      page.drawText("DETALHAMENTO DOS LANÇAMENTOS:", {
        x: 60,
        y,
        size: fontSize,
        font: boldFont,
        color: BLACK,
      });

      y -= spacing;

      // Definir dimensões da tabela
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

      // Cabeçalhos da tabela
      const headers = ["Data", "Documento", "Observação", "Crédito", "Débito"];
      const colWidths = [80, 80, 155, 80, 80]; // Total = 475
      
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
      let totalCreditos = 0;
      let totalDebitos = 0;
      
      lancamentos.forEach((lancamento, index) => {
        const credito = lancamento.credito ? parseFloat(String(lancamento.credito)) : 0;
        const debito = lancamento.debito ? parseFloat(String(lancamento.debito)) : 0;
        
        totalCreditos += credito;
        totalDebitos += debito;
        
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
        const maxLengthDoc = 10;
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
        
        // Observação
        const observacao = lancamento.observacao || "-";
        const maxLengthObs = 20;
        const obsText = observacao.length > maxLengthObs ? 
          observacao.substring(0, maxLengthObs) + ".." : observacao;
          
        page.drawText(obsText, {
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
        
        // Crédito (alinhado à direita dentro da coluna)
        if (credito > 0) {
          const creditoText = formatCurrency(credito);
          const textWidth = font.widthOfTextAtSize(creditoText, fontSize);
          page.drawText(creditoText, {
            x: currentX + colWidths[3] - textWidth - 3,
            y: textY,
            size: fontSize,
            font: font,
            color: BLACK,
          });
        } else {
          page.drawText("-", {
            x: currentX + colWidths[3]/2,
            y: textY,
            size: fontSize,
            font: font,
            color: BLACK,
          });
        }
        currentX += colWidths[3];
        
        // Linha vertical
        page.drawLine({
          start: { x: currentX, y: y + lineHeight },
          end: { x: currentX, y: y - 5 },
          thickness: 1,
          color: BLACK,
        });
        
        // Débito (alinhado à direita dentro da coluna)
        if (debito > 0) {
          const debitoText = formatCurrency(debito);
          const textWidth = font.widthOfTextAtSize(debitoText, fontSize);
          page.drawText(debitoText, {
            x: currentX + colWidths[4] - textWidth - 3,
            y: textY,
            size: fontSize,
            font: font,
            color: BLACK,
          });
        } else {
          page.drawText("-", {
            x: currentX + colWidths[4]/2,
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

      // Texto "TOTAL:" em negrito
      page.drawText("TOTAL:", {
        x: tableLeft + 3,
        y,
        size: fontSize,
        font: boldFont,
        color: BLACK,
      });

      // Valor total de créditos (alinhado à direita)
      const xCredito = tableLeft + colWidths[0] + colWidths[1] + colWidths[2];
      const totalCreditosText = formatCurrency(totalCreditos);
      const totalCreditosWidth = boldFont.widthOfTextAtSize(totalCreditosText, fontSize);
      page.drawText(totalCreditosText, {
        x: xCredito + colWidths[3] - totalCreditosWidth - 3,
        y,
        size: fontSize,
        font: boldFont,
        color: BLACK,
      });
      
      // Valor total de débitos (alinhado à direita)
      const xDebito = xCredito + colWidths[3];
      const totalDebitosText = formatCurrency(totalDebitos);
      const totalDebitosWidth = boldFont.widthOfTextAtSize(totalDebitosText, fontSize);
      page.drawText(totalDebitosText, {
        x: xDebito + colWidths[4] - totalDebitosWidth - 3,
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
      
      // SALDO
      y -= lineHeight + 3;
      const textYSaldo = y - 2;

      // Texto "SALDO:" em negrito
      page.drawText("SALDO:", {
        x: tableLeft + 3,
        y: textYSaldo,
        size: fontSize,
        font: boldFont,
        color: BLACK,
      });
      
      // Saldo final (alinhado à direita)
      const saldo = totalCreditos - totalDebitos;
      const saldoText = formatCurrency(saldo);
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
    }

    // Data e local para assinatura
    y -= spacing * 3;
    
    // Utilizar formatação mais elegante para a data
    const dataAssinatura = new Date();
    const dataFormatada = `Serra, ${dataAssinatura.getDate().toString().padStart(2, '0')} de ${
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
    
    // Texto "Assinatura do Responsável" abaixo da linha
    const assinatura = "Assinatura do Responsável";
    const assinaturaWidth = font.widthOfTextAtSize(assinatura, fontSize);
    page.drawText(assinatura, {
      x: (width - assinaturaWidth) / 2,
      y,
      size: fontSize,
      font: font,
      color: BLACK,
    });

    // Gerar o PDF
    const pdfBytes = await pdfDoc.save();
    
    // Nome para o arquivo baseado nos dados da conta
    const fornecedorCliente = conta.fornecedorCliente 
      ? conta.fornecedorCliente.replace(/\s+/g, '_')
      : `conta_${conta.id}`;
      
    // Nome do colaborador para o arquivo
    const colaboradorNomeArquivo = conta.colaborador 
      ? `${conta.colaborador.nome}_${conta.colaborador.sobrenome || ''}`.trim().replace(/\s+/g, '_')
      : 'sem_colaborador';
    
    // Nome do arquivo personalizado
    const nomeArquivo = `termo_conta_${conta.id}_${fornecedorCliente}_${colaboradorNomeArquivo}.pdf`;

    return new NextResponse(pdfBytes, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename=${nomeArquivo}`,
      },
    });
  } catch (error) {
    console.error("Erro ao gerar termo:", error);
    return NextResponse.json(
      { error: "Erro ao gerar o termo de conta corrente" },
      { status: 500 }
    );
  }
}