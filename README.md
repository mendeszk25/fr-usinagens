# FR Usinagens

Site institucional da FR Usinagens, em Gravatá – PE, com uma experiência WebGL de **torno mecânico horizontal universal** controlada pelo scroll e uma apresentação editorial baseada em registros reais da oficina.

## Stack

- Vite + JavaScript modular
- Three.js
- GSAP + ScrollTrigger
- Playwright (testes de interface)
- Node Test Runner (testes determinísticos da timeline)

## Conteúdo real da empresa

As imagens em `public/images/real/` foram recortadas e otimizadas a partir dos registros fornecidos da FR Usinagens. Elas substituem as antigas imagens de banco e mostram trabalhos reais como componentes usinados, engrenagens, reparos, peças sob medida, itens roscados, torno em operação e adaptações mecânicas.

Informações comerciais usadas no site:

- Gravatá – PE
- Rua Prefeito Roberto Avelino, próximo à Ponte Nova
- WhatsApp: (81) 97309-1369
- Instagram: @fr.usinagens

O formulário de orçamento não envia dados para um backend: ele organiza as informações preenchidas e abre o WhatsApp oficial da FR para o usuário revisar e enviar a mensagem.

## Experiência 3D

O torno é construído proceduralmente em Three.js, sem depender de um GLB externo. Cabeçote, placa, castanhas, carro, porta-ferramentas, fuso, contraponto e demais conjuntos permanecem independentes para produzir uma vista explodida reversível.

A animação é determinada pelo progresso do scroll. Se a rolagem para, a animação para. Ao voltar para cima, o conjunto retorna exatamente às posições anteriores.

O modelo é um **estudo visual ilustrativo** de um torno mecânico horizontal universal. Não representa um fabricante ou desenho CAD específico e não deve ser usado como fonte de dimensões, potência, RPM, tolerâncias ou capacidade de máquina.

## Rodar localmente

```bash
npm install
npm run dev
```

Depois abra o endereço mostrado pelo Vite, normalmente `http://localhost:5173/`.

Build de produção:

```bash
npm run build
```

Testes determinísticos:

```bash
npm test
```

Testes de navegador:

```bash
npm run test:browser
```

## Produção / SEO

O projeto cria `canonical` e `og:url` a partir do domínio em que estiver sendo executado, evitando inventar uma URL de produção antes do deploy. Antes de publicar definitivamente, confirme o domínio final e gere um `sitemap.xml` com essa URL real.

`public/robots.txt` já permite indexação. O preview social está em `public/images/og-fr-usinagens.jpg`.

## Responsividade 3D

A experiência do torno usa o mesmo progresso mecânico normalizado (`0 → 1`) em desktop, Android e iOS. O enquadramento é adaptado por proporção da viewport em `src/experience/responsive.js` e `CameraRig.js`; em telas estreitas a vista explodida reduz somente a distância entre os componentes, sem remover etapas.

A etapa principal usa viewport móvel estável (`svh`) para evitar saltos provocados pela barra do Safari/Chrome, respeita safe areas, limita DPR em telas Retina, reduz shadow map conforme o tier de renderização e mantém o 3D em hardware limitado. O fallback estático é reservado para falha real de WebGL/contexto não recuperável ou `prefers-reduced-motion` conforme a preferência do usuário.

Matriz de validação prevista nos testes de navegador: 360×800, 390×844, 430×932, 768×1024, 844×390, 1366×768 e 1440×900, além de projeto Playwright para Chromium e WebKit.
