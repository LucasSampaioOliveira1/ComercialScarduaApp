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
    let page = pdfDoc.addPage();
    const { height, width } = page.getSize();

    // Adicionar fonte
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    const fontSize = 12;
    const titleSize = 16;
    const spacing = 24;
    let y = height - 50;

    // Título centralizado
    const title = "";
    const titleWidth = boldFont.widthOfTextAtSize(title, titleSize);
    page.drawText(title, {
      x: (width - titleWidth) / 2,
      y,
      size: titleSize,
      font: boldFont,
      color: rgb(0, 0, 0),
    });

    y -= spacing;
    
    const subtitle = "CONTA CORRENTE";
    const subtitleWidth = boldFont.widthOfTextAtSize(subtitle, titleSize);
    page.drawText(subtitle, {
      x: (width - subtitleWidth) / 2,
      y,
      size: titleSize,
      font: boldFont,
      color: rgb(0, 0, 0),
    });

    y -= spacing * 2;

    // Data de geração
    const dataAtual = new Date().toLocaleDateString('pt-BR');
    page.drawText(``, {
      x: width - 200,
      y,
      size: 10,
      font: font,
      color: rgb(0, 0, 0),
    });

    y -= spacing;

    // Informações da conta
    page.drawText("INFORMAÇÕES DA CONTA:", {
      x: 50,
      y,
      size: fontSize,
      font: boldFont,
      color: rgb(0, 0, 0),
    });

    y -= spacing;

    // Formatação de data
    const formatDate = (dateString?: string | Date | null) => {
      if (!dateString) return "";
      try {
        // Para strings de data com formato ISO
        if (typeof dateString === 'string') {
          // Para strings ISO com timezone (formato com "T")
          if (dateString.includes('T')) {
            // Criar uma data e adicionar um dia
            const date = new Date(dateString);
            date.setDate(date.getDate() + 1);
            return `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}`;
          }
          
          // Para strings simples YYYY-MM-DD
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

    // Obter dados formatados da empresa
    const empresaNome = conta.empresa?.nomeEmpresa || "Não informado";
    
    // Obter dados formatados do colaborador
    const colaboradorNome = conta.colaborador 
      ? `${conta.colaborador.nome} ${conta.colaborador.sobrenome || ''}`
      : "Não informado";

    // Detalhes da conta
    const infoLines = [
      `ID: ${conta.id}`,
      `Fornecedor/Cliente: ${conta.fornecedorCliente || "Não informado"}`,
      `Empresa: ${empresaNome}`,
      `Tipo: ${conta.tipo || "Não informado"}`,
      `Setor: ${conta.setor || "Não informado"}`,
      `Data: ${formatDate(conta.data)}`,
      `Colaborador: ${colaboradorNome}`,
      `Observação: ${conta.observacao || "Não informada"}`,
    ];

    infoLines.forEach(line => {
      page.drawText(line, {
        x: 70,
        y,
        size: fontSize,
        font: font,
        color: rgb(0, 0, 0),
      });
      y -= spacing;
    });

    y -= spacing;

    // Tabela de lançamentos
    page.drawText("LANÇAMENTOS:", {
      x: 50,
      y,
      size: fontSize,
      font: boldFont,
      color: rgb(0, 0, 0),
    });

    y -= spacing;

    // Cabeçalhos da tabela
    const headers = ["Data", "Documento", "Observação", "Crédito (R$)", "Débito (R$)"];
    const colWidths = [80, 100, 180, 80, 80];
    const startX = 50;

    let currentX = startX;
    headers.forEach((header, index) => {
      page.drawText(header, {
        x: currentX,
        y,
        size: fontSize,
        font: boldFont,
        color: rgb(0, 0, 0),
      });
      currentX += colWidths[index];
    });

    y -= spacing;

    // Desenhar linhas da tabela
    const formatCurrency = (value: any) => {
      if (!value) return "";
      const numValue = parseFloat(String(value).replace(',', '.'));
      return isNaN(numValue) ? "0,00" : numValue.toFixed(2).replace('.', ',');
    };

    // Calcular totais
    const lancamentos = Array.isArray(conta.lancamentos) ? conta.lancamentos : [];
    let totalCreditos = 0;
    let totalDebitos = 0;

    lancamentos.forEach(lancamento => {
      const credito = lancamento.credito ? parseFloat(String(lancamento.credito)) : 0;
      const debito = lancamento.debito ? parseFloat(String(lancamento.debito)) : 0;
      
      totalCreditos += credito;
      totalDebitos += debito;

      // Verificar se precisa de nova página
      if (y < 100) {
        page.drawText("Continua na próxima página...", {
          x: width / 2 - 80,
          y: 40,
          size: 10,
          font: font,
          color: rgb(0, 0, 0),
        });
        
        // Adicionar nova página
        const newPage = pdfDoc.addPage();
        page = newPage;
        y = height - 50;
        
        page.drawText("LANÇAMENTOS (continuação):", {
          x: 50,
          y,
          size: fontSize,
          font: boldFont,
          color: rgb(0, 0, 0),
        });
        
        y -= spacing;
        
        // Redesenhar cabeçalhos
        currentX = startX;
        headers.forEach((header, index) => {
          page.drawText(header, {
            x: currentX,
            y,
            size: fontSize,
            font: boldFont,
            color: rgb(0, 0, 0),
          });
          currentX += colWidths[index];
        });
        
        y -= spacing;
      }

      // Dados do lançamento
      currentX = startX;
      
      // Data
      page.drawText(formatDate(lancamento.data), {
        x: currentX,
        y,
        size: 10,
        font: font,
        color: rgb(0, 0, 0),
      });
      currentX += colWidths[0];
      
      // Documento
      page.drawText(lancamento.numeroDocumento || "-", {
        x: currentX,
        y,
        size: 10,
        font: font,
        color: rgb(0, 0, 0),
      });
      currentX += colWidths[1];
      
      // Observação (limitada para não ultrapassar a coluna)
      const observacao = lancamento.observacao || "-";
      const maxObsLength = 25; // Caracteres máximos
      const obsText = observacao.length > maxObsLength ? 
        observacao.substring(0, maxObsLength) + "..." : observacao;
        
      page.drawText(obsText, {
        x: currentX,
        y,
        size: 10,
        font: font,
        color: rgb(0, 0, 0),
      });
      currentX += colWidths[2];
      
      // Crédito
      if (credito > 0) {
        page.drawText(formatCurrency(credito), {
          x: currentX + 40, // Alinhado à direita
          y,
          size: 10,
          font: font,
          color: rgb(0, 0, 0),
        });
      } else {
        page.drawText("-", {
          x: currentX + 40,
          y,
          size: 10,
          font: font,
          color: rgb(0, 0, 0),
        });
      }
      currentX += colWidths[3];
      
      // Débito
      if (debito > 0) {
        page.drawText(formatCurrency(debito), {
          x: currentX + 40, // Alinhado à direita
          y,
          size: 10,
          font: font,
          color: rgb(0, 0, 0),
        });
      } else {
        page.drawText("-", {
          x: currentX + 40,
          y,
          size: 10,
          font: font,
          color: rgb(0, 0, 0),
        });
      }
      
      y -= spacing * 0.8; // Espaçamento um pouco menor entre linhas da tabela
    });

    // Linha de totais
    y -= spacing * 0.5;
    page.drawText("TOTAL:", {
      x: startX,
      y,
      size: fontSize,
      font: boldFont,
      color: rgb(0, 0, 0),
    });
    
    // Valor total de créditos
    page.drawText(formatCurrency(totalCreditos), {
      x: startX + colWidths[0] + colWidths[1] + colWidths[2] + 40,
      y,
      size: fontSize,
      font: boldFont,
      color: rgb(0, 0, 0),
    });
    
    // Valor total de débitos
    page.drawText(formatCurrency(totalDebitos), {
      x: startX + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3] + 40,
      y,
      size: fontSize,
      font: boldFont,
      color: rgb(0, 0, 0),
    });
    
    // Saldo 
    y -= spacing;
    page.drawText("SALDO:", {
      x: startX,
      y,
      size: fontSize,
      font: boldFont,
      color: rgb(0, 0, 0),
    });
    
    const saldo = totalCreditos - totalDebitos;
    page.drawText(formatCurrency(saldo), {
      x: startX + colWidths[0] + colWidths[1],
      y,
      size: fontSize,
      font: boldFont,
      color: rgb(0, 0, 0),
    });
    
    y -= spacing * 3;
    
    // Data e local
    page.drawText(`Serra-ES, ${dataAtual}`, {
      x: 50,
      y,
      size: fontSize,
      font: font,
      color: rgb(0, 0, 0),
    });
    
    y -= spacing * 3;
    
    // Linha de assinatura
    const lineWidth = 250;
    const lineX = (width - lineWidth) / 2;
    page.drawLine({
      start: { x: lineX, y },
      end: { x: lineX + lineWidth, y },
      thickness: 1,
      color: rgb(0, 0, 0),
    });
    
    y -= spacing * 0.5;
    
    // Nome do responsável abaixo da linha
    const assinatura = "Assinatura do Responsável";
    const assinaturaWidth = font.widthOfTextAtSize(assinatura, fontSize);
    page.drawText(assinatura, {
      x: (width - assinaturaWidth) / 2,
      y,
      size: fontSize,
      font: font,
      color: rgb(0, 0, 0),
    });

    // Gerar o PDF
    const pdfBytes = await pdfDoc.save();

    return new NextResponse(pdfBytes, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename=termo_conta_corrente_${contaId}.pdf`,
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