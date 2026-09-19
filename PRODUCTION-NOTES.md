# FR Usinagens — fechamento de produção

Este projeto deve ser tratado como o site oficial da FR Usinagens, não como protótipo. A rodada de produção preservou a identidade, o hero, os três modelos 3D distintos, o orçamento, o acompanhamento e o painel administrativo, mas reduziu atrito de navegação e eliminou sinais de desenvolvimento.

## Principais ajustes desta rodada

- Conteúdo real (trabalhos) foi antecipado na narrativa da página e as sequências 3D foram encurtadas, principalmente no mobile.
- O mobile ganhou CTA contextual para enviar a peça e captura direta pela câmera traseira no orçamento.
- O acompanhamento agora pode gerar um link privado com código + token, permitindo retomada em outro dispositivo sem tornar a solicitação pública.
- Pedidos novos podem disparar notificação opcional por e-mail via Resend; falha de e-mail nunca invalida um orçamento já salvo.
- Foi criada `/privacidade.html`; arquivos de orçamento continuam privados e separados da mídia pública do site.
- O canvas 3D invisível próximo ao orçamento foi removido por completo; cenas secundárias pausam fora da área relevante e podem ser descartadas no mobile.
- Conteúdo dinâmico de trabalhos/antes-depois é carregado próximo da viewport; conteúdo cadastrado no painel se torna a fonte principal quando existir, mantendo o material estático apenas como fallback.
- Uploads públicos feitos pelo painel são reduzidos e convertidos para WebP no navegador quando isso diminui o peso.
- Foram adicionados headers de segurança, métricas desacopladas sem PII e configuração pública centralizada da empresa.

## Configuração externa obrigatória antes do deploy oficial

No ambiente de produção configure `ADMIN_PASSWORD`, `ADMIN_SESSION_SECRET` e `RATE_LIMIT_SALT`. Para notificações de novos pedidos configure `RESEND_API_KEY`, `QUOTE_NOTIFICATION_TO` e `QUOTE_NOTIFICATION_FROM`. Configure também `SITE_URL` com o domínio oficial para gerar sitemap/robots corretos.

Nunca faça commit de secrets. Use os mecanismos de secrets/variáveis do Cloudflare.

## Dados que ainda dependem de confirmação da FR

Não publicar automaticamente horários, área atendida, materiais, máquinas, tolerâncias, dimensões máximas, prazos, certificações ou depoimentos sem confirmação real. O site deve omitir essas informações em vez de exibir placeholders.

## Validação

Execute antes de cada deploy:

```bash
npm ci
npm test
npm run build
```

Quando o ambiente tiver navegador do Playwright configurado, execute também:

```bash
npm run test:browser
```
