import { NextRequest, NextResponse } from "next/server";
import { PDFDocument, StandardFonts, rgb, PDFPage, PDFFont } from "pdf-lib";
import { prisma } from "@/lib/prisma";

const generateVehicleDocument = async (page: PDFPage, patrimonio: any, font: PDFFont, boldFont: PDFFont, pdfDoc: PDFDocument) => {
  const { width, height } = page.getSize();
  const fontSize = 12;
  const spacing = 20;
  let y = height - 50;
  let currentPage = page;

  // Função auxiliar para criar nova página
  const createNewPage = () => {
    currentPage = pdfDoc.addPage();
    y = height - 50;
    return currentPage;
  };

  // Função auxiliar para verificar espaço e criar nova página se necessário
  const checkSpace = (neededSpace: number) => {
    if (y - neededSpace < 50) {
      currentPage = createNewPage();
    }
  };

  // Título centralizado
  const titulo = "TERMO DE RESPONSABILIDADE";
  const tituloWidth = boldFont.widthOfTextAtSize(titulo, 16);
  currentPage.drawText(titulo, {
    x: (width - tituloWidth) / 2,
    y,
    size: 16,
    font: boldFont,
    color: rgb(0, 0, 0),
  });

  y -= spacing * 2;

  // Texto principal
  const texto = `Eu ${patrimonio.responsavel.nome} ${patrimonio.responsavel.sobrenome}, inscrito no CPF sob o n° ${patrimonio.responsavel.cpf}, para os devidos fins que estou recebendo o veículo, abaixo identificado, veiculo de propriedade da empresa COMERCIAL SCARDUA LTDA, com sede à Rod. Rod. Gov. Mário Covas, 4251 - Planalto de Carapina, Serra - ES, 29162-703, inscrita no CNPJ sob o n° 28.482.230/0011-25, com as seguintes características:`;

  // Quebrar o texto em linhas
  const words = texto.split(' ');
  let line = '';
  for (const word of words) {
    const testLine = line + word + ' ';
    const testWidth = font.widthOfTextAtSize(testLine, fontSize);

    if (testWidth > width - 100) {
      currentPage.drawText(line, {
        x: 50,
        y,
        size: fontSize,
        font: font,
        color: rgb(0, 0, 0),
      });
      line = word + ' ';
      y -= spacing;

      // Verificar se precisa de nova página após cada linha
      checkSpace(spacing);
    } else {
      line = testLine;
    }
  }
  currentPage.drawText(line, {
    x: 50,
    y,
    size: fontSize,
    font: font,
    color: rgb(0, 0, 0),
  });

  y -= spacing * 2;

  // Características do Veículo
  currentPage.drawText("Características do Veículo", {
    x: 50,
    y,
    size: fontSize,
    font: boldFont,
    color: rgb(0, 0, 0),
  });

  y -= spacing;

  // Primeira linha de detalhes
  currentPage.drawText(`Marca: ${patrimonio.fabricante || '_________'}`, {
    x: 50,
    y,
    size: fontSize,
    font: font,
    color: rgb(0, 0, 0),
  });

  currentPage.drawText(`Modelo: ${patrimonio.modelo || '_________'}`, {
    x: 250,
    y,
    size: fontSize,
    font: font,
    color: rgb(0, 0, 0),
  });

  y -= spacing;

  // Segunda linha de detalhes
  currentPage.drawText(`Chassi: ${patrimonio.numeroSerie || '_________'}`, {
    x: 50,
    y,
    size: fontSize,
    font: font,
    color: rgb(0, 0, 0),
  });

  currentPage.drawText(`Ano/Modelo: ${patrimonio.anoModelo || '_________'}`, {
    x: 250,
    y,
    size: fontSize,
    font: font,
    color: rgb(0, 0, 0),
  });

  y -= spacing;

  // Terceira linha de detalhes
  currentPage.drawText(`Combustível: Gasolina/Álcool`, {
    x: 50,
    y,
    size: fontSize,
    font: font,
    color: rgb(0, 0, 0),
  });

  currentPage.drawText(`Placa: ${patrimonio.placa || '_________'}`, {
    x: 250,
    y,
    size: fontSize,
    font: font,
    color: rgb(0, 0, 0),
  });

  currentPage.drawText(`KM de Entrega: ${patrimonio.kmEntrega || '_________'}`, {
    x: 400,
    y,
    size: fontSize,
    font: font,
    color: rgb(0, 0, 0),
  });

  y -= spacing * 2;

  // Características do Contrato
  currentPage.drawText("CARACTERÍSTICAS DO CONTRATO DE LOCAÇÃO", {
    x: 50,
    y,
    size: fontSize,
    font: boldFont,
    color: rgb(0, 0, 0),
  });

  y -= spacing;

  const caracteristicasContrato = [
    `Franquia de KM Mensal: ${patrimonio.franquia || '3.500km'}`
  ];

  caracteristicasContrato.forEach(texto => {
    currentPage.drawText(texto, {
      x: 50,
      y,
      size: fontSize,
      font: font,
      color: rgb(0, 0, 0),
    });
    y -= spacing;

    // Verificar espaço para cada característica
    checkSpace(spacing);
  });

  y -= spacing;

  // Declarações
  currentPage.drawText("Declaro ainda que:", {
    x: 50,
    y,
    size: fontSize,
    font: boldFont,
    color: rgb(0, 0, 0),
  });

  y -= spacing;

  const declaracoes = [
    "1) Estou ciente da minha responsabilidade quanto ao veículo ora a mim entregue, no que tange à questão civil, criminal e especialmente quanto às multas de trânsito que eventualmente estiverem gravadas na placa do veículo até a posterior devolução do veículo junto à empresa, multas essas que me comprometo a pagá-las e assumir os pontos em minha carteira nacional de habilitação;",
    "2) Que assumo inteira responsabilidade pelos prejuízos, quaisquer que sejam as suas causas, que o referido veículo possa eventualmente sofrer ou provocar a terceiros; civil e criminalmente;",
    "3) Responsabilizo-me em executar todas as manutenções preventivas / revisões do veículo em seus devidos períodos, conforme disposto no manual de manutenção do veiculo, a manutenção deverá ser previamente comunicada ao responsável pela manutenção e autorizado pelo mesmo, à falta da verificação das mesmas e problemas mecânicos ou os prejuízos ocasionado pela falta de revisão ou manutenções tardias, serão assumidos em sua totalidade pelo responsável do veiculo.",
    "4) A Comercial Scardua Ltda. fará inspeção semestral do veiculo, onde toda a avaria, troca de peças e desgaste por mau uso ou imprudência, será de responsabilidade do Condutor, e serão cobrados imediatamente.",
    "5) Pneus só serão trocados pela Comercial Scardua, um jogo de Pneus no mínimo a cada 25.000 KM, cabe ao condutor o correto rodizio dos pneus dentro do prazo estipulado pelo fabricante, para a boa sobrevida dos pneus, trocas antecipadas com menos de 25.000 KM de uso serão de responsabilidade do condutor, mesmo com 25.000 km rodados serão analisados se será necessário a troca.",
    "6) Apesar de o veículo estar segurado, a franquia é devido à Seguradora independente de culpabilidade, em caso de acidente e ficando comprovado a imprudência ou culpabilidade do terceiro ou do condutor a Franquia será paga à Seguradora, o condutor será responsável pelos custos que tiverem que não forem pagos pela seguradora até o valor da franquia.",
    "   - Em caso de comprovado a culpabilidade do terceiro deve-se negociar com o terceiro para que este assuma a culpa ou acione seu próprio seguro.",
    "   - Tudo devidamente registrado através de boletins de ocorrência.",
    "7) Tanto na entrega a mim como na devolução do veículo a empresa, o mesmo será vistoriado por um profissional competente da Comercial Scardua, todas às avarias decorrentes de mau uso serão de minha inteira responsabilidade.",
    "8) Tenho ciência que os carros da empresa são rastreados, e a sua aplicação é única e exclusivamente para o desenvolvimento do meu trabalho, onde o uso particular não são permitidos.",
    "9) O condutor deverá manter o veiculo sempre limpo e devidamente adesivado.",
    "10) Em caso e necessidade de acionamento de seguro, o mesmo deverá ser feito sempre com a comunicação e ciência da Gerencia ou setor responsável.",
    "11) O presente Termo tem o seu término após a entrega do veiculo a Comercial Scardua Ltda e emissão da vistoria do veiculo.",
    "12) Documento, manual e antena do carro entregue junto com o veiculo.",
    "13) Chave reserva está na filial de Carapina."
  ];

  declaracoes.forEach(declaracao => {
    const estimatedLines = Math.ceil(declaracao.length / 80);
    const estimatedSpace = estimatedLines * spacing;

    checkSpace(estimatedSpace);

    const words = declaracao.split(' ');
    let line = '';
    for (const word of words) {
      const testLine = line + word + ' ';
      const testWidth = font.widthOfTextAtSize(testLine, fontSize);

      if (testWidth > width - 100) {
        currentPage.drawText(line, {
          x: 50,
          y,
          size: fontSize,
          font: font,
          color: rgb(0, 0, 0),
        });
        line = word + ' ';
        y -= spacing;

        checkSpace(spacing);
      } else {
        line = testLine;
      }
    }

    if (line.trim()) {
      currentPage.drawText(line, {
        x: 50,
        y,
        size: fontSize,
        font: font,
        color: rgb(0, 0, 0),
      });
      y -= spacing;
    }

    y -= spacing;
  });

  checkSpace(spacing * 15);

  // Data
  y -= spacing;
  const dataAtual = new Date().toLocaleDateString('pt-BR');
  currentPage.drawText(`Serra / ES, ${dataAtual}`, {
    x: 50,
    y,
    size: fontSize,
    font: font,
    color: rgb(0, 0, 0),
  });

  return { y, currentPage };
};

// Atualização da função generateSignatureSection para evitar duplicidade
const generateSignatureSection = (page: PDFPage, y: number, patrimonio: any, font: PDFFont, boldFont: PDFFont) => {
  const { width } = page.getSize();
  const fontSize = 12;
  const spacing = 20;

  // Remover esta parte que adiciona a empresa duplicada
  /* 
  // Empresa centralizada
  y -= spacing * 3;
  const empresaNome = "COMERCIAL SCARDUA LTDA";
  const empresaWidth = boldFont.widthOfTextAtSize(empresaNome, fontSize);
  page.drawText(empresaNome, {
    x: (width - empresaWidth) / 2,
    y,
    size: fontSize,
    font: boldFont,
    color: rgb(0, 0, 0),
  });
  */

  // Linhas de assinatura
  y -= spacing * 4;

  // Responsável e Gerente
  page.drawLine({
    start: { x: 50, y },
    end: { x: 250, y },
    thickness: 1,
    color: rgb(0, 0, 0),
  });

  page.drawLine({
    start: { x: 300, y },
    end: { x: 500, y },
    thickness: 1,
    color: rgb(0, 0, 0),
  });

  y -= spacing;

  // Nomes centralizados
  const nomeResponsavel = `${patrimonio.responsavel.nome} ${patrimonio.responsavel.sobrenome}`;
  const nomeResponsavelWidth = font.widthOfTextAtSize(nomeResponsavel, fontSize);
  page.drawText(nomeResponsavel, {
    x: 50 + (200 - nomeResponsavelWidth) / 2,
    y,
    size: fontSize,
    font: font,
    color: rgb(0, 0, 0),
  });

  const gerenteText = "Gerente";
  const gerenteWidth = font.widthOfTextAtSize(gerenteText, fontSize);
  page.drawText(gerenteText, {
    x: 300 + (200 - gerenteWidth) / 2,
    y,
    size: fontSize,
    font: font,
    color: rgb(0, 0, 0),
  });

  // Testemunhas
  y -= spacing * 4;

  page.drawLine({
    start: { x: 50, y },
    end: { x: 250, y },
    thickness: 1,
    color: rgb(0, 0, 0),
  });

  page.drawLine({
    start: { x: 300, y },
    end: { x: 500, y },
    thickness: 1,
    color: rgb(0, 0, 0),
  });

  y -= spacing;

  const test1Text = "Testemunha 1:";
  const test1Width = font.widthOfTextAtSize(test1Text, fontSize);
  page.drawText(test1Text, {
    x: 50 + (200 - test1Width) / 2,
    y,
    size: fontSize,
    font: font,
    color: rgb(0, 0, 0),
  });

  const test2Text = "Testemunha 2:";
  const test2Width = font.widthOfTextAtSize(test2Text, fontSize);
  page.drawText(test2Text, {
    x: 300 + (200 - test2Width) / 2,
    y,
    size: fontSize,
    font: font,
    color: rgb(0, 0, 0),
  });
};

export async function POST(req: NextRequest) {
  try {
    const { patrimonioId } = await req.json();

    const patrimonio = await prisma.patrimonio.findUnique({
      where: { id: Number(patrimonioId) },
      include: {
        responsavel: true,
      },
    });

    if (!patrimonio) {
      return NextResponse.json({ error: "Patrimônio não encontrado" }, { status: 404 });
    }

    // Criar um novo documento PDF
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage();
    const { height, width } = page.getSize();

    // Adicionar fonte
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    if (patrimonio.tipo === 'Veículo') {
      const { y, currentPage } = await generateVehicleDocument(page, patrimonio, font, boldFont, pdfDoc);
      generateSignatureSection(currentPage, y, patrimonio, font, boldFont);
    } else {
      const fontSize = 12;
      const spacing = 24;
      let y = height - 50; // Posição inicial do texto

      // Título centralizado
      const titulo = "TERMO DE RESPONSABILIDADE";
      const tituloWidth = boldFont.widthOfTextAtSize(titulo, 16);
      page.drawText(titulo, {
        x: (width - tituloWidth) / 2, // Centralizar o título
        y: y,
        size: 16,
        font: boldFont,
        color: rgb(0, 0, 0),
      });

      y -= spacing * 2;

      // Texto principal atualizado
      const texto = `Eu, ${patrimonio.responsavel.nome} ${patrimonio.responsavel.sobrenome}, colaborador da COMERCIAL SCARDUA LTDA, inscrito no CPF sob o n° ${patrimonio.responsavel.cpf}, DECLARO que estou recebendo um aparelho notebook, bem como os seus acessórios, em perfeito estado, abaixo discriminado, de posse e propriedade da COMERCIAL SCARDUA LTDA, empresa com sede a Rod. Governador Mario Covas, nº 4251- Planalto de Carapina – Serra – Espírito Santo – CNPJ 28.482.230/0011-25.`;

      // Quebrar o texto em linhas
      const words = texto.split(' ');
      let line = '';
      for (const word of words) {
        const testLine = line + word + ' ';
        const testWidth = font.widthOfTextAtSize(testLine, fontSize);

        if (testWidth > width - 100) {
          page.drawText(line, {
            x: 50,
            y,
            size: fontSize,
            font: font,
            color: rgb(0, 0, 0),
          });
          line = word + ' ';
          y -= spacing;
        } else {
          line = testLine;
        }
      }
      page.drawText(line, {
        x: 50,
        y,
        size: fontSize,
        font: font,
        color: rgb(0, 0, 0),
      });

      y -= spacing * 2;

      // Especificações
      page.drawText("Especificações do aparelho:", {
        x: 50,
        y,
        size: fontSize,
        font: boldFont,
        color: rgb(0, 0, 0),
      });

      y -= spacing;

      // Notebook
      page.drawText("Notebook", {
        x: 50,
        y,
        size: fontSize,
        font: font,
        color: rgb(0, 0, 0),
      });

      y -= spacing;

      // Detalhes em linha
      // Detalhes - Verificar se o número de série é muito longo
      const numeroSerie = patrimonio.numeroSerie || '_________';
      const numeroSerieText = `N° de série: ${numeroSerie}`;
      const numeroSerieWidth = font.widthOfTextAtSize(numeroSerieText, fontSize);
      const maxWidthForInline = 200; // Largura máxima para ficar na mesma linha
      
      if (numeroSerieWidth > maxWidthForInline) {
        // Número de série muito longo - colocar em linha separada
        page.drawText(numeroSerieText, {
          x: 50,
          y,
          size: fontSize,
          font: font,
          color: rgb(0, 0, 0),
        });
        
        y -= spacing;
        
        // Marca e Modelo na linha seguinte
        page.drawText(`Marca: ${patrimonio.fabricante || '_________'}`, {
          x: 50,
          y,
          size: fontSize,
          font: font,
          color: rgb(0, 0, 0),
        });

        page.drawText(`Modelo: ${patrimonio.modelo || '_________'}`, {
          x: 250,
          y,
          size: fontSize,
          font: font,
          color: rgb(0, 0, 0),
        });
      } else {
        // Número de série normal - tudo na mesma linha
        page.drawText(numeroSerieText, {
          x: 50,
          y,
          size: fontSize,
          font: font,
          color: rgb(0, 0, 0),
        });

        page.drawText(`Marca: ${patrimonio.fabricante || '_________'}`, {
          x: 250,
          y,
          size: fontSize,
          font: font,
          color: rgb(0, 0, 0),
        });

        page.drawText(`Modelo: ${patrimonio.modelo || '_________'}`, {
          x: 400,
          y,
          size: fontSize,
          font: font,
          color: rgb(0, 0, 0),
        });
      }

      y -= spacing * 2;

      // Declaração adicional
      const declaracao = `DECLARO ainda que:\n• O ${patrimonio.nome} foi adquirido pela COMERCIAL SCARDUA LTDA e repassado a mim, cuja, quaisquer avarias decorrentes de mau uso serão de minha inteira responsabilidade.`;

      page.drawText("DECLARO ainda que:", {
        x: 50,
        y,
        size: fontSize,
        font: boldFont,
        color: rgb(0, 0, 0),
      });

      y -= spacing;

      page.drawText(`• O ${patrimonio.nome} foi adquirido pela COMERCIAL SCARDUA LTDA e repassado a mim, cuja,`, {
        x: 50,
        y,
        size: fontSize,
        font: font,
        color: rgb(0, 0, 0),
      });

      y -= spacing;

      page.drawText("quaisquer avarias decorrentes de mau uso serão de minha inteira responsabilidade.", {
        x: 65,
        y,
        size: fontSize,
        font: font,
        color: rgb(0, 0, 0),
      });

      // Data atualizada para Serra-ES
      y -= spacing * 2;
      const dataAtual = new Date().toLocaleDateString('pt-BR');
      page.drawText(`Serra-ES, ${dataAtual}`, {
        x: 50,
        y,
        size: fontSize,
        font: font,
        color: rgb(0, 0, 0),
      });

      // Adicionar o nome da empresa apenas aqui
      y -= spacing * 3;
      const empresaNome = "COMERCIAL SCARDUA LTDA";
      const empresaWidth = font.widthOfTextAtSize(empresaNome, fontSize);
      page.drawText(empresaNome, {
        x: (width - empresaWidth) / 2,
        y,
        size: fontSize,
        font: boldFont,
        color: rgb(0, 0, 0),
      });

      // E ao chamar a função generateSignatureSection, passe o y já atualizado
      generateSignatureSection(page, y, patrimonio, font, boldFont);
    }

    // Gerar o PDF
    const pdfBytes = await pdfDoc.save();

    return new NextResponse(pdfBytes, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename=termo_responsabilidade_${patrimonioId}.pdf`,
      },
    });
  } catch (error) {
    console.error("Erro ao gerar documento:", error);
    return NextResponse.json({ error: "Erro ao gerar documento" }, { status: 500 });
  }
}