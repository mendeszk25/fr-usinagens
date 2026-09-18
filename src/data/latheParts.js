const part = ({
  id,
  title,
  eyebrow,
  description,
  position = [0, 0, 0],
  explodedPosition = position,
  rotation = [0, 0, 0],
  explodedRotation = rotation,
  stage,
  scrollRange,
  material = "castIron",
}) => ({
  id,
  title,
  eyebrow,
  description,
  position,
  explodedPosition,
  rotation,
  explodedRotation,
  stage,
  scrollRange,
  metadata: {
    material,
    specification:
      "Estudo ilustrativo de um torno horizontal universal — dimensões, capacidade e especificações dependem da máquina real.",
  },
});

// Coordenadas locais preservam a hierarquia real: cabeçote carrega eixo/placa,
// placa carrega castanhas e carro carrega seus conjuntos superiores. Isso torna
// a vista explodida reversível e mecanicamente legível em qualquer direção.
export const latheParts = [
  part({
    id: "headstock",
    title: "Cabeçote",
    eyebrow: "Eixo-árvore e transmissão",
    description:
      "Conjunto estrutural que abriga o eixo-árvore e os mecanismos de transmissão. Sua rigidez e alinhamento definem a referência de rotação para o restante do torno.",
    position: [-3.22, 0.58, 0],
    explodedPosition: [-3.78, 0.72, -0.1],
    explodedRotation: [0, -0.022, 0],
    stage: [0.78, 0.88],
    scrollRange: [0.1, 0.2],
  }),
  part({
    id: "spindle",
    title: "Eixo-árvore",
    eyebrow: "Rotação concêntrica",
    description:
      "O eixo-árvore transmite rotação à placa e estabelece o centro geométrico do trabalho. Flanges, mancais e superfícies usinadas mantêm o conjunto concêntrico.",
    position: [0.98, 0.82, 0],
    explodedPosition: [1.24, 0.82, 0],
    stage: [0.72, 0.82],
    scrollRange: [0.1, 0.2],
    material: "machined",
  }),
  part({
    id: "chuck",
    title: "Placa universal de 3 castanhas",
    eyebrow: "Fixação e centralização",
    description:
      "As três castanhas movimentam-se de forma coordenada para prender componentes no eixo de rotação, proporcionando centralização prática e fixação segura durante a usinagem.",
    position: [1.58, 0.82, 0],
    explodedPosition: [2.18, 0.84, 0],
    explodedRotation: [0.035, 0, 0],
    stage: [0.3, 0.38],
    scrollRange: [0.2, 0.38],
    material: "machined",
  }),
  part({
    id: "jaw01",
    title: "Castanhas da placa",
    eyebrow: "Abertura radial sincronizada",
    description:
      "Cada castanha desliza por um canal radial da placa. O movimento sincronizado aproxima ou afasta as três peças mantendo o centro de fixação sobre o eixo-árvore.",
    position: [0.31, 0.5, 0],
    explodedPosition: [0.31, 0.93, 0],
    stage: [0.2, 0.3],
    scrollRange: [0.2, 0.38],
    material: "darkSteel",
  }),
  part({
    id: "jaw02",
    title: "Castanhas da placa",
    eyebrow: "Abertura radial sincronizada",
    description:
      "Cada castanha desliza por um canal radial da placa. O movimento sincronizado aproxima ou afasta as três peças mantendo o centro de fixação sobre o eixo-árvore.",
    position: [0.31, -0.25, 0.433],
    explodedPosition: [0.31, -0.465, 0.805],
    rotation: [Math.PI / 3, 0, 0],
    explodedRotation: [Math.PI / 3, 0, 0],
    stage: [0.2, 0.3],
    scrollRange: [0.2, 0.38],
    material: "darkSteel",
  }),
  part({
    id: "jaw03",
    title: "Castanhas da placa",
    eyebrow: "Abertura radial sincronizada",
    description:
      "Cada castanha desliza por um canal radial da placa. O movimento sincronizado aproxima ou afasta as três peças mantendo o centro de fixação sobre o eixo-árvore.",
    position: [0.31, -0.25, -0.433],
    explodedPosition: [0.31, -0.465, -0.805],
    rotation: [-Math.PI / 3, 0, 0],
    explodedRotation: [-Math.PI / 3, 0, 0],
    stage: [0.2, 0.3],
    scrollRange: [0.2, 0.38],
    material: "darkSteel",
  }),
  part({
    id: "carriage",
    title: "Carro principal",
    eyebrow: "Deslocamento longitudinal e suporte",
    description:
      "O carro percorre as guias do barramento e sustenta apron, carro transversal, carro superior e porta-ferramentas, mantendo o conjunto rígido durante o avanço longitudinal.",
    position: [-0.12, 0.16, 0],
    explodedPosition: [-0.02, 0.66, 0.12],
    stage: [0.65, 0.74],
    scrollRange: [0.65, 0.74],
  }),
  part({
    id: "crossSlide",
    title: "Carro transversal",
    eyebrow: "Avanço perpendicular ao eixo",
    description:
      "O carro transversal controla o movimento perpendicular ao eixo da peça, permitindo ajustar profundidade de corte, diâmetros e operações de faceamento.",
    position: [0.02, 0.46, 0],
    explodedPosition: [0.02, 0.51, 1.1],
    stage: [0.57, 0.65],
    scrollRange: [0.57, 0.65],
  }),
  part({
    id: "compound",
    title: "Carro superior / composto",
    eyebrow: "Ajuste fino e operações angulares",
    description:
      "Montado sobre uma base orientável, o carro superior acrescenta um avanço de ajuste fino e permite posicionar a ferramenta em ângulos específicos.",
    position: [0.08, 0.29, 0],
    explodedPosition: [0.08, 0.5, -0.86],
    rotation: [0, 0.11, 0],
    explodedRotation: [0, 0.19, -0.04],
    stage: [0.48, 0.57],
    scrollRange: [0.48, 0.57],
  }),
  part({
    id: "toolPost",
    title: "Porta-ferramentas",
    eyebrow: "Rigidez e posicionamento de corte",
    description:
      "A torre fixa a ferramenta próxima ao ponto de corte. Parafusos, base e superfícies de apoio trabalham juntos para reduzir deslocamentos durante a remoção de material.",
    position: [0, 0.31, 0],
    explodedPosition: [0, 1.17, 0.14],
    explodedRotation: [0, 0.045, 0.05],
    stage: [0.38, 0.48],
    scrollRange: [0.38, 0.48],
    material: "darkSteel",
  }),
  part({
    id: "cuttingTool",
    title: "Ferramenta de corte",
    eyebrow: "Aresta ativa",
    description:
      "A ferramenta posiciona uma aresta resistente contra a peça em rotação. Sua geometria e orientação definem como o material é removido durante a operação.",
    position: [0.22, 0.23, 0.18],
    explodedPosition: [0.4, 0.36, 1.0],
    stage: [0.4, 0.49],
    scrollRange: [0.38, 0.48],
    material: "toolSteel",
  }),
  part({
    id: "tailstock",
    title: "Contraponto",
    eyebrow: "Apoio e alinhamento axial",
    description:
      "Posicionado ao longo do barramento, o contraponto oferece suporte ao extremo de peças alongadas e também pode receber ferramentas axiais em determinadas operações.",
    position: [3.02, 0.24, 0],
    explodedPosition: [4.18, 0.32, 0.08],
    stage: [0.74, 0.82],
    scrollRange: [0.74, 0.82],
  }),
  part({
    id: "quill",
    title: "Mangote do contraponto",
    eyebrow: "Avanço axial controlado",
    description:
      "O mangote se desloca coaxialmente ao eixo-árvore para aproximar um centro ou uma ferramenta da peça mantendo o alinhamento longitudinal.",
    position: [-0.64, 0.87, 0],
    explodedPosition: [-1.18, 0.87, 0],
    stage: [0.75, 0.83],
    scrollRange: [0.74, 0.82],
    material: "machined",
  }),
  part({
    id: "tailstockHandle",
    title: "Volante do contraponto",
    eyebrow: "Comando manual do mangote",
    description:
      "O volante converte a rotação manual em avanço axial do mangote, permitindo aproximar ou recuar o centro de apoio de forma controlada.",
    position: [0.82, 0.77, 0],
    explodedPosition: [1.22, 0.77, 0],
    explodedRotation: [Math.PI * 0.62, 0, 0],
    stage: [0.76, 0.84],
    scrollRange: [0.74, 0.82],
    material: "darkSteel",
  }),
  part({
    id: "feedAssembly",
    title: "Fuso e barra de avanço",
    eyebrow: "Transmissão de movimento ao carro",
    description:
      "Os elementos longitudinais de avanço conduzem movimento ao conjunto do carro. No torno convencional, o fuso é especialmente associado às operações de roscamento.",
    position: [0, -0.5, 0.9],
    explodedPosition: [0, -0.64, 1.14],
    stage: [0.82, 0.9],
    scrollRange: [0.82, 0.9],
    material: "machined",
  }),
];

export const componentDetails = [
  latheParts.find((item) => item.id === "headstock"),
  latheParts.find((item) => item.id === "chuck"),
  latheParts.find((item) => item.id === "jaw01"),
  latheParts.find((item) => item.id === "carriage"),
  latheParts.find((item) => item.id === "crossSlide"),
  latheParts.find((item) => item.id === "compound"),
  latheParts.find((item) => item.id === "toolPost"),
  latheParts.find((item) => item.id === "tailstock"),
  latheParts.find((item) => item.id === "feedAssembly"),
];

export const chapters = [
  {
    from: 0,
    label: "TORNO HORIZONTAL UNIVERSAL",
    title: "VERSATILIDADE\nEM UM ÚNICO EIXO.",
    description:
      "Projetado para torneamento cilíndrico, faceamento, canais, roscas e outras operações que dependem de alinhamento e estabilidade mecânica.",
  },
  {
    from: 0.2,
    label: "PLACA UNIVERSAL",
    title: "FIXAR.\nCENTRALIZAR.",
    description:
      "A placa universal de três castanhas posiciona a peça sobre o eixo de rotação e mantém a fixação durante o trabalho.",
  },
  {
    from: 0.38,
    label: "CARRO E PORTA-FERRAMENTAS",
    title: "RIGIDEZ\nNO CORTE.",
    description:
      "Carro, composto e porta-ferramentas conduzem e sustentam a ferramenta durante os movimentos de usinagem.",
  },
  {
    from: 0.57,
    label: "CARROS DE AVANÇO",
    title: "MOVIMENTO\nCONTROLADO.",
    description:
      "Os conjuntos de avanço transformam comando mecânico em deslocamentos longitudinais e transversais sobre as guias.",
  },
  {
    from: 0.74,
    label: "CONTRAPONTO",
    title: "APOIO E\nALINHAMENTO.",
    description:
      "O contraponto amplia a estabilidade em peças alongadas e mantém ferramentas axiais alinhadas ao centro de trabalho.",
  },
  {
    from: 0.9,
    label: "ENGENHARIA EM CONJUNTO",
    title: "CADA CONJUNTO.\nUMA FUNÇÃO.",
    description:
      "Cabeçote, barramento, sistemas de avanço, carros, porta-ferramentas e contraponto atuam como um único sistema mecânico.",
  },
];

const annotationOrder = [
  "headstock",
  "chuck",
  "toolPost",
  "compound",
  "crossSlide",
  "carriage",
  "tailstock",
  "feedAssembly",
];

export function activePart(progress) {
  for (const id of annotationOrder) {
    const item = latheParts.find((candidate) => candidate.id === id);
    if (progress >= item.scrollRange[0] && progress < item.scrollRange[1])
      return item;
  }
  return undefined;
}
