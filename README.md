# ConforME

Aplicação Angular 15 standalone (dev isolado, sem acesso ao repositório BV nem ao BFF real) com duas features lazy-loaded:

- **Início** (`/inicio`, rota padrão) — Home do sistema: saudação personalizada, o que é o ConforME, atalhos para as funções reais, volume de uso do ano e a configuração vigente (modelos de IA, tempo médio por peça).
- **Gráficos Executivos** (`/graficos-executivos`) — indicadores executivos de peças submetidas à análise de conformidade: quantidade, volume, correlação temporal e ranking por produto.

> **Este projeto roda com DADOS MOCKADOS.** Não tem acesso ao BFF corporativo nem aos pacotes do chassi BV. Tudo aqui foi construído para ser exportado e adaptado no repositório real — ver [Pontos de integração](#pontos-de-integração-obrigatório-revisar).

## Stack (fixada conforme `.rules/padroes-tecnicos.txt`)

| Item | Versão |
|---|---|
| Angular / CLI / Material | 15.2.9 |
| TypeScript | 4.9.5 |
| RxJS | 7.8.1 |
| Zone.js | 0.12.0 |
| Node | 18.20.8 (`.nvmrc`) |
| Gráficos | Chart.js 4.4.9 + ng2-charts 4.1.1 + chartjs-plugin-datalabels 2.2.0 |
| Markdown | markdown-it 13.0.2 + DOMPurify 3.0.11 |
| Estado | services + RxJS (**sem NgRx**, por padrão do projeto) |
| PWA | habilitado (`@angular/service-worker`, só em build de produção) |
| SSR | desativado |

### Por que Chart.js + ng2-charts (e não ngx-echarts)

- **Bundle**: Chart.js com tree-shake de controllers fica em torno de 70 kB gzip; ECharts fica na faixa de 300 kB+. O chunk lazy da feature ficou em **~205 kB transferidos** (`ng build --configuration production`).
- **Compatibilidade**: `ng2-charts@4.1.1` é a última versão que aceita Angular ≥14 (a v5 exige Angular 16). Travado assim no `package.json`.
- **Manutenção**: Chart.js é a lib mais madura para os tipos de gráfico pedidos (barras empilhadas, combo barra+linha, barras horizontais) — não há necessidade dos recursos avançados do ECharts (mapas, 3D, streaming) aqui.

## Como rodar localmente

```bash
nvm use              # usa o Node 18.20.8 do .nvmrc
npm install
npm start             # gera os mocks (prestart) e sobe ng serve em :4200
```

Acesse `http://localhost:4200/` (redireciona para `/inicio`) ou `http://localhost:4200/graficos-executivos`.

```bash
npm run build:prod    # build de produção, com service worker
npm test               # testes unitários (gera mocks antes, via pretest)
npm run test:ci        # idem, sem watch, com cobertura
```

### Mocks de desenvolvimento

`tools/gerar-mocks.js` gera uma base determinística (~900 peças, ~26 meses de histórico, seed fixa) em `src/assets/mocks/graficos-executivos/` e, a partir da mesma base, a configuração do pipeline de IA (modelos, participação, tempo médio) em `src/assets/mocks/inicio/configuracao.mock.json`. A Home reaproveita `pecas.mock.json` para que o volume anual mostrado bata com os números da página executiva. Essas pastas:

- **estão no `.gitignore`** — não devem existir no repositório corporativo;
- são regeneradas automaticamente por `npm run mock:gerar` (chamado antes de `start` e de `test`);
- rodam com PRNG semeado, mas o histórico é ancorado na data de hoje: os números mudam de um dia para o outro (comparar screenshots só no mesmo dia). O gerador é a única fonte de `configuracao.mock.json`; editar o JSON à mão não persiste, e a spec `configuracao-mock.contrato.spec.ts` falha se faltar campo do DTO.

Para simular o estado de erro de qualquer bloco da tela, acrescente `?simularErro=1` na URL.

## Arquitetura

```
src/app/
├── core/                                  # transversal, providedIn: 'root'
│   ├── interceptors/
│   │   └── auth-placeholder.interceptor.ts   # NÃO PORTAR (ver Pontos de integração)
│   ├── models/
│   │   ├── erro-carregamento.model.ts        # normaliza qualquer falha para a UI
│   │   └── recurso.model.ts                  # envelope { carregando, atualizando, dados, erro }
│   ├── services/
│   │   ├── api-url.service.ts                # monta URLs do BFF
│   │   ├── leitor-paleta.service.ts          # lê os tokens de _paleta.scss em runtime
│   │   ├── markdown.service.ts               # markdown-it + DOMPurify (parecer/recomendações)
│   │   └── usuario.service.ts                # STUB — nome/perfil do usuário logado
│   └── paginador-pt-br.ts
├── shared/chassi/                         # STUBS — ver seção própria abaixo
│   ├── cf-cabecalho-pagina/
│   ├── cf-card/                              # estados: carregando · atualizando · erro · vazio · pronto
│   ├── cf-estado/
│   ├── cf-kpi/
│   └── cf-skeleton/
├── features/inicio/                       # feature module, lazy-loaded em /inicio (rota padrão)
│   ├── models/                               # DTOs, saudação, KPIs, variação, data relativa
│   ├── data/                                  # InicioService (contrato) + Http/Mock
│   ├── state/inicio.store.ts                  # store RxJS (resumo + últimas análises, com stale-while-revalidate)
│   ├── components/                            # dumb: hero-inicio, tile-kpi, como-funciona,
│   │                                           # ultimas-analises, painel-atalhos, cartao-sobre,
│   │                                           # dialogo-configuracao/-modelo-llm/-grafico-mensal
│   ├── diretivas/                             # contagem (count-up)
│   └── containers/pagina-inicio/              # smart: injeta o store, monta o view-model
└── features/graficos-executivos/          # feature module, lazy-loaded em /graficos-executivos
    ├── models/                               # DTOs, filtros, erro
    ├── data/                                  # GraficosExecutivosService (contrato) + Http/Mock
    ├── state/graficos-executivos.store.ts     # store RxJS (ver abaixo)
    ├── components/                            # dumb: barra-filtros, seletor-periodo,
    │                                           # cabecalho-calendario, faixa-kpis,
    │                                           # grafico-correlacao, 3 cards,
    │                                           # relatorio-analitico, dialogo-parecer
    └── containers/pagina-graficos-executivos/ # smart: injeta o store, monta o view-model
```

**Smart/dumb**: cada container injeta o store da própria feature e expõe um único `visao$` (view-model) ao template; todo componente de apresentação é `OnPush`, recebe dados por `@Input()` e emite intenção por `@Output()` — nenhum deles conhece o service. As duas features não se importam entre si: cada uma é um pacote portável independente (a Home linka para a página executiva por rota + query params, nunca por import de modelo).

### Home (`/inicio`)

Ponto de entrada do sistema (feature standalone, lazy, rotas em `features/inicio/inicio.routes.ts`). Dois endpoints alimentam a página:

- `GET /inicio/resumo` — KPIs, série mensal e configuração do pipeline de IA.
- `GET /inicio/ultimas-analises?limite=5` — peças mais recentes (`id`, `produto`, `dataAvaliacao`, `resultado`; sem o parecer da IA).

Estrutura da tela, de cima para baixo: **hero** minimalista (rótulo "ConforME - Riscos Não Financeiros - Banco BV", `h1` com a saudação por horário e o CTA "Avaliar peça"), **KPIs** (Análises no ano, Taxa de conformidade, Tempo médio, Pipeline de IA — sparklines Chart.js com meses fechados, variação ▲/▼ do último mês fechado contra o anterior, count-up respeitando `prefers-reduced-motion`; o card de pipeline abre o diálogo "Como a IA foi configurada"), **Como funciona** (3 passos: envio da peça, análise de conformidade e parecer; referências normativas; modelos em operação; texto institucional em `<details>`), **Últimas análises** (produto, data relativa e status; sem o id da peça) e **Atalhos rápidos** (links com o recorte pronto: `?risco=COMPLIANCE`, últimos 30 dias).

**Configuração da IA (diálogo do card "Pipeline de IA")**: técnica **RAG** sobre as regras de compliance e de negócio, executada por 2 agentes em sequência — *triagem* (Gemini 3.8 Flash: entende só o contexto da peça e gera as informações para o próximo agente) e *avaliador* (Gemini 3.1 Pro: com base na triagem, aplica as regras e o RAG e gera o resultado estruturado). Os agentes são identificados pelas chaves `GEMINI_38FLASH` e `GEMINI_31PRO` em `ConfiguracaoProjetoDto.modelos`; o texto explicativo é institucional (não vem do BFF). Do diálogo também se abre a ficha e o benchmark dos modelos Gemini.

Pontos de integração da Home: o CTA "Avaliar peça" aponta para `/avaliar`, uma rota **provisória** (`features/avaliar`) — trocar pelo fluxo real via `rotaAvaliar` do hero; o texto regulatório (etapas e normas) precisa da validação de Compliance.

### Fluxo de estado (sem NgRx)

```
barra de filtros   ─┐
clique num mês      ─┼─> filtros$ (BehaviorSubject) ─┬─> dashboard$  (KPIs, série, 3 cards)
query params da URL ─┘                                 └─> analitico$  (tabela paginada)
```

Um único `FiltrosGraficos` é a fonte de verdade da página. **Todo filtro — inclusive o clique num mês do gráfico de correlação — passa por `store.filtros$`**, e por isso KPIs, os quatro gráficos e o relatório analítico sempre reagem juntos, como pedido.

- **Cross-filter por mês**: clicar numa barra do "Gráfico Correlação" chama `store.alternarMes(mes)`. Clicar no mesmo mês de novo desfaz o recorte (toggle). A série temporal do gráfico principal **ignora** esse recorte de propósito — ela precisa continuar mostrando todos os meses para o usuário poder trocar de seleção; os KPIs, os 3 cards e a tabela respeitam o recorte.
- **Deep-link**: o container mantém uma sincronia de mão dupla com `ActivatedRoute`/`Router` — filtros e o mês selecionado vivem nos query params (`?de=&ate=&produto=&origem=&risco=&mes=`), com `replaceUrl: true` para não empilhar histórico a cada clique.
- **Stale-while-revalidate**: `Recurso<T>` carrega `{ carregando, atualizando, dados, erro }`. Numa recarga (troca de filtro), o operador `manterDadoAnterior` preserva o último dado bom na tela e só marca `atualizando` — sem isso, cada clique de filtro colapsava a página inteira em skeleton, encolhendo o layout e resetando o scroll. Erro, por outro lado, **limpa** os dados de propósito: nunca mostra um número desatualizado como se fosse atual.

### Camada de dados

`GraficosExecutivosService` é uma classe abstrata (token de DI). O `GraficosExecutivosModule` decide a implementação concreta a partir de **uma única flag**:

```ts
// graficos-executivos.module.ts
{
  provide: GraficosExecutivosService,
  useClass: environment.usarMock ? GraficosExecutivosMockService : GraficosExecutivosHttpService,
}
```

Trocar mock por BFF real = `environment.usarMock = false`. Nenhum componente muda.

**Como alternar Mock ↔ HTTP (as duas features)**

1. Em `src/environments/environment.ts`, `usarMock: true` usa os mocks de `assets/mocks/` (com latência `atrasoMockMs`); `false` chama o BFF via `/api` (`proxy.conf.json` aponta para `localhost:8080` em desenvolvimento). `environment.prod.ts` já vem com `usarMock: false`.
2. A decisão fica em um único lugar por feature: `features/inicio/inicio.routes.ts` (`InicioService`) e `graficos-executivos.module.ts` (`GraficosExecutivosService`).
3. Ao integrar com o BFF real, confirmar os paths (`environment.api.*`) e o formato dos payloads (DTOs em `models/*.dto.ts`); `?simularErro=1` força o estado de erro só no mock.

## Contrato de dados assumido (DTOs)

Definido em `src/app/features/graficos-executivos/models/graficos-executivos.dto.ts`, com comentário de premissa em cada campo. Resumo:

```
GET {api.baseUrl}/graficos-executivos/filtros
  -> { produtos[], origens[], riscos[], periodoDisponivel }

GET {api.baseUrl}/graficos-executivos
  ?de&ate&produto&origem&risco&mes        (listas em CSV; todos opcionais)
  -> { periodo, kpis, serieTemporal[], reprovacaoPorRisco[],
       origemPorResultado[], totalPorProduto[], atualizadoEm }

GET {api.baseUrl}/graficos-executivos/analitico
  ?de&ate&produto&origem&risco&mes&pagina&tamanho&ordenarPor&direcao
  -> { conteudo[], pagina, tamanho, totalElementos, totalPaginas }
```

Convenções: datas ISO-8601 (`YYYY-MM-DD` / competência `YYYY-MM`), percentuais de 0 a 100 (nunca 0..1), toda dimensão categórica como `{ chave, rotulo }`.

Campos que o BFF precisa devolver além do óbvio:

| Campo | Onde | Para quê |
|---|---|---|
| `granularidade` (query) | todas as chamadas | `dia` ou `mes` — define como o BFF agrupa a série temporal |
| `granularidadeSerie` | dashboard | eco da granularidade aplicada |
| `periodo` (por ponto) | `serieTemporal[]` | `YYYY-MM` ou `YYYY-MM-DD` conforme a granularidade; é a chave do cross-filter |
| `kpis.periodoAnterior` | dashboard | alimenta a variação de todos os KPIs e dos 3 cards |
| `totalPeriodoAnterior` | `origemPorResultado[]` | variação agregada do card de origem |
| `reprovadasPeriodoAnterior` | `origemPorResultado[]` | coluna Δ (variação da taxa em p.p.) |

Os dois últimos são **opcionais** (`?:`) de propósito: sem eles a UI mostra `—` na coluna de tendência em vez de inventar um número.

### Relatório analítico — colunas (conforme solicitado)

Produto · Data Avaliação · Resultado · Risco Atrelado · Parecer IA · Recomendações para ajustes.

`parecerIa` e `recomendacoesAjuste` chegam em **Markdown gerado por LLM** e são tratados como conteúdo não confiável: `MarkdownService` aplica `markdown-it` (`html: false`) → `DOMPurify` (allowlist estreita de tags) → `DomSanitizer` do Angular, nessa ordem, sempre. A célula da tabela mostra texto plano truncado; o HTML só é renderizado no diálogo de detalhe.

## Pontos de integração (obrigatório revisar)

Tudo listado aqui é **premissa** assumida no desenvolvimento isolado — precisa ser confirmado com os times de BFF, chassi e plataforma antes de subir para o repositório real.

### O que copiar (pacote portável)

Nenhuma das duas features importa nada do shell (`app.module`, `app-routing`, `app.component`) — confirmado por varredura. O pacote a levar para o repositório oficial é:

```
src/app/features/inicio/                # a feature inteira
src/app/features/graficos-executivos/   # a feature inteira
src/app/shared/chassi/                  # 5 stubs (trocar por componentes do chassi)
src/app/core/services/api-url.service.ts
src/app/core/services/leitor-paleta.service.ts
src/app/core/services/markdown.service.ts
src/app/core/services/usuario.service.ts    # STUB — trocar pela leitura do JWT/SSO real
src/app/core/models/erro-carregamento.model.ts
src/app/core/models/recurso.model.ts
src/app/core/paginador-pt-br.ts
src/styles/_paleta.scss                 # tokens lidos em runtime — ver item 12
```

Descartar: `app.module.ts`, `app-routing.module.ts`, `app.component.*`, `auth-placeholder.interceptor.ts`, `proxy.conf.json`, `tools/gerar-mocks.js`, `src/assets/mocks/`, `graficos-executivos-mock.service.ts`, `inicio-mock.service.ts`.

### Ações necessárias

| # | Item | Premissa assumida aqui | Onde está |
|---|---|---|---|
| 1 | Path do BFF | `/api/graficos-executivos`, `/filtros`, `/analitico` | `environment.ts`, `api-url.service.ts` |
| 2 | Formato de listas na query | CSV (`produto=A,B`) | `graficos-executivos-http.service.ts` |
| 3 | Shape do payload | Envelope agregado único (ver DTOs) | `models/graficos-executivos.dto.ts` |
| 4 | Paginação | Formato "Spring Data Page" simplificado | `PaginaDto<T>` |
| 5 | Path/nome das rotas | `/inicio` (padrão) e `/graficos-executivos` | `app-routing.module.ts` |
| 6 | Item de menu | Links fixos no `app.component.html` (shell provisório) | descartar junto com o shell |
| 7 | JWT / SSO Atlante | Anexado pelo interceptor do chassi — **`AuthPlaceholderInterceptor` não faz nada e deve ser removido** | `core/interceptors/auth-placeholder.interceptor.ts` + provider em `app.module.ts` |
| 8 | Componentes visuais | 5 stubs em `shared/chassi/` — ver tabela abaixo | `shared/chassi/chassi.module.ts` |
| 9 | Tema Angular Material | `styles.scss` roda `mat.core()` + `mat.all-component-themes()`. Se o chassi já tematiza, **incluir de novo duplica CSS e pode sobrescrever o tema oficial** — manter apenas `@use 'paleta'` e os utilitários do fim do arquivo | `styles.scss` |
| 10 | Guard de rota/perfil | Nenhum guard aplicado | `graficos-executivos-routing.module.ts` |
| 11 | `MatPaginatorIntl` pt-BR | Provider próprio — remover se o chassi já traduzir | `core/paginador-pt-br.ts` |
| 12 | Estilos globais de que a feature depende | `.apenas-leitor-tela` (10 usos nos templates) e os tokens `--cf-*` / `--grf-*`. **Sem eles a feature quebra silenciosamente**: leitor de tela perde o texto alternativo e os gráficos caem nas cores de reserva do TypeScript | `styles.scss` (utilitários) + `styles/_paleta.scss` |
| 13 | Dependências novas a homologar | `chart.js`, `ng2-charts`, `chartjs-plugin-datalabels`, `markdown-it`, `dompurify` — nenhuma consta no contexto de stack; passar por Veracode/aprovação antes | `package.json` |
| 14 | Flags de compilação | `esModuleInterop` + `allowSyntheticDefaultImports` são **obrigatórios** (markdown-it e dompurify usam `export =`), e `allowedCommonJsDependencies` evita warning de build | `tsconfig.json`, `angular.json` |
| 15 | Budgets de build | `initial: 1.5mb` / `anyComponentStyle: 12kb`. O chunk lazy da feature (~205 kB) entra no orçamento do projeto oficial — revalidar lá | `angular.json` |
| 16 | Scripts de mock no ciclo de vida | `prestart`/`pretest`/`pretest:ci` chamam `mock:gerar`. **Remover ao portar** — no repositório oficial não há gerador e o hook quebraria o CI | `package.json` |
| 17 | Cabeçalho de calendário customizado | `CabecalhoCalendarioComponent` **estende `MatCalendarHeader`**, cujo construtor não é API pública estável. Se o chassi subir a versão do Material, revalidar a assinatura do `super(...)` | `components/cabecalho-calendario/` |
| 18 | Estilo que depende de classes internas do Material | O realce de campo com filtro usa `::ng-deep .mat-mdc-text-field-wrapper` / `.mdc-notched-outline__*`. Escopado por `.filtros__campo--ativo`, mas **quebra silenciosamente** se o chassi trocar Material MDC por Foundation UI | `barra-filtros.component.scss` |
| 19 | PWA / service worker | `ServiceWorkerModule.register()` no `app.module` + `serviceWorker: true` no build de produção. Se o shell oficial já registra, **registrar duas vezes conflita** | `app.module.ts`, `angular.json`, `ngsw-config.json` |
| 20 | `LOCALE_ID` e `registerLocaleData('pt-BR')` | Providos no `app.module` local; se o chassi já provê, remover para não duplicar | `app.module.ts` |
| 21 | Path do endpoint da Home | `/api/inicio/resumo` — envelope agregado único (uso do ano, série mensal, configuração) | `environment.ts`, `api-url.service.ts`, `models/inicio.dto.ts` |
| 22 | Nome e perfil do usuário na saudação | `UsuarioService` é STUB com valor fixo — no projeto real vem do JWT/SSO Atlante, igual ao item 7 | `core/services/usuario.service.ts` |

### Stubs do chassi (`shared/chassi/`)

Pacotes reais (`@arqt/ng15-ui`, `@atle/ng15-biblioteca`, Foundation UI) retornam `404` no registry público — não há como instalar aqui. Cada stub abaixo replica o contrato de `@Input()`/`@Output()` esperado; ao portar, troque a **implementação**, mantendo o seletor:

| Stub local | Componente real do chassi |
|---|---|
| `<cf-cabecalho-pagina>` | `<bv-page-header>` |
| `<cf-card>` | `<bv-card>` (+ estados nativos do chassi, se existirem) |
| `<cf-kpi>` | `<bv-indicador>` |
| `<cf-estado>` | `<bv-empty-state>` / `<bv-error-state>` |
| `<cf-skeleton>` | `<bv-skeleton>` |

### Paleta / design tokens

`src/styles/_paleta.scss` é o **único arquivo** a editar para re-tematizar — nenhum gráfico tem hex hardcoded no TypeScript; todos leem `LeitorPaletaService`, que resolve as CSS custom properties em runtime. Valores atuais fornecidos pelo produto (azul de ação #1976d2, status, perfis, marca BV); dois typos da lista original foram corrigidos e documentados no topo do arquivo SCSS.

## Acessibilidade

- Todo gráfico Chart.js tem `role="img"` + `aria-label` descritivo (texto gerado dinamicamente a partir dos dados) e uma **tabela HTML equivalente** (visível por padrão no gráfico de correlação via `<details>`, ou `.apenas-leitor-tela` nos 3 cards) — cobre tanto leitor de tela quanto navegação só-teclado do cross-filter.
- Paleta com contraste WCAG AA verificado (ver comentários em `_paleta.scss`); onde o tom de marca não passava (âmbar "Inconclusivo"), existe uma variante `-forte` só para texto/borda/série.
- `prefers-reduced-motion` respeitado; foco sempre visível (`:focus-visible`); skip-link no shell.

## Testes

230 specs (Jasmine/Karma).

**Gráficos Executivos**: serialização/parse de filtros e query params, mapeamento de erro HTTP, o service HTTP (path, query params, CSV), o service de mock (agregação client-side, cross-filter por mês, paginação/ordenação), sanitização de Markdown (XSS: script, handler inline, iframe, `javascript:` em link) e o container (view-model único, propagação de filtro, cross-filter, stale-while-revalidate, sincronia com a URL).

**Início**: saudação por horário e data por extenso, KPIs e variação (último mês fechado, janeiro sem par, base zero), data relativa, formatação de tempo, período "últimos 30 dias", diretiva de count-up (movimento reduzido), componentes `hero`, `tile-kpi`, `como-funciona`, `ultimas-analises` e o diálogo de configuração (RAG e 2 agentes), services de mock e HTTP (resumo e últimas análises), providers da rota, contrato do `configuracao.mock.json` com o DTO e o container (view-model único, erro sem derrubar a página, âncora "Como funciona").

**Auditoria de acessibilidade (05/10/2026)**: axe-core 4.10 (WCAG 2.0/2.1/2.2 A/AA + boas práticas) sem violações na Home em 320, 390, 768, 1024, 1440 e 1920 px; regras de contraste sobre gradiente (`color-contrast` "incompleta" no axe) verificadas por cálculo. Lighthouse não foi executado.

```bash
npm run test:ci
```
