# Revisão mobile / iPhone — FR Usinagens

Rodada exclusiva de acabamento mobile/iOS Safari. A identidade desktop foi preservada.

## Ajustes principais

- Remoção do glifo diagonal que virava emoji azul no iOS; CTAs públicos agora usam seta vetorial CSS monocromática.
- CTA móvel `ENVIAR FOTO DA PEÇA` reduzido para 54 px, com safe-area e ocultação discreta durante scroll para não cobrir conteúdo.
- Hero recebeu quebra de linha mobile intencional e regras próprias para impedir corte horizontal.
- Perfil WebGL de celulares modernos passou a iniciar em qualidade alta quando o hardware permite.
- DPR mobile elevado de forma controlada e antialias mantido/ativado também nas cenas 3D secundárias.
- Geometria do torno usa mais segmentos no perfil mobile de alta qualidade.
- Pino roscado, eixo com engrenagem e conjunto industrial receberam enquadramento mobile mais próximo e maior presença visual.
- Iluminação das cenas secundárias foi ajustada no mobile para revelar melhor roscas, canais, dentes e cavidades.
- Seções 3D ficaram mais compactas, com menos espaço morto e maior relação entre texto e objeto.
- `Forma, volume e leitura técnica` passa a organizar no mobile: título/descrição → modelo → detalhes.
- Trabalhos reais passam para uma coluna no iPhone, dando mais presença às fotografias.
- Catálogo de serviços passa para composição vertical em telas até 430 px.
- Tipografia útil recebeu maior legibilidade sem alterar as fontes da identidade.

## Validação

- `npm test`: **33/33 testes passaram**.
- `node --check` passou nos módulos JavaScript alterados.
- `npm run build` não pôde ser concluído neste ambiente porque a instalação local do Vite ficou incompleta após timeout de `npm install` (`node_modules/vite` sem binário). Isso é limitação do ambiente desta execução, não um erro identificado no código.

No ambiente local do projeto, validar com:

```bash
npm install
npm test
npm run build
```

E, antes do deploy, conferir em Safari/iPhone real principalmente: hero, CTA fixo, 3D, comparador Antes × Depois e barra inferior dinâmica do Safari.
