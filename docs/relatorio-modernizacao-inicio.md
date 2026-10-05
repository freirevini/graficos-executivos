# Relatório de modernização — Página Início (`/inicio`)

**Projeto:** front-conforme (ConforME) · **Etapa:** 1 — análise · **Data:** 05/10/2026

> **Atualização de 05/10/2026 — implementação concluída.** Fases 1A, 2, 3 e 4 entregues; a Fase 1B (navegação no shell) não foi implementada, pois depende de D1. Estado final: 230 testes verdes, build de produção sem avisos (inicial 119,5 kB), axe-core sem violações em 6 larguras (320–1920 px); Lighthouse não executado. O restante deste documento é o diagnóstico e o plano originais.
>
> Decisões efetivas: D2 = rota provisória `/avaliar`; D3 = último mês fechado contra o anterior; D4 = só Aprovada/Reprovada; D5 = endpoint `GET /inicio/ultimas-analises`; D10 = sem lint novo (`strictTemplates` + testes); D11 = mocks regenerados pelo gerador; D12 = feature `inicio` migrada para standalone; D13 = código ocioso removido; D15 = tile próprio (`ini-tile-kpi`).
>
> **Desvios do plano, por pedido posterior:** hero minimalista (só rótulo, saudação e CTA; sem data, perfil, texto de apoio, botão de Gráficos Executivos e link "Como funciona"); diálogo do "Pipeline de IA" reescrito (RAG e 2 agentes Gemini); "Como funciona" com 3 passos (envio, análise, parecer); "Últimas análises" sem a coluna do id; rótulo "ConforME - Riscos Não Financeiros - Banco BV".

**Escopo:** rota `/inicio`, shell de navegação (`app.component`), camada de dados da Home (Mock/HTTP), paleta e tokens, `LeitorPaletaService` e os stubs do chassi usados pela Home. A página Gráficos Executivos foi analisada só no que compartilha com a Home.

---

## Sumário executivo

- A Home é tecnicamente bem estruturada (dados abstratos Mock/HTTP, RxJS sem NgRx, OnPush, tokens de cor, 177 testes verdes), mas **comunica pouco**: identidade repetida no topo, texto institucional ocupando metade da primeira dobra e KPIs grandes sem contexto.
- **5 problemas de severidade Alta:** CTA "Avaliar peça" leva aos Gráficos Executivos (P01); tile "Modelo LLM" habilitado que não faz nada (P02); gerador de mocks apaga a configuração editada à mão a cada `npm start` (P03); CTA abaixo da dobra no mobile (P12); contraste abaixo de WCAG AA no topo e no CTA (P14).
- Medido no navegador: o card "O que é o ConforME?" tem **54% de área vazia** em 1470×802 (274 de 507 px). No mobile 390×844 o CTA começa em **y=824**.
- Parte da modernização pedida **já tem peças prontas e hoje ociosas** no código (sparkline em `cf-kpi`, atalhos com recorte, painel de configuração, insight do dia). Reaproveitar reduz esforço e risco.
- **Alerta de arquitetura:** o topo/menu é um shell provisório que o README manda descartar na integração com o chassi BV. Navegação moderna (Fase 1B) só compensa se for portável ou se o shell sobreviver (decisão D1).
- **Recomendação:** aprovar a Fase 1A (fundações e correções, risco baixo) e responder D1, D2, D3 e D11 para destravar as fases seguintes.

---

## 1. Diagnóstico atual

### 1.1 Método

| Fonte | O que foi feito |
|---|---|
| Código | Rotas, shell, feature `inicio` (9 componentes, store, 3 serviços de dados, 7 modelos), stubs `shared/chassi`, `_paleta.scss`, `LeitorPaletaService`, `tools/gerar-mocks.js`, README e `design/Main.dc.html` |
| Build | `ng build --configuration production` com saída em pasta temporária fora do projeto (não toca `dist/`) |
| Testes | `ng test --watch=false --browsers=ChromeHeadless` direto, sem o hook `pretest`: **177 de 177 verdes** |
| Navegador | `http://localhost:4200/inicio` em 1470×802 (desktop), 768×1024 (tablet), 390×844 e 320×844 (mobile). Geometria e contraste medidos via JavaScript; tiles, diálogo, skip-link e teclado testados. Console sem erros |

Os números da tela (354 análises, 33 s) diferem do `home-screenshot.jpg` (331, 32 s) porque o gerador de mocks usa a data atual. Os mocks foram regenerados em 05/10 às 09:56 pelo `npm start` iniciado nesta sessão (ver P03).

### 1.2 Pontos fortes

| # | Ponto forte | Evidência | Como aproveitar |
|---|---|---|---|
| F1 | Camada de dados abstrata; troca Mock↔HTTP num único provider; nenhum componente usa `HttpClient` | `inicio.module.ts:52-57`; `data/inicio.service.ts` | Novas seções seguem o mesmo padrão |
| F2 | Estado em RxJS simples: `BehaviorSubject` + `switchMap` + `shareReplay({ refCount: false })`; view-model único `visao$` | `state/inicio.store.ts:21-30`; `pagina-inicio.component.ts:44-59` | Base para novos recursos |
| F3 | `Recurso<T>` e `manterDadoAnterior()` prontos para stale-while-revalidate | `core/models/recurso.model.ts:5-44` | Aplicar na Home sem código novo |
| F4 | Tokens centralizados com contraste documentado; `LeitorPaletaService` entrega cores ao Chart.js | `styles/_paleta.scss`; `core/services/leitor-paleta.service.ts` | Tematização em um arquivo |
| F5 | OnPush em 100% dos componentes; features lazy; build dentro dos budgets (inicial 118 kB transferidos) | build de referência (Anexo B) | — |
| F6 | Estados de carregamento e erro padronizados (`cf-card`, `cf-estado`, `mapearErro`); erro simulável com `?simularErro=1` | `shared/chassi/cf-card`; `core/models/erro-carregamento.model.ts` | Reuso nos novos blocos |
| F7 | Base de acessibilidade: `lang="pt-BR"`, título por rota, `:focus-visible` e `prefers-reduced-motion` globais, diálogos com `aria-modal` e foco gerenciado | `index.html:2`; `styles.scss:59-72`; diálogo testado | — |
| F8 | Sem rolagem horizontal em 390 e 320 px | medição no navegador | — |
| F9 | Peças prontas e ociosas que cobrem parte da modernização: `cf-kpi` (sparkline Chart.js e variação com texto para leitor de tela), `PainelAtalhosComponent` + `ultimosDias()`, `PainelConfiguracaoComponent`/`DialogoConfiguracaoComponent`, `CartaoCuriosidadeComponent` + `insights.ts`, `dataPorExtenso()` | `shared/chassi/cf-kpi`; `features/inicio/components/*`; `features/inicio/models/*` | Fases 2 e 3 |
| F10 | TypeScript `strict` + `strictTemplates`; 177 testes verdes | `tsconfig.json`; Anexo B | — |

### 1.3 Problemas

Severidade: **Alta** = quebra funcional, informação enganosa ou falha WCAG AA. **Média** = prejudica clareza ou uso de forma perceptível. **Baixa** = consistência ou manutenção. A coluna "Fase" indica onde o problema é resolvido.

#### A. Funcionamento e dados

| ID | Problema | Sev. | Evidência | Fase |
|---|---|---|---|---|
| P01 | CTA "Avaliar peça" navega para `/graficos-executivos`: o rótulo promete uma ação que não existe na aplicação. | Alta | `pagina-inicio.component.html:60-64` (comentário "rota real … a definir com o time") | 2 (D2) |
| P02 | Tile "Modelo LLM e versão" é um botão habilitado que não faz nada: o handler só abre o diálogo se houver modelo com `logo === 'gemini'`, e o mock atual não tem `logo`. Mesmo com dados completos há incoerência: o tile mostra `modelos[0]` (GPT-4o, etapa de triagem) com a versão **do prompt**, e o diálogo lista só modelos Gemini. | Alta | `pagina-inicio.component.ts:55-57, 66-69`; clique testado no navegador (nenhum diálogo) | 1A, 2 |
| P03 | `tools/gerar-mocks.js` sobrescreve `configuracao.mock.json` a cada `npm start`/`npm test` (hooks `prestart`/`pretest`) e não gera `versao`, `dataLancamento`, `logo` nem os modelos `GEMINI_31PRO`/`GEMINI_38FLASH` usados em `benchmark-gemini.ts`. A versão editada à mão (4 modelos) foi apagada em 05/10 às 09:56 pelo `npm start` desta sessão; há cópia íntegra em `dist/front-conforme/assets/mocks/inicio/configuracao.mock.json` (build de 15/09). Os testes não detectam porque usam fixtures. | Alta | `tools/gerar-mocks.js:92-96, 162-182`; `package.json:17-20` | 1A (D11) |
| P04 | Mês corrente parcial tratado como completo: a série termina em `out/26` com 7 peças (5 dias) sem marcação e parece uma queda brusca. A comparação "mês corrente × anterior" também distorce (o design anterior exibia "−47,7%"). | Média | `inicio-mock.service.ts:65-71, 87-102`; `insights.ts:27-35`; diálogo "Análises em 2026" | 1A, 2 |
| P05 | Dois "tempos médios" com bases diferentes e sem rótulo: tile = ano corrente (33 s); configuração = base inteira (32 s). | Baixa | `inicio-mock.service.ts:61-63`; `configuracao.mock.json:22` | 2 |

#### B. Hierarquia visual e conteúdo

| ID | Problema | Sev. | Evidência | Fase |
|---|---|---|---|---|
| P06 | Identidade repetida ocupa a área nobre: "ConforME" no topo e na faixa; "BV · Riscos Não Financeiros" na faixa e no rodapé. Não há título nem proposta de valor; a saudação é texto secundário (15 px, opacidade 0,9). | Média | `faixa-saudacao.component.html:1-10`; `pagina-inicio.component.html:69-72` | 2 |
| P07 | Card "O que é o ConforME?" esticado: em 1470×802 mede 507 px com 179 px de texto (**274 px vazios, 54%**); em 768×1024 sobram 120 px. Causa: `min-height: calc(100vh - 56px)` + `flex: 1` + `align-items: stretch` + linhas `1fr`. | Média | `pagina-inicio.component.scss:4-27, 135-137`; medição | 1A |
| P08 | Tiles de KPI superdimensionados e sem contexto: 342×244 px para ~60 px de conteúdo; sem período explícito, comparação ou tendência; clicáveis sem pista visual (só borda no hover) e sem `aria-haspopup="dialog"`. | Média | `pagina-inicio.component.html:27-58`; `pagina-inicio.component.scss:29-61` | 2 |
| P09 | CTA primário sem destaque: mesma forma e tamanho dos KPIs, último na ordem de leitura (canto inferior direito), rótulo de 16 px. | Média | `pagina-inicio.component.html:61-64`; screenshot | 2 |
| P10 | Texto institucional longo (~90 palavras) repetido a cada visita; o mesmo conteúdo (3 etapas, normas) fica mais escaneável como "Como funciona". | Baixa | `cartao-sobre.component.html` | 3 |
| P11 | Falha no resumo esconde também o conteúdo estático (card institucional). | Baixa | `pagina-inicio.component.html:16` | 1A |

#### C. Responsividade

| ID | Problema | Sev. | Evidência | Fase |
|---|---|---|---|---|
| P12 | Mobile: CTA abaixo da dobra (390×844: topo do CTA em y=824; 320×844: y=925) porque o texto institucional (423 px) vem antes. KPIs em grade 2×2 de 177 px quebram rótulos e valores ("GPT-4o ·" / "v3.2.1"). | Alta | medição; `pagina-inicio.component.scss:22-27, 139-144` | 1A, 2 |
| P13 | Selo "ambiente local · dados mockados" some abaixo de 600 px: em demonstração no celular não há aviso de dados fictícios. | Baixa | `app.component.scss:50-53` | 1B |

#### D. Acessibilidade (WCAG 2.1/2.2 AA)

| ID | Problema | Sev. | Evidência | Fase |
|---|---|---|---|---|
| P14 | Contraste de texto abaixo de 4,5:1 (1.4.3), calculado sobre o gradiente na posição do texto: marca do topo (18 px/700) ≈3,9:1; aba ativa ≈4,1:1; aba inativa (branco 85%) ≈3,6:1; rótulo do CTA (branco 90% sobre `#1976d2`) 4,03:1. | Alta | `app.component.scss:20, 30`; `pagina-inicio.component.scss:90` | 1A |
| P15 | Aba ativa sem `aria-current` e indicada só por sublinhado ciano (≈1,9:1 contra o fundo; 1.4.11 pede 3:1). O input `ariaCurrentWhenActive` existe no Router 15.2.9. | Média | `app.component.html:6-7`; `app.component.scss:39` | 1A |
| P16 | Skip-link recarrega a aplicação: `href="#conteudo"` com `<base href="/">` resolve para `/#conteudo`; o navegador faz navegação completa, o Router redireciona e o foco vai para `<body>` (2.4.1). | Média | `app.component.html:1, 12`; `index.html:6`; testado (estado JS perdido, `navigation.type = navigate`) | 1A |
| P17 | Página sem `h1`; o único título é o `h2` "O que é o ConforME?" (1.3.1, 2.4.6). Nenhuma página do app renderiza `h1`: `cf-cabecalho-pagina` só o faz quando recebe `titulo`, e a página executiva não passa. | Média | `pagina-inicio.component.html`; `cf-cabecalho-pagina.component.ts:10, 55` | 2 |
| P18 | Gráfico do diálogo mensal sem alternativa textual: `canvas` sem `role="img"`/`aria-label` e sem tabela equivalente (1.1.1). O README promete isso para todo gráfico. | Média | `dialogo-grafico-mensal.component.html:5`; inspeção no navegador | 1A |
| P19 | Rodapé dentro de `<main>` (não vira landmark `contentinfo`). | Baixa | `pagina-inicio.component.html:69` | 2 |
| P20 | Emojis como logos sem `aria-hidden` (leitor de tela anuncia "círculo verde", "cérebro"). Componente hoje ocioso; relevante se reaproveitado. | Baixa | `dialogo-configuracao.component.html:9`; `dialogo-configuracao.component.ts:30-37` | 2 |
| P21 | pt-BR incompleto: a leitura assistiva da variação usa `toFixed(1)` ("12.5 por cento"); o custo do benchmark aparece como "$1.24" em vez de "US$ 1,24". | Baixa | `cf-kpi.component.ts:83`; `dialogo-modelo-llm.component.html:31` | 1A |

#### E. Restrições, manutenção e performance

| ID | Problema | Sev. | Evidência | Fase |
|---|---|---|---|---|
| P22 | Cores literais fora de `_paleta.scss`: 13 ocorrências de `#fff`/`rgba()` no shell e na Home; `cf-skeleton` usa `#f5f7f8` (fora da paleta); `cf-kpi` lê a custom property direto, sem o `LeitorPaletaService`. | Média | `app.component.scss:20,30,38,39,47`; `faixa-saudacao.component.scss:6-7`; `pagina-inicio.component.scss:72,90,98`; `dialogo-configuracao.component.scss:40`; `cf-skeleton.component.ts:13`; `cf-kpi.component.ts:92-94` | 1A |
| P23 | `LeitorPaletaService`: valores de reserva divergem dos tokens (aprovada `#002bab` × `#3f5fc9`; reprovada `#c62828` × `#cc6363`; linha `#93aede` × `#c9a13c`) e o cache permanente impede troca de tema em tempo de execução. | Baixa | `leitor-paleta.service.ts:16, 41-44` | 1A |
| P24 | Código ocioso: `PainelAtalhos`, `PainelConfiguracao`, `CartaoCuriosidade` e `DialogoConfiguracao` declarados e nunca renderizados; `insights.ts`, `periodo-recente.ts` e `dataPorExtenso` sem uso; `anchorScrolling` justificado por um link "Como funciona" que não existe mais. O tree-shaking do Ivy os remove do bundle de produção, mas confundem manutenção e documentação. | Baixa | `inicio.module.ts:31-41`; `app-routing.module.ts:31-34`; busca no build | 2, 3, 4 (D13) |
| P25 | Documentação divergente: README §Home descreve KPIs, atalhos e insight que não estão na tela; README cita 163 specs e `implementation-page.md` cita 127 (reais: 177); README afirma que os mocks são iguais a cada execução, mas eles dependem da data. | Baixa | `README.md:47-55, 100-103, 244-246` | 4 |
| P26 | Lint não configurado (sem ESLint e sem target `lint`), mas a Etapa 2 pede lint ao fim de cada fase. | Média | `angular.json`; `package.json` | 1A (D10) |
| P27 | Primeira carga da Home ≈234 kB transferidos: inicial 118 kB + chunk compartilhado 109 kB (Chart.js completo, porque `ng2-charts@4.1.1` executa `Chart.register(...registerables)`, e Material Dialog) + 6 kB da feature, embora hoje o gráfico só apareça após clique. Fontes via Google Fonts bloqueiam a renderização e dependem de rede externa (se falharem, ícones aparecem como texto "arrow_forward"). Em modo mock a Home baixa `pecas.mock.json` (450 kB) para montar o resumo (só em desenvolvimento). | Baixa | Anexo B; `index.html:12-15`; `inicio-mock.service.ts:33-35` | 2 (sparklines passam a usar o Chart.js já carregado) |
| P28 | PWA: manifest sem ícones e com `theme_color #0033A0` (fora da paleta), diferente do `<meta name="theme-color" content="#1976d2">`. | Baixa | `manifest.webmanifest:4, 9`; `index.html:8` | 4 |
| P29 | Topo não fixo (`position: static`): a navegação some ao rolar, o que pesa quando a Home ganhar seções. | Baixa | `app.component.scss:14-23` | 1B |

**Totais:** 5 Altas, 11 Médias, 13 Baixas.

---

## 2. Aderência às restrições técnicas

| # | Restrição | Status | Observações | Ação |
|---|---|---|---|---|
| 1 | Chart.js 4.4.9 + ng2-charts 4.1.1, sem outra lib | Atende | Versões fixas (`package.json:34, 38`); nenhuma outra lib de gráfico. `ng2-charts` registra todos os componentes do Chart.js, então sparklines novos não aumentam o bundle. | Manter |
| 2 | Estado só com serviços RxJS (`BehaviorSubject` + `combineLatest`), sem NgRx | Atende | `InicioStore` com `BehaviorSubject` + `switchMap` + `shareReplay`; container com `combineLatest`. | Novos recursos no mesmo store |
| 3 | Serviço abstrato com Mock e HTTP alternados por flag; sem HTTP em componentes | Atende, com ressalva | `InicioService` abstrato; troca em `inicio.module.ts:52-57` por `environment.usarMock`; nenhum componente injeta `HttpClient`. Ressalva: gerador de mocks fora de sincronia com o contrato (P03). | 1A: sincronizar gerador e criar spec de contrato |
| 4 | Stale-while-revalidate (`atualizando` + `scan`), sem flashing, skeleton só na 1ª carga | Parcial | Implementado em `core/models/recurso.model.ts` e usado em Gráficos Executivos. `InicioStore` não aplica (justificado no código: só recarrega após erro); skeleton só na 1ª carga atende hoje. Qualquer recarga nova exigirá `manterDadoAnterior()`. | 2: aplicar em `resumo$`; 3: no novo recurso |
| 5 | Sem hex hardcoded; `LeitorPaletaService` e `_paleta.scss`; manter paleta | Parcial | Gráficos atendem. Há literais em SCSS do shell e da Home, `#f5f7f8` no skeleton, `cf-kpi` sem o serviço, reservas divergentes e `#0033A0` no manifest (P22, P23, P28). | 1A: aliases semânticos com os mesmos valores; nenhuma cor nova |
| 6 | Rótulos de gráfico só se ≥ 18 px renderizados (`getProps()`) | Atende (não se aplica à Home hoje) | Regra implementada no gráfico de correlação. A Home não imprime rótulos (diálogo sem datalabels; sparkline decorativo). | Vale para qualquer rótulo novo na Home |
| 7 | Cross-filter: substitui dentro da dimensão, AND entre dimensões | Atende (não se aplica à Home) | Implementado no store executivo. Atalhos da Home devem gerar query params com uma chave por dimensão (ex.: `?risco=COMPLIANCE`). | 3: atalhos compatíveis |
| 8 | Markdown de LLM em 3 camadas | Atende (não se aplica à Home hoje) | `MarkdownService`: `markdown-it({ html: false })` → DOMPurify com allowlist → `DomSanitizer`. | 3: "Últimas análises" só com texto plano; HTML só via `MarkdownService` |
| 9 | Português BR em tudo | Parcial | `LOCALE_ID`, `MatPaginatorIntl` e cabeçalho de calendário (dia→mês→ano→dia) em pt-BR atendem. Lacunas na leitura assistiva e na moeda (P21). | 1A |
| 10 | Angular Material como base | Atende | Tema Material 15.2.9 (MDC); `MatDialog`, `MatButton`, `MatIcon`. Tiles e CTA são HTML próprio. | 2: CTA com `mat-flat-button` |

---

## 3. Plano de melhorias por fases

**Princípios válidos para todas as fases**

- Paleta mantida: nenhum valor de cor novo, só aliases semânticos com valores já usados.
- Componentes novos `standalone` + `OnPush`, importados no `InicioModule` (convivem com o chassi baseado em NgModule).
- Sem dependência de runtime nova: Material, CDK e Chart.js já estão instalados.
- Gráficos Executivos não muda, exceto pelo shell compartilhado (navegação) e pelos stubs listados em D18.
- Gate de cada fase: `ng build --configuration production` dentro dos budgets, lint (D10) e `ng test` verdes, com specs dos componentes novos e do serviço Mock.

**Esforço** (1 pessoa, com testes): **P** ≈ até 1 dia · **M** ≈ 2–3 dias · **G** ≈ 4–6 dias.

### Visão geral

| Fase | Foco | Esforço | Risco | Depende de | Entrega isolada? |
|---|---|---|---|---|---|
| 1A | Fundações: correções, tokens, acessibilidade base, layout base | M | Baixo | D10, D11, D16, D18 | Sim |
| 1B | Navegação moderna no shell | M (G com tema) | Médio | D1 (+ D6, D7, D8); ideal após 1A | Sim |
| 2 | Hero e bento de KPIs | G | Médio | 1A; D2, D3, D14, D15, D17 | Sim, após 1A |
| 3 | Como funciona, últimas análises e atalhos | G | Médio-alto | 2; D4, D5, D9 | Parcial |
| 4 | Polimento, auditoria e testes | M | Baixo | 2, 3 (e 1B, se aprovada); D12, D13 | Não (fecha o ciclo) |

### Fase 1A — Fundações (correções e base)

**Objetivo e valor:** eliminar bugs e falhas de acessibilidade que existem hoje e preparar tokens e layout para o redesenho, sem depender do chassi. O usuário ganha topo e CTA legíveis, skip-link funcional, CTA visível no celular e uma Home sem blocos esticados.

**Melhorias**

1. Mocks: sincronizar `tools/gerar-mocks.js` com o contrato (`versao`, `dataLancamento`, `logo`; modelos alinhados a `benchmark-gemini.ts`) e restaurar a configuração (D11). Spec de contrato que valida o JSON gerado contra o DTO.
2. Tile "Modelo LLM": nunca habilitado sem ação. Sem modelo elegível, fica desabilitado com texto explicativo (correção mínima; o redesenho vem na Fase 2).
3. Skip-link: focar `#conteudo` (`tabindex="-1"`) sem navegação.
4. Abas: `ariaCurrentWhenActive="page"`, texto 100% branco e indicador ativo branco de 3 px (≥ 3:1).
5. Contraste do topo: aplicar a mesma sobreposição escura que a faixa da Home já usa (`rgba(0, 0, 0, .15)`), levando o branco a ≈5,0:1 no início do gradiente; rótulo do CTA em branco 100% (4,61:1). Alternativa visual em D16.
6. Tokens: aliases em `_paleta.scss` com valores existentes (ex.: `--cf-texto-inverso: #ffffff`, `--cf-sobreposicao-escura: rgba(0, 0, 0, .15)`, `--cf-realce-inverso: rgba(255, 255, 255, .18)`); substituir os 13 literais; skeleton com `--cf-borda-suave`/`--cf-fundo`; reservas do `LeitorPaletaService` iguais aos tokens.
7. Layout base: remover `min-height` + `flex: 1` + linhas `1fr` que esticam blocos; grade de 12 colunas com `align-items: start`; no mobile, KPIs e CTA antes do texto institucional; conteúdo estático fora do `*ngIf` de erro.
8. Diálogo mensal acessível: `role="img"` + `aria-label` gerado a partir dos dados + tabela alternativa (`.tabela-alternativa-grafico`); mês corrente rotulado "(parcial)".
9. pt-BR: `Intl.NumberFormat('pt-BR')` na leitura assistiva da variação; moeda com `currency: 'USD' : 'symbol' : '1.2-2' : 'pt-BR'`.
10. Lint conforme D10.

**Arquivos**

- Alterar: `tools/gerar-mocks.js`; `src/app/app.component.html`, `.scss`; `src/styles/_paleta.scss`; `src/app/core/services/leitor-paleta.service.ts`; `src/app/shared/chassi/cf-kpi/cf-kpi.component.ts` e `src/app/shared/chassi/cf-skeleton/cf-skeleton.component.ts` (D18); `features/inicio/containers/pagina-inicio/pagina-inicio.component.ts`, `.html`, `.scss`; `features/inicio/components/faixa-saudacao/faixa-saudacao.component.scss`; `features/inicio/components/dialogo-grafico-mensal/*`; `features/inicio/components/dialogo-modelo-llm/dialogo-modelo-llm.component.html`; `features/inicio/components/dialogo-configuracao/dialogo-configuracao.component.scss`; `README.md` (seção de mocks).
- Criar: `src/app/app.component.spec.ts`; `src/app/core/services/leitor-paleta.service.spec.ts`; `features/inicio/data/configuracao-mock.contrato.spec.ts`; configuração de lint, se D10 = a.

**Esforço e risco:** M · Baixo (mudanças locais, sem contrato novo).

**Dependências:** nenhuma fase. Decisões D10, D11, D16 e D18.

**Critérios de aceite**

- [ ] Rodar `npm start` duas vezes seguidas mantém `logo` e `versao` em `configuracao.mock.json`; a spec de contrato falha se o gerador perder um campo do DTO.
- [ ] Nenhum botão da Home fica habilitado sem ação (spec com configuração sem modelo elegível).
- [ ] Skip-link: Tab + Enter mantém o estado da página (sem recarga) e deixa `document.activeElement.id === 'conteudo'`.
- [ ] Aba ativa com `aria-current="page"` (spec); indicador com ≥ 3:1 contra o fundo.
- [ ] Todo texto do topo e do CTA com ≥ 4,5:1 (cálculo registrado no PR e axe sem violações `color-contrast`).
- [ ] `grep -rnE "#[0-9a-fA-F]{3,8}\b|rgba?\(" src/app --include='*.scss'` sem ocorrências (cores só em `_paleta.scss`).
- [ ] 1440×900 e 768×1024: nenhum card com mais de 48 px vazios abaixo do conteúdo (medição JS).
- [ ] 390×844: CTA inteiro acima da dobra (`getBoundingClientRect().bottom ≤ 844`).
- [ ] Diálogo mensal expõe `role="img"`, `aria-label` e tabela; mês corrente marcado "(parcial)" (spec).
- [ ] Build de produção dentro dos budgets; 177 testes anteriores + novos verdes.

**Impacto em performance:** neutro (CSS e HTML); o skip-link deixa de recarregar a SPA.
**Impacto em acessibilidade:** resolve 1.4.3 (topo e CTA), 1.4.11 (aba ativa), 2.4.1 (skip-link), 4.1.2 (`aria-current`) e 1.1.1 (gráfico do diálogo).

### Fase 1B — Navegação moderna (shell) — condicionada a D1

**Objetivo e valor:** navegação mais rápida e orientada: topo sempre visível, página atual evidente, acesso por teclado a qualquer destino e identificação do usuário.

**Melhorias**

1. Topo fixo (`position: sticky`) com `backdrop-filter: blur()` sobre fundo semitransparente da própria paleta, com `@supports` e fallback sólido; `scroll-padding-top` para o foco nunca ficar escondido (WCAG 2.2, 2.4.11).
2. Indicador animado da aba ativa (via `transform`; sem animação com `prefers-reduced-motion`).
3. Menu do usuário com `@angular/cdk/menu` (já presente no CDK 15): nome, perfil e ambiente. "Sair" depende do SSO (stub).
4. Paleta de comandos com Ctrl/Cmd+K: CDK Overlay + `ActiveDescendantKeyManager`, padrão ARIA combobox/listbox; comandos registrados por feature num `ComandosService` em `core/` (portável); componente carregado sob demanda (import dinâmico).
5. Transição de rota curta (fade de 150 ms com `@angular/animations`, desligada com reduced-motion).
6. Selo de ambiente compacto também no mobile (P13).
7. Condicionados: tema escuro (D6), breadcrumbs (D8), atalho "/" (D7).

**Arquivos**

- Alterar: `src/app/app.component.ts`, `.html`, `.scss`; `src/app/app.module.ts`; `src/styles.scss` (`scroll-padding-top`).
- Criar: `src/app/core/comandos/comandos.service.ts` (+ spec); `src/app/shared/paleta-comandos/paleta-comandos.component.ts`, `.html`, `.scss` (+ spec); `src/app/shared/menu-usuario/menu-usuario.component.ts`, `.html`, `.scss` (+ spec).

**Esforço e risco:** M (G com tema escuro) · Médio: o shell será descartado na integração com o chassi (`app.component.ts:7-10` e README), e atalhos podem colidir com o navegador.

**Dependências:** D1 (obrigatória); D6, D7 e D8 para os itens condicionados; idealmente após 1A (tokens e contraste do topo).

**Critérios de aceite**

- [ ] Ctrl+K (Windows/Linux) e Cmd+K (macOS) abrem a paleta em qualquer página; Esc fecha e devolve o foco ao elemento de origem.
- [ ] Setas navegam, Enter executa e o leitor de tela anuncia a opção ativa (`aria-activedescendant`); o atalho é ignorado com foco em `input`, `textarea` ou `[contenteditable]`.
- [ ] Topo visível após rolar 1000 px; nenhum elemento focado fica sob o topo (Tab por toda a página).
- [ ] Indicador da aba anima em até 200 ms e não anima com `prefers-reduced-motion: reduce` (spec com `matchMedia` simulado).
- [ ] Menu do usuário operável só com teclado, exibindo nome e perfil.
- [ ] Bundle inicial cresce no máximo 15 kB transferidos em relação à referência (118 kB).

**Impacto em performance:** paleta carregada sob demanda; CDK Menu é leve; o blur tem custo de composição aceitável num elemento de 56 px.
**Impacto em acessibilidade:** positivo se os padrões ARIA forem seguidos; o risco do 2.4.11 é mitigado com `scroll-padding-top`.

### Fase 2 — Hero e KPIs

**Objetivo e valor:** em poucos segundos o usuário entende o que é o ConforME, quanto foi analisado e o que fazer a seguir; a ação principal fica visível em qualquer tela.

**Melhorias**

1. Hero compacto (~160 px no desktop) no lugar da faixa: rótulo "BV · Riscos Não Financeiros", `h1` com saudação dinâmica (`saudacaoPorHora` + primeiro nome), data por extenso (`dataPorExtenso`, hoje ociosa), chip de perfil e proposta de valor em 1–2 linhas.
2. CTAs: primário `mat-flat-button` "Avaliar peça" (destino D2) e secundário `mat-stroked-button` "Ver Gráficos Executivos"; link "Como funciona" (âncora da Fase 3). No mobile, botões de largura total e 48 px de altura.
3. Bento de KPIs (D14): "Análises em {ano}" (destaque, ocupa 2 linhas), "Taxa de conformidade", "Tempo médio por peça" e "Pipeline de IA" (substitui "Modelo LLM e versão" e abre o `DialogoConfiguracaoComponent` reaproveitado, sem emojis).
4. Sparklines com Chart.js só com meses fechados (evita a falsa queda do mês parcial) e variação ▲/▼ na base definida em D3; taxas em **pontos percentuais**; `altaEhRuim` no tempo médio; seta acompanhada de texto para leitor de tela.
5. Count-up: diretiva própria (`requestAnimationFrame` fora da zona do Angular, `Intl.NumberFormat('pt-BR')`), só na primeira carga; com `prefers-reduced-motion` o valor final aparece direto; o leitor de tela recebe só o valor final.
6. KPIs clicáveis com pista visível ("Ver mês a mês") e `aria-haspopup="dialog"`, usando um botão esticado sobre o card (HTML válido, área de clique inteira).
7. Store: `manterDadoAnterior()` em `resumo$`; recarga esmaece o conteúdo sem skeleton.
8. Fim das duplicações: marca da faixa e rodapé repetido saem; rodapé de uma linha fora do `<main>`.

**Arquivos**

- Criar (standalone): `features/inicio/components/hero-inicio/*`; `features/inicio/components/tile-kpi/*` (D15); `features/inicio/components/grade-kpis/*`; `features/inicio/diretivas/contagem.directive.ts`; `features/inicio/models/variacao.ts`. Todos com spec.
- Alterar: `containers/pagina-inicio/*`; `state/inicio.store.ts`; `data/inicio-mock.service.ts` (+ spec); `components/dialogo-configuracao/*` (sem emojis, `aria-hidden`); `inicio.module.ts`; `models/inicio.dto.ts` e `data/inicio-http.service.ts` só se D3 pedir campo novo.
- Remover: `components/faixa-saudacao/*` (substituído pelo hero).

**Esforço e risco:** G · Médio (D2 e D3 definem comportamento; campo novo no BFF se D3 = b ou c).

**Dependências:** 1A; D2, D3, D14, D15, D17.

**Critérios de aceite**

- [ ] 1440×900: hero, 4 KPIs e os dois CTAs visíveis sem rolagem. 390×844: CTA primário inteiro acima da dobra.
- [ ] Exatamente um `h1`; hierarquia de títulos sem saltos.
- [ ] CTA primário com contraste ≥ 4,5:1 e destino conforme D2 (spec de rota); secundário navega para `/graficos-executivos`.
- [ ] Cada KPI: valor em pt-BR, sparkline com ≥ 2 meses fechados, variação com seta e texto acessível; taxas em p.p.; tempo médio com `altaEhRuim` (specs de `variacao.ts` cobrindo divisão por zero e janeiro sem mês anterior no ano).
- [ ] Count-up: com reduced-motion o valor final aparece no primeiro frame; não reanima em recarga (specs).
- [ ] Recarga mantém os dados visíveis com `atualizando` (spec do store); skeleton só na primeira carga.
- [ ] "Pipeline de IA" abre o diálogo com todos os modelos (spec); nenhum botão habilitado sem ação.
- [ ] Nenhuma cor literal nos arquivos novos; build e testes verdes.

**Impacto em performance:** Chart.js já está no chunk que a Home carrega (custo zero de biblioteca); 4 sparklines sem animação e sem eventos; contagem fora da zona (nenhum ciclo de change detection por frame); estimativa de +5–8 kB transferidos.
**Impacto em acessibilidade:** `h1`, CTA claro, variação textual, sparklines com `aria-hidden` e dados completos no diálogo acessível.

### Fase 3 — Como funciona, atividade recente e atalhos

**Objetivo e valor:** explicar o processo em segundos (em vez de 3 parágrafos), mostrar o que aconteceu recentemente e levar a análises comuns com um clique.

**Melhorias**

1. "Como funciona" (`#como-funciona`): Triagem → Análise de conformidade → Revisão cruzada em `<ol>` semântica (não `mat-stepper`, feito para fluxos interativos), horizontal no desktop e vertical no mobile; modelo e participação de cada etapa vindos de `configuracao.modelos[].papel`; chips CMN, SUSEP, FEBRABAN e Políticas internas, com texto validado por Compliance (D9).
2. Texto institucional vira "Saiba mais sobre o ConforME" em `<details>` nativo (sem JavaScript).
3. "Últimas análises": 5 peças (id, produto, data relativa em `<time datetime>`, status com texto e ícone nos tokens existentes `--cf-aprovado`, `--cf-reprovado` e `--cf-inconclusivo-forte`); "Ver todas" leva ao relatório analítico; recurso próprio no store com `manterDadoAnterior()` e `cf-card` nos 4 estados; parecer só como texto plano truncado.
4. Atalhos rápidos: reaproveitar `PainelAtalhosComponent` + `ultimosDias()` ("Últimos 30 dias", "Risco de Compliance", "Relatório analítico", "Avaliar peça"), com query params compatíveis com o cross-filter.
5. Opcional: "Você sabia?" com `CartaoCuriosidadeComponent` + `insights.ts`, corrigindo a comparação com mês parcial.

**Arquivos**

- Criar (standalone): `features/inicio/components/como-funciona/*`; `features/inicio/components/ultimas-analises/*`. Ambos com spec.
- Alterar: `models/inicio.dto.ts` (`UltimaAnaliseDto`); `data/inicio.service.ts` (`carregarUltimasAnalises(limite)`, D5); `data/inicio-mock.service.ts` (deriva de `pecas.mock.json`, que já tem `id`, `produto`, `resultado` e `dataAvaliacao`); `data/inicio-http.service.ts` (endpoint de D5); `state/inicio.store.ts`; `containers/pagina-inicio/*`; `components/painel-atalhos/*`; `components/cartao-sobre/*`; `inicio.module.ts`; specs dos serviços Mock e HTTP.

**Esforço e risco:** G · Médio-alto (contrato novo no BFF, status "Ajustes" indefinido, conteúdo regulatório).

**Dependências:** Fase 2 (hero com âncora e grade); D4, D5, D9. "Como funciona", "Saiba mais" e atalhos não dependem de contrato e podem ser antecipados junto com a Fase 2 se D9 estiver resolvida.

**Critérios de aceite**

- [ ] O link "Como funciona" do hero rola até a seção e move o foco para o título, sem recarregar.
- [ ] Etapas em `<ol>` na ordem correta; vertical abaixo de 600 px; chips com texto (não só cor).
- [ ] Últimas análises: 5 itens em ordem decrescente de data; 4 estados via `cf-card`; recarga com `atualizando`, sem skeleton (specs).
- [ ] Mock: `carregarUltimasAnalises(5)` devolve as 5 peças mais recentes (spec); HTTP chama o endpoint de D5 com `limite` (spec com `HttpTestingController`).
- [ ] Parecer contendo `<script>` ou `onerror` aparece como texto plano na lista (spec).
- [ ] Atalhos geram uma chave por dimensão e período `de`/`ate`/`granularidade` válido (spec).
- [ ] Chips de status com contraste ≥ 4,5:1 e rótulo textual.

**Impacto em performance:** +1 requisição (nenhuma se D5 = b); `<details>` sem JavaScript; estimativa de +6–10 kB transferidos.
**Impacto em acessibilidade:** estrutura de lista, status textual, foco gerenciado na âncora e `<time>` com data absoluta.

### Fase 4 — Polimento, acessibilidade e testes

**Objetivo e valor:** garantir que tudo funcione em todas as larguras, com teclado e leitor de tela, e deixar código e documentação prontos para o port ao chassi.

**Melhorias**

1. Auditoria com axe (extensão do navegador) e Lighthouse (DevTools) em 320, 390, 768, 1024, 1440 e 1920 px, com correções.
2. Microinterações (hover, foco e transição de rota, se a 1B não entrar), sempre respeitando reduced-motion.
3. Testes: completar specs de componentes, diretiva, store e serviços Mock e HTTP; cobertura ≥ 80% nos arquivos novos (`npm run test:ci` já gera cobertura).
4. Remover o código ocioso não reaproveitado (D13) e o comentário obsoleto de `anchorScrolling`.
5. Standalone (D12): migrar a feature com `ng g @angular/core:standalone` (disponível no 15.2.9), mantendo a troca Mock↔HTTP num único provider de rota.
6. PWA: ícones no manifest e `theme_color` alinhado à paleta (P28).
7. Documentação: README (Home atual, número real de testes, mocks dependentes da data) e guia de alternância Mock↔HTTP.

**Arquivos:** specs (`*.spec.ts`); `features/inicio/**` (limpeza e standalone); `inicio.module.ts` ou novo `inicio.routes.ts`; `app-routing.module.ts` (se a rota passar a carregar rotas standalone); `src/manifest.webmanifest`; `README.md`.

**Esforço e risco:** M · Baixo.

**Dependências:** Fases 2 e 3 (e 1B, se aprovada); D12, D13.

**Critérios de aceite**

- [ ] axe: zero violações sérias ou críticas na Home nas 6 larguras.
- [ ] Lighthouse mobile da Home: Acessibilidade ≥ 95 e Boas práticas ≥ 95.
- [ ] Navegação completa só com teclado: ordem lógica, foco visível, nenhuma armadilha de foco.
- [ ] Cobertura ≥ 80% de linhas nos arquivos novos.
- [ ] Build de produção sem aviso de budget; README com a contagem real de testes.

**Impacto em performance:** neutro ou melhor (código ocioso sai também do build de desenvolvimento).
**Impacto em acessibilidade:** validação final de conformidade AA.

---

## 4. Wireframes (ASCII)

Valores ilustrativos. **Desktop (≥ 1200 px):**

```
┌────────────────────────────────────────────────────────────────────────────────────────────┐
│ ConforME   Início   Gráficos Executivos        [ Buscar...  Ctrl+K ]  [LOCAL·MOCK]  (VF v) │  <- topo sticky + blur (Fase 1B)
│            ======                                                                          │  <- indicador da aba ativa (branco, aria-current)
└────────────────────────────────────────────────────────────────────────────────────────────┘
┌────────────────────────────────────────────────────────────────────────────────────────────┐
│ BV · RISCOS NÃO FINANCEIROS                                  segunda-feira, 5 de outubro   │  <- HERO (Fase 2), ~160 px
│ Bom dia, Vinicius                                            [ Perfil: Compliance ]        │  <- h1
│ Avalie peças de comunicação antes da veiculação: conformidade com CMN, SUSEP, FEBRABAN     │  <- proposta de valor (1-2 linhas)
│ e políticas internas, com parecer gerado por IA.                                           │
│                                                                                            │
│ [ Avaliar peça  -> ]   [ Ver Gráficos Executivos ]      Como funciona  v                   │  <- CTA primário (D2) + secundário + âncora
└────────────────────────────────────────────────────────────────────────────────────────────┘
┌──────────────────────────────────────────┬───────────────────────┬─────────────────────────┐  <- BENTO DE KPIs (Fase 2)
│ Análises em 2026                         │ Taxa de conformidade  │ Tempo médio por peça    │
│ 354                                      │ 70,7 %                │ 33 s                    │
│ ▲ 8,2 % vs. ago/26 (mês fechado, D3)     │ ▼ 1,1 p.p.            │ ▲ 2 s  (alta = ruim)    │
│    /\      /\   _/^\                     │  ^\_/^\__             │  __/^\__/               │  <- sparklines Chart.js (só meses fechados)
│ __/  \____/  \_/    \__                  ├───────────────────────┴─────────────────────────┤
│                                          │ Pipeline de IA                                  │  <- substitui "Modelo LLM e versão"
│                     Ver mês a mês  ->    │ 3 modelos · prompt v3.2.1     Ver detalhes ->   │  <- abre diálogo (acessível)
└──────────────────────────────────────────┴─────────────────────────────────────────────────┘
┌────────────────────────────────────────────────────────────────────────────────────────────┐
│ Como funciona                                                               #como-funciona │  <- Fase 3, <ol> semântica
│ (1) Triagem  ---------------->  (2) Análise de conformidade -> (3) Revisão cruzada         │
│     extração de texto               normas e políticas internas    parecer final           │
│     GPT-4o · 38 %                   Claude Sonnet · 46 %           Gemini · 16 %           │  <- de configuracao.modelos[].papel
│ Referências: [CMN] [SUSEP] [FEBRABAN] [Políticas internas]   Saiba mais sobre o ConforME v │  <- chips (D9) + <details>
└────────────────────────────────────────────────────────────────────────────────────────────┘
┌──────────────────────────────────────────────────────────────┬─────────────────────────────┐  <- Fase 3
│ Últimas análises                              Ver todas ->   │ Atalhos rápidos             │
│ PC-10957  Cartão de Crédito   há 2 h         [Aprovada]      │ > Últimos 30 dias           │
│ PC-10956  Seguros             há 5 h         [Reprovada]     │ > Risco de Compliance       │
│ PC-10955  Consignado          ontem, 16:40   [Ajustes?] (D4) │ > Relatório analítico       │
│ PC-10954  Investimentos       ontem, 11:02   [Aprovada]      │ > Avaliar peça (D2)         │
│ PC-10953  Crédito Pessoal     03/10, 09:15   [Reprovada]     │                             │
└──────────────────────────────────────────────────────────────┴─────────────────────────────┘
  BV · Riscos Não Financeiros · ConforME                         <- rodapé de 1 linha, sem duplicar a marca
```

**Tablet (768 px):** mesma ordem do desktop em 8 colunas; hero e "Análises" em largura total, demais KPIs em 2×2 e "Atalhos" abaixo de "Últimas análises".

**Mobile (390 px):**

```
┌──────────────────────────────────┐
│ ConforME  Início  Gráficos Exec. │  <- topo sticky, 56 px; busca e perfil no menu (VF)
├──────────────────────────────────┤
│ BV · RISCOS NÃO FINANCEIROS      │  <- HERO
│ Bom dia, Vinicius                │  <- h1
│ Avalie peças antes da veiculação,│
│ com parecer por IA.              │
│ [        Avaliar peça  ->      ] │  <- CTA largura total, 48 px, topo em ~y=190 (hoje y=824)
│ [   Ver Gráficos Executivos    ] │
│ Como funciona  v                 │
├──────────────────────────────────┤
│ Análises em 2026                 │  <- KPI destaque em largura total
│ 354   ▲ 8,2 % vs. ago/26         │
│  __/\__/\_/^\__                  │
├────────────────┬─────────────────┤
│ Conformidade   │ Tempo médio     │
│ 70,7 %         │ 33 s            │
│ ▼ 1,1 p.p.     │ ▲ 2 s           │
├────────────────┴─────────────────┤
│ Pipeline de IA · 3 modelos    >  │
├- - - - - dobra (390x844) - - - - ┤  <- fim da 1ª tela
│ Como funciona                    │  <- lista vertical
│ (1) Triagem                      │
│  |  extração de texto            │
│ (2) Análise de conformidade      │
│  |  normas e políticas internas  │
│ (3) Revisão cruzada              │
│     parecer final                │
│ [CMN] [SUSEP] [FEBRABAN]         │
│ [Políticas internas]             │
│ Saiba mais  v                    │
├──────────────────────────────────┤
│ Últimas análises     Ver todas > │
│ PC-10957 · Cartão de Crédito     │
│ há 2 h               [Aprovada]  │
│ PC-10956 · Seguros               │
│ há 5 h              [Reprovada]  │
├──────────────────────────────────┤
│ Atalhos rápidos                  │
│ > Últimos 30 dias                │
│ > Risco de Compliance            │
└──────────────────────────────────┘
```

---

## 5. Riscos e decisões em aberto

### 5.1 Decisões que dependem de você

| ID | Pergunta | Opções | Recomendação | Bloqueia |
|---|---|---|---|---|
| D1 | O topo/menu é um shell provisório que o README manda descartar na integração com o chassi (`@arqt/ng15-framework`). Investimos em navegação nele? | a) 1B completa no shell · b) Só peças portáveis (paleta de comandos e `ComandosService`) · c) Pular a 1B | b | 1B |
| D2 | Para onde vai "Avaliar peça"? Hoje leva a Gráficos Executivos. | a) URL ou rota do fluxo real de avaliação (qual?) · b) Rota provisória `/avaliar` com estado "em breve" · c) Ocultar até existir e promover "Ver Gráficos Executivos" a primário | a, se a URL existir; senão b | 2 |
| D3 | Base do ▲/▼ dos KPIs. Comparar mês parcial com mês cheio distorce (em 05/10 mostraria queda de ~80%). | a) Último mês fechado × anterior (sem mudar contrato) · b) Mês até hoje × mesmo intervalo do mês anterior (campo novo no BFF) · c) Acumulado do ano × mesmo período do ano anterior (campo novo) | a agora; c quando o BFF tiver | 2 |
| D4 | "Ajustes" como status: o domínio só tem `APROVADA` e `REPROVADA` (a paleta tem também "Inconclusivo"). | a) "Ajustes" = reprovada com recomendações · b) Novo status no backend · c) Só Aprovada/Reprovada | c até o backend definir | 3 |
| D5 | Fonte das "Últimas análises" e visibilidade por perfil. | a) Novo endpoint `GET /inicio/ultimas-analises?limite=5` · b) Campo `ultimasAnalises` no `ResumoInicioDto` · c) Reusar `/graficos-executivos/analitico` (acopla as features) | a; confirmar se o perfil Marketing pode ver peças de todos os produtos | 3 |
| D6 | Tema escuro: exige tokens escuros que não existem (conflita com "manter a paleta"), tema Material escuro (+ CSS) e mudanças nos gráficos de Gráficos Executivos (cache do `LeitorPaletaService`). | a) Não fazer agora · b) Design fornece tokens escuros e validamos contraste · c) Só respeitar `prefers-contrast` | a | 1B, 4 |
| D7 | Atalho "/" para a paleta: atalho de tecla única exige poder desligar ou remapear (WCAG 2.1.4, nível A) e colide com a busca rápida do Firefox. | a) Só Ctrl/Cmd+K · b) "/" com opção de desligar | a | 1B |
| D8 | Breadcrumbs: com duas páginas irmãs, sugerem uma hierarquia que não existe. | a) Adiar até haver nível 2 (ex.: detalhe da peça) · b) Fazer agora | a | 1B |
| D9 | Quem valida o texto regulatório (chips e etapas)? Citar normas específicas (ex.: Resolução CMN 4.949, já citada nos pareceres)? | — | Compliance valida; chips genéricos até lá | 3 |
| D10 | Lint não existe no projeto. | a) Adicionar `@angular-eslint` 15.x como devDependency (requer homologação?) · b) Usar `tsc --noEmit` + `strictTemplates` como gate | a, se a homologação permitir | 1A |
| D11 | Restaurar `configuracao.mock.json` a partir de `dist/` e corrigir o gerador? | a) Sim (cópia + ajuste no gerador) · b) Só corrigir o gerador | a | 1A |
| D12 | Standalone: migrar a Home inteira ou só os componentes novos? | a) Só os novos (Fases 2 e 3) · b) Migrar a feature na Fase 4 | b, se o chassi aceitar rotas standalone | 4 |
| D13 | A Home anterior (KPIs com sparkline, atalhos, configuração e insight — `design/Main.dc.html`) foi simplificada por decisão de negócio? | a) Reaproveitar os componentes ociosos · b) Removê-los | a, salvo restrição de negócio | 2, 3, 4 |
| D14 | Quais KPIs entram no bento? | Proposta: Análises no ano, Taxa de conformidade, Tempo médio, Pipeline de IA | Proposta | 2 |
| D15 | KPI da Home: componente próprio ou extensão do stub `cf-kpi`? | a) `ini-tile-kpi` próprio (não toca Gráficos Executivos) · b) Estender `cf-kpi` (afeta a outra página e o mapeamento para `<bv-indicador>`) | a | 2 |
| D16 | Visual do topo. | a) Manter a faixa azul com sobreposição escura (≥ 4,5:1) · b) Topo claro translúcido com blur e texto `--cf-texto` | a (menor ruptura de marca) | 1A, 1B |
| D17 | Primeiro nome do usuário no `h1`: aceitável em telas compartilhadas e apresentações? Qual claim do JWT traz o nome? | — | Manter o primeiro nome | 2 |
| D18 | Posso ajustar stubs compartilhados (`cf-kpi`, `cf-skeleton`, reservas do `LeitorPaletaService`)? O efeito em Gráficos Executivos é invisível (pt-BR na leitura assistiva, token equivalente no skeleton). | a) Sim · b) Não (correções ficam só na Home) | a | 1A |

### 5.2 Riscos

| ID | Risco | Probabilidade | Impacto | Mitigação |
|---|---|---|---|---|
| R1 | Retrabalho no port para o chassi (shell e stubs `cf-*` serão trocados) | Alta | Médio | 1B mínima e portável (D1); componentes da Home sem dependência do shell; stubs sem contrato novo (D15) |
| R2 | Contrato do BFF não acompanha (variação, últimas análises) | Média | Médio | Campos opcionais; UI degrada para "—"; mock como especificação executável, padrão já usado no projeto |
| R3 | Texto regulatório impreciso | Média | Alto | Validação de Compliance antes do merge (D9) |
| R4 | Tema escuro conflita com "manter a paleta" e exige mexer em Gráficos Executivos | Alta (se D6 = b) | Alto | Adiar (D6) |
| R5 | Atalhos de teclado colidem com navegador ou leitor de tela | Média | Baixo | Só Ctrl/Cmd+K; ignorar em campos editáveis (D7) |
| R6 | Animações prejudicam acessibilidade ou disparam change detection | Baixa | Médio | Reduced-motion, `requestAnimationFrame` fora da zona, contagem só na primeira carga |
| R7 | Bundle inicial cresce com menu e paleta no shell | Média | Baixo | Import dinâmico da paleta; CDK Menu; budget conferido em cada fase |
| R8 | Números do mock mudam a cada dia (dependem da data) | Alta | Baixo | Critérios de aceite com fixtures de spec, nunca com valores da tela |
| R9 | Gerador de mocks volta a apagar edições manuais | Alta (hoje) | Médio | Gerador como única fonte + spec de contrato (Fase 1A) |

---

## 6. Ordem recomendada e entregas independentes

```
1A ──► 2 ──► 3 ──► 4
 └───► 1B (opcional, após D1) ──┘
```

- **1A primeiro:** resolve 4 das 5 falhas de severidade Alta (P02, P03, P12 e P14), tem risco baixo e não depende de outra fase. Pode ser entregue sozinha.
- **1B** é independente das demais e pode correr em paralelo após a 1A, se D1 = a ou b.
- **2** é entregável sozinha após a 1A e responde à maior parte do pedido visual (hero, CTA, bento). Fecha P01 assim que D2 for respondida.
- **3** se divide: "Como funciona", "Saiba mais" e atalhos não dependem de contrato (podem ir com a 2 se D9 sair); "Últimas análises" espera D4, D5 e o endpoint.
- **4** fecha o ciclo. Os testes de cada fase entram na própria fase; a 4 completa auditoria, limpeza e migração.
- **Para começar:** aprovar a 1A e responder D1, D2, D3 e D11.

---

## Anexo A — Medições no navegador

| Medida | Valor |
|---|---|
| Viewport desktop | 1470×802 (janela 1440×900, DPR 2) |
| Card "O que é o ConforME?" (desktop) | 507 px de altura; texto 179 px; 274 px vazios |
| Tiles (desktop) | 342×244 px cada |
| Rodapé (desktop) | termina em y=826; a página rola 48 px só para mostrá-lo |
| Tablet 768×1024 | coluna única; card "O que é" com 353 px e 120 px vazios; CTA em y=750 |
| Mobile 390×844 | card "O que é" com 423 px; KPIs de 177 px; CTA em y=824 |
| Mobile 320×844 | sem rolagem horizontal; KPIs de 142 px; CTA em y=925 |
| Títulos | só `h2` "O que é o ConforME?" |
| Landmarks | `header`, `nav[aria-label]`, `main`; `footer` dentro de `main` |
| Contraste calculado | marca do topo ≈3,9:1 · aba ativa ≈4,1:1 · aba inativa ≈3,6:1 · rótulo do CTA 4,03:1 · saudação 4,66:1 · selo de ambiente 4,83:1 · rótulo de tile 5,74:1 |
| Interações | tile "Modelo LLM" sem efeito; diálogo mensal com `role="dialog"` e `aria-modal`, canvas sem alternativa; skip-link recarrega a SPA |
| Console | sem erros |

## Anexo B — Referência de build e testes

| Item | Bruto | Transferido |
|---|---|---|
| Inicial (main, polyfills, runtime, styles) | 497,97 kB | 118,16 kB |
| Chunk compartilhado (Chart.js completo, Material Dialog, stubs) | 422,44 kB | 109,27 kB |
| Chunk da Home | 22,78 kB | 6,43 kB |
| Chunk de Gráficos Executivos | 513,45 kB | 107,81 kB |
| Testes | 177 de 177 verdes (Karma, ChromeHeadless) | — |

Budgets atuais: inicial com aviso em 900 kB e erro em 1,5 MB; estilo por componente com aviso em 6 kB e erro em 12 kB.
