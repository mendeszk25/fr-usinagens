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
8. o WhatsApp é aberto com os dados organizados e o código da solicitação;
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

