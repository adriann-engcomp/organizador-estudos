// Grade curricular oficial — Catálogo de Graduação Unicamp 2024
// Curso 34 – Engenharia de Computação – Modalidade AA (Sistemas de Computação)
// Fonte: https://www.dac.unicamp.br/sistemas/catalogos/grad/catalogo2024/cursos/34g/sugestao.html
//        https://www.dac.unicamp.br/sistemas/catalogos/grad/catalogo2024/cursos/34g/curriculo.html

window.CURRICULO = {
  curso: "34 – Engenharia de Computação (Integral)",
  modalidade: "AA – Sistemas de Computação",
  catalogo: 2024,
  fontes: [
    "https://www.dac.unicamp.br/sistemas/catalogos/grad/catalogo2024/cursos/34g/sugestao.html",
    "https://www.dac.unicamp.br/sistemas/catalogos/grad/catalogo2024/cursos/34g/curriculo.html",
  ],
  observacoes: [
    "Ingressantes pelo vestibular são matriculados em AX; a opção por AA ou AB é feita ao final do 4º semestre (ou antes, com 110 créditos do currículo da habilitação). Se houver excesso de opções, a seleção é por CR.",
    "É obrigatório cumprir o equivalente a 10% dos créditos totais do curso em disciplinas de extensão.",
    "Curso oferecido conjuntamente pela FEEC e pelo IC.",
  ],

  horasPorCredito: 15, // na Unicamp, 1 crédito = 15 horas

  // Total do currículo AA (catálogo 2024): 191 créditos obrigatórios + 49 eletivos = 240 créditos.
  // 10% de 240 = 24 créditos = 24 × 15 = 360 horas de extensão.
  extensao: {
    horas: 360,
    regra: "cumprir o equivalente a 10% dos créditos totais do curso em disciplinas de extensão (10% de 240 créditos = 24 créditos = 360 h).",
    caminhos: [
      { titulo: "Eletivas I (13 créditos)", texto: "Disciplinas com código EX--- ou MX--- (extensão) de qualquer unidade — 13 créditos ≈ 195 h." },
      { titulo: "Eletivas III (12 créditos)", texto: "MC854 – Projeto em Computação com Extensão ou MX853 – Projeto Integrador Interdisciplinar de Extensão III: 180 h de extensão cada." },
      { titulo: "Somando os dois grupos", texto: "195 h + 180 h = 375 h, o que cobre as 360 h exigidas. As obrigatórias da AA não têm carga de extensão no catálogo 2024." },
    ],
  },

  // [código, nome, créditos]
  disciplinas: {
    BE310: ["Ciências do Ambiente", 2],
    CE304: ["Direito", 2],
    CE738: ["Economia para Engenharia", 4],
    CE838: ["Contabilidade para Engenharia", 2],
    CE839: ["Introdução à Administração para Computação", 2],
    EA513: ["Circuitos Elétricos", 4],
    EA614: ["Análise de Sinais", 4],
    EA772: ["Circuitos Lógicos", 4],
    EE533: ["Eletrônica Básica I", 4],
    EE534: ["Laboratório de Eletrônica Aplicada", 2],
    EM423: ["Resistência dos Materiais", 3],
    "F 128": ["Física Geral I", 4],
    "F 159": ["Introdução à Física Experimental I", 2],
    "F 228": ["Física Geral II", 4],
    "F 259": ["Introdução à Física Experimental II", 2],
    "F 315": ["Mecânica Geral I", 4],
    "F 328": ["Física Geral III", 4],
    "F 359": ["Introdução à Física Experimental III", 4],
    "F 428": ["Física Geral IV", 4],
    HZ291: ["Tópicos Especiais de Humanidades I", 2],
    LA122: ["Inglês Instrumental I", 4],
    MA111: ["Cálculo I", 6],
    MA141: ["Geometria Analítica e Vetores", 4],
    MA211: ["Cálculo II", 6],
    MA311: ["Cálculo III", 6],
    MA327: ["Álgebra Linear", 4],
    MC030: ["Projeto Final de Graduação", 12],
    MC102: ["Algoritmos e Programação de Computadores", 6],
    MC202: ["Estruturas de Dados", 6],
    MC322: ["Programação Orientada a Objetos", 4],
    MC358: ["Fundamentos Matemáticos da Computação", 4],
    MC404: ["Organização Básica de Computadores e Linguagem de Montagem", 4],
    MC458: ["Projeto e Análise de Algoritmos I", 4],
    MC504: ["Sistemas Operacionais", 4],
    MC536: ["Bancos de Dados: Teoria e Prática", 6],
    MC558: ["Projeto e Análise de Algoritmos II", 4],
    MC613: ["Laboratório de Circuitos Digitais", 4],
    MC656: ["Engenharia de Software", 4],
    MC714: ["Sistemas Distribuídos", 4],
    MC732: ["Projeto de Sistemas Computacionais", 4],
    MC750: ["Construção de Interfaces Homem-Computador", 4],
    MC832: ["Redes de Computadores", 4],
    MC833: ["Programação de Redes de Computadores", 2],
    MC921: ["Projeto e Construção de Compiladores", 6],
    ME323: ["Introdução aos Modelos Probabilísticos", 4],
    MS211: ["Cálculo Numérico", 4],
    QG101: ["Química I", 4],
  },

  // Proposta de cumprimento (semestre sugerido)
  semestres: [
    { n: 1, creditos: 28, eletivos: 0, codigos: ["F 128", "F 159", "HZ291", "MA111", "MA141", "MC102", "QG101"] },
    { n: 2, creditos: 26, eletivos: 0, codigos: ["F 228", "F 259", "LA122", "MA211", "MA327", "MC202"] },
    { n: 3, creditos: 26, eletivos: 0, codigos: ["EA513", "F 315", "F 328", "F 359", "MA311", "MC322"] },
    { n: 4, creditos: 20, eletivos: 0, codigos: ["EA614", "EA772", "F 428", "MC358", "MC404"] },
    { n: 5, creditos: 26, eletivos: 0, codigos: ["EE533", "MC458", "MC536", "MC613", "MC750", "ME323"] },
    { n: 6, creditos: 21, eletivos: 0, codigos: ["EE534", "EM423", "MC558", "MC656", "MC732", "MS211"] },
    { n: 7, creditos: 20, eletivos: 12, codigos: ["BE310", "CE304", "MC504"] },
    { n: 8, creditos: 24, eletivos: 16, codigos: ["CE838", "CE839", "MC832"] },
    { n: 9, creditos: 25, eletivos: 9, codigos: ["CE738", "MC714", "MC833", "MC921"] },
    { n: 10, creditos: 24, eletivos: 12, codigos: ["MC030"] },
  ],

  gruposEletivos: [
    {
      id: "I", creditos: 13, titulo: "Eletivas I – Extensão",
      descricao: "Qualquer disciplina de graduação da Unicamp com código EX--- ou MX---.",
      lista: [],
    },
    {
      id: "II", creditos: 12, titulo: "Eletivas II – Estágio / IC / Monitoria / Estudo dirigido",
      descricao: "Estágios, iniciação científica, monitoria ou estudo dirigido.",
      lista: [
        ["MC019", "Estágio Supervisionado em Ciência da Computação", 12],
        ["MC020", "Estágio Supervisionado em Ciência da Computação II", 12],
        ["MC032", "Estudo Dirigido", 6],
        ["MC033", "Estudo Dirigido II", 6],
        ["MC040", "Estágio de Iniciação Científica I", 12],
        ["MC041", "Estágio de Iniciação Científica II", 12],
        ["MC050", "Monitoria", 8],
        ["MC051", "Monitoria II", 8],
      ],
    },
    {
      id: "III", creditos: 12, titulo: "Eletivas III – Projeto com Extensão",
      descricao: "Projeto em computação com extensão.",
      lista: [
        ["MC854", "Projeto em Computação com Extensão", 12],
        ["MX853", "Projeto Integrador Interdisciplinar de Extensão III", 12],
      ],
    },
    {
      id: "IV", creditos: 12, titulo: "Eletivas IV – Computação",
      descricao: "Disciplinas avançadas do IC.",
      lista: [
        ["MC346", "Paradigmas de Programação", 4], ["MC521", "Desafios de Programação I", 4],
        ["MC621", "Desafios de Programação II", 4], ["MC646", "Verificação, Validação e Testes de Software", 4],
        ["MC658", "Projeto e Análise de Algoritmos III", 4], ["MC668", "Bioinformática", 4],
        ["MC721", "Desafios de Programação III", 4], ["MC738", "Algoritmos Probabilísticos", 4],
        ["MC748", "Algoritmos de Aproximação", 4], ["MC758", "Teoria dos Jogos Algorítmica", 4],
        ["MC816", "Aprendizado por Reforço", 2], ["MC821", "Desafios de Programação IV", 4],
        ["MC826", "Fundamentos de Álgebra Linear e Otimização para Aprendizado de Máquina", 2],
        ["MC846", "Aprendizado Supervisionado", 2], ["MC847", "Aprendizado Não-supervisionado", 2],
        ["MC852", "Arquiteturas Paralelas", 4], ["MC858", "Algoritmos Paralelos", 4],
        ["MC867", "Deep Learning", 2], ["MC868", "Linguagens Formais e Autômatos", 4],
        ["MC878", "Teoria e Aplicações de Grafos", 4], ["MC886", "Aprendizado de Máquina", 4],
        ["MC887", "Fundamentos Probabilísticos de Aprendizado de Máquina", 2],
        ["MC889", "Introdução à Criptografia", 4], ["MC896", "Processamento de Línguas Naturais", 4],
        ["MC898", "Fluxos em Redes e Programação Linear", 4], ["MC900", "Tópicos Especiais em Linguagem de Programação", 4],
        ["MC906", "Introdução à Inteligência Artificial", 4], ["MC907", "Robótica Móvel", 4],
        ["MC908", "Tópicos Especiais em Teoria da Computação", 4], ["MC912", "Tópicos Especiais em Arquitetura de Computadores", 4],
        ["MC914", "Tópicos em Sistemas Operacionais I", 4], ["MC918", "Tópicos em Teoria da Computação I", 4],
        ["MC919", "Tópicos Especiais em Processamento Gráfico", 4], ["MC920", "Introdução ao Processamento de Imagem Digital", 4],
        ["MC922", "Princípios de Projeto VLSI", 4], ["MC923", "Projetos de Sistemas Digitais com HDLs", 4],
        ["MC926", "Tópicos em Engenharia de Software I", 4], ["MC928", "Tópicos em Teoria da Computação II", 4],
        ["MC936", "Tópicos em Sistemas de Informação", 4], ["MC937", "Computação Gráfica", 4],
        ["MC938", "Algoritmos Criptográficos", 4],
        ["MC940", "Processamento e Análise de Imagens", 4], ["MC942", "Segurança de Redes de Computadores", 4],
        ["MC946", "Aprendizado de Máquina e Reconhecimento de Padrões", 4], ["MC948", "Geometria Computacional", 4],
        ["MC949", "Visão Computacional", 4], ["MC950", "Recuperação de Imagens por Conteúdo", 4],
        ["MC953", "Tópicos em Redes de Computadores I", 4], ["MC954", "Tópicos em Sistemas Operacionais II", 4],
        ["MC956", "Tópicos em Bancos de Dados", 4], ["MC959", "Tópicos em Inteligência Artificial I", 4],
        ["MC962", "Projeto de Redes Multimídia", 4], ["MC963", "Tópicos em Redes de Computadores II", 4],
        ["MC964", "Tópicos em Computação Distribuída", 4], ["MC970", "Introdução à Programação Paralela", 4],
        ["MC971", "Introdução à Programação Concorrente", 4], ["MC972", "Tópicos em Arquitetura e Hardware I", 4],
        ["MC973", "Tópicos em Arquitetura e Hardware II", 4], ["MC976", "Tópicos em Engenharia de Software II", 4],
        ["MC979", "Tópicos em Inteligência Artificial II", 4], ["MC986", "Tópicos em Interfaces Humano-Computador", 4],
        ["MC998", "Fluxo em Redes", 4],
      ],
    },
  ],

  certificados: [
    "Engenharia de Algoritmos (IC)", "Tecnologias para Internet (IC)", "Computação Visual (IC)",
    "Engenharia de Software (IC)", "Sistemas de Informação (IC)",
    "Inteligência Artificial, Aprendizado de Máquina e Ciência de Dados (IC)",
  ],
};



