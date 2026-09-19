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

O formulário de orçamento agora tem integração full-stack opcional via **Cloudflare Pages Functions + D1 + R2**. Quando o backend está configurado, a solicitação é validada novamente no servidor, registrada no banco, recebe um código aleatório e pode armazenar anexos em bucket privado. O WhatsApp continua como canal de conversa. Em um ambiente sem backend, o site informa explicitamente que nada foi salvo e usa somente o WhatsApp — não simula persistência.

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

A etapa principal usa viewport móvel estável (`svh`) para evitar saltos provocados pela barra do Safari/Chrome, respeita safe areas e mantém o 3D em hardware limitado. `prefers-reduced-motion` reduz apenas movimentos decorativos; a desmontagem controlada pelo usuário continua ativa. O modo totalmente estático é uma escolha explícita do usuário ou um fallback de falha real de WebGL/contexto não recuperável.

No mobile, a qualidade começa em `mobile-balanced` e mede o custo de renderização antes de travar um tier para a sessão/orientação: `mobile-high` (DPR até 1.60 em portrait), `mobile-balanced` (até 1.40) ou `mobile-low` (até 1.12). O modelo mobile usa geometria intermediária, materiais metálicos com microvariação otimizada, luz de recorte neutra e uma sombra de contato barata em vez de shadow map dinâmica.

Matriz de validação prevista nos testes de navegador: 360×800, 390×844, 430×932, 768×1024, 844×390, 1366×768 e 1440×900, além de projeto Playwright para Chromium e WebKit.

## Sistema de orçamento full-stack

A implementação de backend foi adicionada em `functions/` sem remover o frontend estático do Vite. A escolha foi **Cloudflare Pages Functions** porque o projeto já é um site estático e esse modelo mantém frontend e API no mesmo domínio sem expor credenciais no navegador.

Fluxo de produção:

1. o cliente preenche o formulário e pode anexar até 4 arquivos;
2. o frontend faz validação de experiência;
3. `POST /api/quotes` valida tudo novamente no servidor;
4. a solicitação é gravada em D1;
5. anexos permitidos são guardados no R2 privado;
6. é gerado um código público aleatório (`FR-XXXXXX`) e uma chave privada de acompanhamento;
7. apenas a chave fica salva no navegador do cliente; o banco guarda somente o SHA-256 dela;
8. após o registro, o cliente recebe um botão para continuar no WhatsApp com os dados organizados e o código da solicitação;
9. a consulta pública exige código + chave privada e expõe apenas status, atualização e observação pública.

Limites atuais de upload: JPG, PNG, WEBP ou PDF; até 4 arquivos; 8 MB por arquivo; 20 MB no total. Esses mesmos limites existem no frontend e no backend.

### Banco

A migration está em:

```text
migrations/0001_quotes.sql
```

Ela cria:

- `quote_requests`;
- `quote_files`;
- `quote_status_history`;
- `rate_limits`;
- índices para status, data e relações.

Nenhum dado real é incluído na migration.

### Storage

O binding esperado do R2 é:

```text
QUOTE_FILES
```

O bucket deve permanecer privado. Os arquivos não recebem URL pública; o painel baixa cada anexo por uma rota autenticada do backend.

### D1

O binding esperado é:

```text
DB
```

Um modelo de configuração está em `wrangler.example.toml`. Ele contém placeholders de propósito; não deve ser usado em produção antes de preencher o ID real do D1 e confirmar o nome do bucket.

### Secrets administrativos

Configure no ambiente do Cloudflare, nunca no JavaScript público:

```text
ADMIN_PASSWORD
ADMIN_SESSION_SECRET
RATE_LIMIT_SALT
```

Para desenvolvimento local com Wrangler, copie `.dev.vars.example` para `.dev.vars` e troque todos os valores. `.dev.vars` está no `.gitignore`.

Para gerar secrets localmente, um exemplo é:

```bash
openssl rand -hex 32
```

Use valores diferentes para `ADMIN_SESSION_SECRET` e `RATE_LIMIT_SALT`.

## Painel administrativo

O build inclui `admin.html`.

O painel permite:

- login server-side;
- listar solicitações com paginação;
- pesquisar por código, cliente ou telefone;
- filtrar por status;
- abrir detalhes;
- visualizar dados informados;
- baixar anexos privados;
- alterar status;
- editar observação pública;
- manter observação interna;
- consultar histórico de mudanças.

A senha não é compilada no frontend. O login cria cookie `HttpOnly`, `Secure` e `SameSite=Strict`, assinado com HMAC no backend.

Status iniciais disponíveis:

- Solicitação recebida;
- Em análise;
- Orçamento enviado;
- Aprovado;
- Em execução;
- Em conferência;
- Pronto;
- Finalizado;
- Cancelado.

Eles estão centralizados em `functions/_lib/validation.js` para serem ajustados quando o processo real da FR for confirmado.

## Configuração no Cloudflare Pages

A configuração de produção exige três etapas que não podem ser concluídas apenas com o ZIP, porque dependem da conta Cloudflare do proprietário:

1. criar um D1 e aplicar `migrations/0001_quotes.sql`;
2. criar um bucket R2 privado e vinculá-lo como `QUOTE_FILES`;
3. adicionar `ADMIN_PASSWORD`, `ADMIN_SESSION_SECRET` e `RATE_LIMIT_SALT` como secrets/variáveis server-side.

Depois, vincule o D1 como `DB` ao projeto Pages e faça o deploy do repositório com a pasta `functions/` presente.

Não coloque secrets em `.env` com prefixo `VITE_`: tudo com `VITE_` pode acabar no bundle público.

## Desenvolvimento sem backend

`npm run dev` continua abrindo o frontend normalmente. Como o Vite sozinho não executa Pages Functions, o formulário detecta que a API não existe, informa que **nenhum dado foi salvo** e continua pelo WhatsApp.

Para testar a integração real localmente, use Wrangler/Pages Functions depois de configurar D1 e R2. O arquivo `wrangler.example.toml` documenta os bindings esperados.

## Segurança adicionada

- validação de campos novamente no backend;
- limite de tamanho e tipo de arquivo no backend;
- nomes de arquivos normalizados e chaves de storage aleatórias;
- R2 privado;
- código público aleatório em vez de ID sequencial;
- chave de acompanhamento separada do código;
- somente hash da chave salvo no banco;
- rate limiting básico por IP com chave hasheada;
- sessão administrativa HttpOnly/HMAC;
- respostas de erro sem stack trace;
- headers básicos de segurança em `public/_headers`;
- `admin.html` marcado como `noindex`;
- secrets e arquivos locais adicionados ao `.gitignore`.

O rate limiting atual é adequado para o porte esperado da aplicação, mas pode ser trocado por Turnstile ou uma estratégia mais robusta se o volume/abuso exigir.

## Arquivos principais do novo sistema

```text
functions/_lib/*                 utilitários de segurança/validação
functions/api/quotes.js          criação de solicitação
functions/api/quotes/[code].js   acompanhamento privado
functions/api/admin/*            login, sessão e listagem
functions/api/admin/quotes/*     detalhes e atualização
functions/api/admin/files/*      download autenticado de anexos
migrations/0001_quotes.sql       schema D1
src/ui/quoteForm.js              experiência do cliente
src/styles/quote-system.css      UI do orçamento/acompanhamento
admin.html                       painel
src/admin.js                     lógica do painel
src/styles/admin.css             visual do painel
```


## Evolução do painel da oficina (v2)

O painel administrativo agora foi separado em quatro áreas úteis: **Visão geral**, **Solicitações**, **Trabalhos** e **Antes × Depois**. Ele continua sendo uma ferramenta interna simples, sem virar ERP/financeiro/estoque.

### Solicitações

- visão geral com contagens reais por status;
- lista com pesquisa por código, cliente, telefone e descrição;
- filtros por status, tipo, presença de arquivo e arquivamento;
- ordenação por entrada ou última atualização;
- Kanban com drag and drop e confirmação antes de alterar status;
- alternativa por select dentro do detalhe (o drag não é obrigatório);
- notas públicas e internas separadas;
- histórico preservado;
- arquivamento sem apagar pedidos antigos;
- galeria de anexos privados com visualização inline de imagens;
- botão para iniciar uma conversa de WhatsApp sobre a solicitação.

### Orçamento guiado

O formulário público foi dividido em cinco etapas:

1. necessidade;
2. informações da peça;
3. fotos/desenhos;
4. contato;
5. revisão.

Campos técnicos continuam opcionais. O rascunho dos campos de texto fica salvo localmente por até sete dias para evitar perda acidental; arquivos não são guardados em `localStorage`. Depois do registro, a tela mostra código, acompanhamento e botão para continuar no WhatsApp.

O acompanhamento público agora também retorna e exibe uma timeline do histórico da solicitação. O cliente continua vendo apenas informações seguras; notas internas nunca são retornadas pela rota pública.

### Conteúdo administrável

Foram adicionadas as tabelas `works`, `before_after_cases` e `site_media` na migration `migrations/0002_workshop_admin.sql`.

O administrador pode cadastrar trabalhos e comparativos reais, manter como rascunho ou publicar. O site público consulta somente itens publicados. Nenhum conteúdo fictício é inserido pelas migrations.

A mídia institucional usa um binding R2 separado:

```text
SITE_MEDIA
```

Isso mantém duas responsabilidades distintas:

- `QUOTE_FILES`: arquivos privados enviados por clientes;
- `SITE_MEDIA`: imagens institucionais publicadas pelo administrador.

A rota pública `/api/media/:id` só entrega uma imagem quando ela está vinculada a um trabalho/comparativo publicado. O painel usa `/api/admin/media/:id`, que exige sessão administrativa.

### Migrations atuais

Aplique as migrations na ordem:

```text
migrations/0001_quotes.sql
migrations/0002_workshop_admin.sql
```

A segunda migration adiciona `archived` e `city` às solicitações e cria as estruturas do conteúdo administrável.

### Bindings Cloudflare atuais

```text
DB          -> D1
QUOTE_FILES -> R2 privado dos anexos de clientes
SITE_MEDIA  -> R2 das imagens institucionais
```

O exemplo em `wrangler.example.toml` documenta os três bindings.

### Estruturas reservadas para a próxima etapa

A migration `0002_workshop_admin.sql` também cria `services` e `capability_entries` **vazias e inativas**. Elas existem apenas para receber os serviços/capacidades reais quando o responsável da FR confirmar essas informações. O site e o painel não publicam dados dessas tabelas nesta versão, evitando inventar máquinas, materiais, limites ou serviços.

## Narrativa 3D secundária (v4)

Além do torno principal, o site agora possui uma segunda camada visual 3D **compartilhada** para as seções abaixo do hero. Ela não cria um renderer por card/seção: um único canvas WebGL é movido entre os hosts visíveis e renderiza somente a experiência que está próxima da viewport.

Novas experiências:

- **Estudos de geometria mecânica**: três formas procedurais ilustrativas (cilíndrica, vazada e flangeada), selecionáveis por botões. Elas não são apresentadas como catálogo de serviços nem como capacidade confirmada da FR.
- **Da matéria-prima à geometria final**: sequência controlada pelo scroll com material bruto, aproximação de uma ferramenta visual, estágio intermediário e forma final. É uma representação editorial, não CAM/simulação física.
- **Precisão / wireframe / cotas**: uma peça ilustrativa alterna metal e wireframe enquanto linhas HTML de referência aparecem sobre a cena. As cotas usam `L` e `Ø` sem publicar números ou tolerâncias falsas.

Arquivos principais:

```text
src/experience/ProceduralParts.js   modelos procedurais reutilizáveis
src/experience/EngineeringCanvas.js renderer/câmera/luzes compartilhados
src/experience/EngineeringStory.js  lifecycle, viewport, scroll e interação
src/experience/engineeringState.js  matemática determinística das transições
src/styles/engineering-3d.css       layout e overlays técnicos
```

A camada secundária respeita `prefers-reduced-motion`, limita DPR no mobile, não roda um loop contínuo sem necessidade, pausa quando a aba está oculta e mantém fallback visual se WebGL falhar. O painel administrativo continua sem importar Three.js.

Os testes determinísticos cobrem também a progressão `bruto → intermediário → final` e a transição `metal → wireframe → metal`.

## Revisão 3D — referências reais da FR

A camada 3D secundária foi revisada para evitar repetição visual entre as seções e aproximar as formas das referências reais fornecidas da FR Usinagens:

- estudo 01: eixo recuperado/estriado com áreas usinadas e trecho bruto;
- estudo 02: bucha/luva flangeada com estrias internas;
- estudo 03: peão/coroa cônica dentada;
- processo: começa em tarugo cilíndrico bruto, passa por geometria intermediária e termina em eixo estriado;
- precisão: usa uma bucha flangeada com furação e estrias internas, separada visualmente do eixo;
- cada seção usa seu próprio canvas WebGL lazy-loaded, evitando que o estado/modelo de uma seção apareça na outra.

O backend, painel administrativo, orçamento, D1/R2 e autenticação não foram alterados nesta revisão.

## Produção oficial — checklist final

A FR Usinagens deve ser tratada como produto de produção. Consulte `PRODUCTION-NOTES.md` para configuração externa, notificações, privacidade, acompanhamento entre dispositivos e pendências que dependem de dados reais da empresa.

Antes do deploy oficial, configure `SITE_URL` com o domínio definitivo, os secrets administrativos e, se desejado, as variáveis do Resend. Rode `npm test` e `npm run build`; não publique se o build falhar.
