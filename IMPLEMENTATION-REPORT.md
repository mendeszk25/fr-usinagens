# Relatório de refinamento — site oficial FR Usinagens

## 1. Alterações visuais
- Reorganização da narrativa para trazer trabalhos reais mais cedo e alternar fotografia real com experiências 3D.
- FAQ de produção adicionado antes do contato/orçamento.
- Remoção de linguagem pública que denunciava protótipo, referência de desenvolvimento ou backend ainda não configurado.

## 2. Mobile
- Hero e sequências sticky encurtados para reduzir fadiga de rolagem sem remover a narrativa 3D.
- CTA fixo contextual “Enviar foto da peça” após o hero, ocultado na área do orçamento/footer.
- Captura direta pela câmera traseira na etapa de anexos, com fallback para upload normal.
- Ajustes de legibilidade, safe-area e dimensões das novas interfaces.

## 3. UX
- Fluxo de conteúdo prioriza serviços e provas reais antes de longas sequências técnicas.
- FAQ responde dúvidas de quem não conhece material, medidas ou nome técnico da peça.
- Estados do formulário e acompanhamento usam linguagem de produção, não de desenvolvimento.

## 4. Performance
- Removido o canvas WebGL invisível que existia perto do orçamento.
- Conteúdo dinâmico de trabalhos/Antes × Depois é carregado apenas perto da viewport.
- Cenas 3D secundárias pausam fora da região relevante; no mobile podem ser descartadas e recriadas ao retorno.
- Uploads públicos feitos pelo admin são reduzidos e convertidos para WebP quando isso diminui o peso.

## 5. 3D
- Preservados os três modelos distintos já aprovados: eixo com engrenagem, pino roscado com flanges e conjunto industrial robusto.
- Nenhuma das três experiências voltou a compartilhar um único modelo visual.
- Duração de scroll foi reduzida, principalmente no mobile.

## 6. Orçamento
- Upload normal e captura pela câmera funcionam na mesma seleção de arquivos.
- Botão fica bloqueado durante envio e os erros continuam tratados pela interface existente.
- Métricas desacopladas registram etapas e resultado sem enviar telefone, mensagem, foto ou documento.

## 7. Acompanhamento
- Mantido código amigável de solicitação.
- Adicionado link privado contendo código + token no fragmento da URL para permitir retomada segura em outro dispositivo sem tornar a solicitação pública.
- O token continua obrigatório para consultar detalhes privados.

## 8. Painel
- Mantido o painel atual e seu fluxo de solicitações, Kanban, notas, conteúdo e Antes × Depois.
- Upload de mídia pública recebe otimização no navegador antes do envio quando suportado.

## 9. Backend
- Nova notificação opcional de orçamento por e-mail via Resend.
- Falha do provedor de e-mail não cancela nem perde um orçamento já persistido.
- Respostas públicas de indisponibilidade foram tornadas mais humanas e menos técnicas.

## 10. Segurança
- Adicionados headers de produção: nosniff, referrer policy, permissions policy, proteção contra framing, HSTS e CSP compatível com a arquitetura atual.
- Arquivos de orçamento permanecem em armazenamento privado.
- Não foram adicionados secrets no frontend.

## 11. SEO
- Página de privacidade passou a fazer parte do build.
- O gerador de sitemap inclui home e privacidade quando `SITE_URL` estiver configurado.
- O build acrescenta a URL do sitemap ao `robots.txt` sem inventar domínio.

## 12. Acessibilidade
- Novos componentes respeitam `prefers-reduced-motion`.
- CTA e controles adicionados usam elementos semânticos e estados visíveis.
- Microtexto importante recebeu tratamento mobile mais legível.

## 13. Testes executados
- `npm test`: **30/30 testes aprovados**.
- `node --check` aplicado aos módulos principais alterados sem erros de sintaxe.

## 14. Build
- `npm run build` não pôde ser concluído neste ambiente porque a instalação do Vite ficou incompleta e `npm ci` excedeu o limite do ambiente. O build **não está sendo declarado como aprovado**.
- Antes do deploy, rode localmente `npm ci`, `npm test` e `npm run build`.

## 15. Pendências que exigem dados/configuração real da FR
- Domínio oficial (`SITE_URL`).
- Secrets de produção do admin e rate-limit.
- Configuração real do remetente/destinatário do Resend, se a notificação por e-mail for usada.
- Horário, área atendida, máquinas, materiais, tolerâncias, dimensões máximas, prazos e depoimentos só devem entrar após confirmação real.
