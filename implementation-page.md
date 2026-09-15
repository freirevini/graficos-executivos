# Gráficos Executivos — Documentação de Implementação

> **Propósito deste documento.** Permitir que outra pessoa (ou outra IA) reimplemente esta página do zero em um projeto que já tem frontend, BFF e backend configurados, **preservando 100% do comportamento e das decisões de arquitetura**. Cada decisão não óbvia está registrada com o motivo — inclusive as que parecem triviais, porque várias delas foram tomadas para corrigir um problema real que só aparece em runtime.

> **Aviso de escopo.** O projeto de origem é um **desenvolvimento isolado**: nunca teve acesso ao BFF corporativo nem aos pacotes do chassi BV. O frontend está 100% implementado e testado; **BFF e backend nunca existiram como código**. As seções 3 e 4 são, portanto, **especificação implementável** derivada da regra de negócio que vive no serviço de mock — que é o oráculo executável do comportamento esperado.

---

## Índice

1. [Visão geral](#1-visão-geral)
2. [Frontend](#2-frontend)
3. [BFF — especificação](#3-bff--especificação)
4. [Backend — especificação](#4-backend--especificação)
5. [Contratos de API](#5-contratos-de-api)
6. [Variáveis de ambiente e configuração](#6-variáveis-de-ambiente-e-configuração)
7. [Decisões técnicas e trade-offs](#7-decisões-técnicas-e-trade-offs)
8. [Passo a passo de implementação](#8-passo-a-passo-de-implementação)
9. [Dependências entre este projeto e o novo ambiente](#9-dependências-entre-este-projeto-e-o-novo-ambiente)

---

## 1. Visão geral

### 1.1 O que a página resolve

Painel executivo de **conformidade regulatória de peças de comunicação**. Cada "peça" (um material de marketing de um produto financeiro) passa por uma avaliação automatizada por IA que devolve `APROVADA` ou `REPROVADA`, com um parecer em markdown e, quando reprovada, recomendações de ajuste.

A página responde quatro perguntas de negócio, nessa ordem de prioridade:

| Pergunta | Bloco da página |
|---|---|
| Quanto foi avaliado e quanto reprovou? | Faixa de KPIs (4 indicadores + variação vs. período anterior) |
| O volume cresceu, mas a qualidade piorou? | Gráfico principal: volume (barras) × taxa de reprovação (linha) |
| De onde vem a reprovação? | 3 cards de composição: por risco, por origem, por produto |
| O que exatamente foi reprovado e por quê? | Relatório analítico paginado, com parecer da IA em markdown |

### 1.2 Conceito central: cross-filter

**Todo elemento clicável da página recorta a página inteira.** Clicar num mês do gráfico, numa fatia do donut de risco, numa origem ou num produto aplica aquele recorte a **todos** os blocos simultaneamente — KPIs, gráfico, os três cards e o relatório. Clicar de novo desfaz.

Isso é possível porque existe **uma única fonte de verdade de filtro** (`FiltrosGraficos`) e todos os blocos derivam dela. Nenhum bloco tem estado próprio de filtro.

### 1.3 Fluxo de dados

```
┌──────────────────────── FRONTEND (Angular 15) ─────────────────────────┐
│                                                                          │
│  barra de filtros ──┐                                                    │
│  seletor período  ──┤                                                    │
│  clique no gráfico ─┼──► filtros$ (BehaviorSubject<FiltrosGraficos>)     │
│  clique num card  ──┤         │                                          │
│  query params URL ──┘         │                                          │
│                               ├──► dashboard$ ──► KPIs + gráfico + cards │
│                               └──► analitico$ ──► tabela paginada        │
│                                        │                                 │
│                          GraficosExecutivosService (classe abstrata)     │
│                                        │                                 │
│                   ┌────────────────────┴────────────────────┐            │
│                   ▼                                          ▼           │
│        MockService (dev)                      HttpService (produção)      │
│        assets/mocks/*.json                    HttpClient + HttpParams     │
└───────────────────────────────────────────────────┬──────────────────────┘
                                                    │ GET /api/graficos-executivos*
                                                    ▼
                          ┌──────────── APACHE 2.4 ────────────┐
                          │  rewrite SPA → /index.html          │
                          │  proxy /api/* → BFF (API_URL)       │
                          │  timeout 300s                       │
                          └──────────────────┬──────────────────┘
                                             ▼
                          ┌─────────── BFF (Spring Boot) ───────┐
                          │  agrega, calcula KPIs e composições │
                          │  aplica filtros, pagina e ordena    │
                          └──────────────────┬──────────────────┘
                                             ▼
                          ┌───────────── BACKEND / BASE ────────┐
                          │  tabela de peças avaliadas          │
                          └─────────────────────────────────────┘
```

**Ponto de arquitetura importante:** o BFF devolve **dados já agregados**, não a lista bruta de peças. O frontend não soma nem agrupa nada para os gráficos — ele só formata. A única exceção é o cálculo de percentuais derivados de exibição (participação no total), que é aritmética trivial sobre os agregados recebidos.

---

## 2. Frontend

### 2.1 Stack

Conforme `.rules/padroes-tecnicos.txt` — **estes valores são obrigatórios, não sugestões**:

| Item | Versão | Observação |
|---|---|---|
| Angular / CLI / Material | 15.2.9 | SPA `ng15-rreg-base-agente-regulatorio` |
| TypeScript | 4.9.5 | |
| RxJS | 7.8.1 | |
| Zone.js | 0.12.0 | |
| Node / npm | 18 / >=9.5.1 | `.nvmrc` fixa 18.20.8 |
| Estado | **services + RxJS** | **Sem NgRx** — restrição do projeto |
| PWA | habilitado | service worker + manifest |
| SSR | desativado | |

### 2.2 Dependências adicionadas

Nenhuma delas consta no contexto de stack original — **todas precisam de homologação (Veracode) antes do merge**:

| Pacote | Versão | Para quê | Por que essa versão |
|---|---|---|---|
| `chart.js` | 4.4.9 | motor de gráficos | |
| `ng2-charts` | 4.1.1 | wrapper Angular do Chart.js | **última versão que aceita Angular ≥14**; a v5 exige Angular 16 |
| `chartjs-plugin-datalabels` | 2.2.0 | rótulos de valor nas marcas | peer `chart.js >=3.0.0` |
| `markdown-it` | 13.0.2 | render do parecer da IA | |
| `dompurify` | 3.0.11 | sanitização do HTML gerado | |

`markdown-it` e `dompurify` usam `export =`, o que **obriga** duas flags no `tsconfig.json`:

```jsonc
{
  "compilerOptions": {
    "esModuleInterop": true,            // obrigatório
    "allowSyntheticDefaultImports": true // obrigatório
  }
}
```

E no `angular.json`, para não gerar warning de build:

```jsonc
"allowedCommonJsDependencies": ["dompurify", "markdown-it"]
```

### 2.3 Componentes

Legenda de tipo: **smart** = conhece o store; **dumb** = só recebe `@Input` e emite `@Output`; **stub** = substituto local de um componente do chassi corporativo.

#### Container (smart) — o único que conhece o store

| Componente | Caminho | Responsabilidade |
|---|---|---|
| `PaginaGraficosExecutivosComponent` | `features/graficos-executivos/containers/pagina-graficos-executivos/` | Injeta o store, combina os observables num único view-model `visao$`, sincroniza filtros ↔ query params da URL, repassa eventos dos filhos para o store |

**API pública (métodos chamados pelo template):**

```ts
aplicarFiltros(parcial: Partial<FiltrosGraficos>): void
limparFiltros(): void
alternarPeriodo(periodo: string): void                       // cross-filter do gráfico
escolherPeriodo({ de, ate, granularidade }): void            // seletor segmentado
alternarDimensao(dimensao: DimensaoFiltravel, chave: string) // cross-filter dos cards
recorteUnico(selecionadas: string[]): string | null          // destaque nos cards
mudarPagina(parcial: Partial<ParametrosPagina>): void
recarregar(): void
```

#### Componentes de apresentação (dumb)

| Componente | Seletor | `@Input()` | `@Output()` | Responsabilidade |
|---|---|---|---|---|
| Barra de filtros | `gx-barra-filtros` | `filtros` (setter), `opcoes`, `carregando` | `filtrosAlterados`, `limparFiltros` | Date-range + 3 multi-selects + chips removíveis + botão limpar |
| Seletor de período | `gx-seletor-periodo` | `filtros` | `periodoEscolhido` | Pill group segmentado (30 dias / 3 meses / Ano atual) |
| Cabeçalho de calendário | `gx-cabecalho-calendario` | — | — | Estende `MatCalendarHeader`; muda a navegação do date picker |
| Faixa de KPIs | `gx-faixa-kpis` | `kpis`, `serie`, `carregando` | — | 4 `cf-kpi` com variação e sparkline |
| Gráfico principal | `gx-grafico-correlacao` | `serie`, `periodoSelecionado`, `granularidade` | `periodoAlternado` | Barras empilhadas + linha de taxa; cross-filter por clique |
| Card risco | `gx-card-reprovacao-risco` | `itens`, `reprovadasPeriodoAnterior`, `selecionado` | `riscoAlternado` | Donut de composição + legenda clicável |
| Card origem | `gx-card-origem-resultado` | `itens`, `selecionada` | `origemAlternada` | KPI + tick bar + tabela clicável com coluna Δ |
| Card produto | `gx-card-total-produto` | `itens`, `totalPeriodoAnterior`, `selecionado` | `produtoAlternado` | KPI + lista de progress bars clicáveis |
| Relatório analítico | `gx-relatorio-analitico` | `pagina`, `parametros` | `parametrosAlterados` | `mat-table` com sort e paginação |
| Diálogo do parecer | `gx-dialogo-parecer` | (via `MAT_DIALOG_DATA`) | — | Markdown sanitizado em modal |

#### Stubs do chassi (`shared/chassi/`)

Os pacotes reais (`@arqt/ng15-ui`, `@atle/ng15-biblioteca`, Foundation UI) não estavam acessíveis. Cada stub replica o **contrato** esperado; ao migrar, troque a implementação mantendo o seletor — ou substitua pelo componente real do chassi.

| Stub | `@Input()` | Equivalente provável no chassi |
|---|---|---|
| `cf-card` | `titulo`, `descricao`, `carregando`, `atualizando`, `erro`, `vazio`, `mensagemVazio`, `alturaCorpo`, `nivelTitulo`, `centralizarTitulo` | `<bv-card>` |
| `cf-kpi` | `rotulo`, `valor`, `sufixo`, `casasDecimais`, `tom`, `carregando`, `icone`, `variacaoPercentual`, `altaEhRuim`, `descricaoComparativo`, `serie` | `<bv-indicador>` |
| `cf-estado` | `tipo`, `titulo`, `descricao`, `permiteNovaTentativa` | `<bv-empty-state>` / `<bv-error-state>` |
| `cf-skeleton` | `altura`, `largura` | `<bv-skeleton>` |
| `cf-cabecalho-pagina` | `titulo`, `subtitulo`, `atualizadoEm` | `<bv-page-header>` |

**`cf-card` é o componente mais importante dos stubs**: ele centraliza os **quatro estados** de todo bloco do dashboard (carregando / erro / vazio / pronto), o que evita `*ngIf` de estado repetido em cada gráfico. Ele também garante que **os gráficos só sejam instanciados no estado "pronto"** — sem isso, o Chart.js monta sobre um canvas de altura zero e não se recupera.

### 2.4 Gerenciamento de estado

Sem NgRx, por restrição do projeto. O padrão é **um store de serviço com BehaviorSubjects**, provido no nível do componente container (não em root), para que o estado morra junto com a página.

#### `Recurso<T>` — o envelope de todo dado assíncrono

```ts
export interface Recurso<T> {
  carregando: boolean;   // primeira carga: mostra skeleton
  atualizando: boolean;  // recarga com dado anterior na tela
  dados: T | null;
  erro: ErroCarregamento | null;
}
```

A separação entre `carregando` e `atualizando` é o que implementa **stale-while-revalidate** — ver decisão D-04.

#### Fontes e derivações

```ts
private readonly filtrosSubject = new BehaviorSubject<FiltrosGraficos>(filtrosPadrao());
private readonly paginaSubject  = new BehaviorSubject<ParametrosPagina>({ ... });
private readonly recarregarSubject = new BehaviorSubject<void>(undefined);

readonly filtros$   = this.filtrosSubject.pipe(distinctUntilChanged(filtrosIguais));
readonly opcoesFiltro$ = /* carrega uma vez, shareReplay */;
readonly dashboard$ = combineLatest([this.filtros$, this.recarregarSubject]).pipe(
  switchMap(([filtros]) => this.servico.carregarDashboard(filtros)),
  manterDadoAnterior(),
  shareReplay({ bufferSize: 1, refCount: false }),
);
readonly analitico$ = /* idem, + parametrosPagina$ */;
```

> **`refCount: false` é obrigatório.** Com `refCount: true`, quando o último subscriber sai (troca de filtro), o `scan` do `manterDadoAnterior` perde o acumulador e o dado anterior some — o que reintroduz o "pulo" de layout que o stale-while-revalidate existe para evitar.

#### O operador `manterDadoAnterior`

```ts
function manterDadoAnterior<T>() {
  return (origem: Observable<Recurso<T>>) => origem.pipe(
    scan((anterior, atual) => {
      // Preserva o dado da emissão anterior enquanto a nova carga não chega.
      // Sem dado anterior (primeira carga), deixa `carregando` passar → skeleton.
      if (atual.carregando && anterior?.dados) {
        return { ...atual, carregando: false, atualizando: true, dados: anterior.dados };
      }
      return atual;
    }),
  );
}
```

#### Métodos públicos do store

| Método | Comportamento |
|---|---|
| `aplicarFiltros(parcial)` | Merge parcial no filtro atual |
| `definirFiltros(completo)` | Substitui (usado pela hidratação via URL) |
| `alternarPeriodo(periodo)` | Cross-filter do gráfico. Clicar no mesmo ponto desfaz |
| `aplicarPeriodo(de, ate, granularidade)` | Seletor segmentado. **Sempre descarta o recorte de ponto** — a chave pode não existir na nova janela |
| `alternarDimensao(dimensao, chave)` | Cross-filter dos cards. **Substitui** a seleção da dimensão; clicar no mesmo item desfaz |
| `limparFiltros()` | Volta ao padrão completo, **inclusive a janela de tempo** |
| `mudarPagina(parcial)` | Paginação/ordenação do analítico |
| `recarregar()` | Força refetch sem mudar filtro |

### 2.5 Modelo de filtros

```ts
export type Granularidade = 'dia' | 'mes';

export interface FiltrosGraficos {
  de: string;              // YYYY-MM-DD
  ate: string;             // YYYY-MM-DD
  granularidade: Granularidade;
  produtos: string[];      // chaves; vazio = todos
  origens: string[];
  riscos: string[];
  periodo: string | null;  // cross-filter: 'YYYY-MM' ou 'YYYY-MM-DD'
}
```

**Presets do seletor segmentado** — cada um carrega a granularidade junto, porque 30 dias é curto demais para leitura mensal e 3 meses/ano são longos demais para leitura diária:

```ts
export const PRESETS_PERIODO = [
  { valor: '30d', rotulo: '30 dias',   granularidade: 'dia' },
  { valor: '3m',  rotulo: '3 meses',   granularidade: 'mes' },
  { valor: 'ano', rotulo: 'Ano atual', granularidade: 'mes' },
];
export const PRESET_PADRAO = 'ano';
```

| Preset | Janela calculada |
|---|---|
| `30d` | `hoje - 29 dias` até `hoje` |
| `3m` | dia 1 do mês `hoje - 2 meses` até `hoje` (3 competências inclusive) |
| `ano` | 1º de janeiro do ano corrente até `hoje` |

### 2.6 Rotas e sincronização com a URL

```ts
// graficos-executivos-routing.module.ts
const rotas: Routes = [{
  path: '',
  component: PaginaGraficosExecutivosComponent,
  title: 'Gráficos Executivos · Conforme',
  // ADAPTAR: acrescentar o guard de autenticação/perfil do chassi
}];
```

Lazy-loaded a partir do shell:

```ts
{ path: 'graficos-executivos',
  loadChildren: () => import('./features/graficos-executivos/graficos-executivos.module')
    .then(m => m.GraficosExecutivosModule) }
```

**Sincronia bidirecional com query params** (deep-link + F5 preservam o recorte):

- **URL → estado**: no `ngOnInit`, `route.queryParams` → `deQueryParams()` → `store.definirFiltros()`, guardado por `filtrosIguais` para não entrar em loop.
- **Estado → URL**: `filtros$` → `router.navigate([], { queryParams, replaceUrl: true })`. `replaceUrl: true` evita poluir o histórico a cada clique.

Serialização (omite tudo que está no padrão, para manter a URL curta):

| Param | Quando aparece | Formato |
|---|---|---|
| `de`, `ate` | sempre | `YYYY-MM-DD` |
| `granularidade` | só se `dia` | `dia` |
| `produto`, `origem`, `risco` | se houver seleção | CSV: `CARTAO,SEGUROS` |
| `periodo` | se houver cross-filter | `YYYY-MM` ou `YYYY-MM-DD` |

> **Validação defensiva na hidratação:** um recorte de dia numa visão mensal (ou vice-versa) é descartado em vez de propagado — só viria de URL editada à mão, e propagar geraria um estado que nenhum clique consegue produzir.

### 2.7 Estilização

**Tokens CSS como única fonte de cor.** Nenhum hex fica hardcoded no TypeScript dos gráficos; o `LeitorPaletaService` resolve as custom properties em runtime via `getComputedStyle`, com valor de reserva:

```ts
@Injectable({ providedIn: 'root' })
export class LeitorPaletaService {
  token(nome: string, reserva: string): string {
    const valor = getComputedStyle(document.documentElement).getPropertyValue(nome).trim();
    return valor || reserva;
  }
  get aprovada(): string { return this.token('--grf-aprovadas', '#3f5fc9'); }
  get reprovada(): string { return this.token('--grf-reprovadas', '#cc6363'); }
  get linhaPercentual(): string { return this.token('--grf-linha-percentual', '#c9a13c'); }
  serieCategorica(): string[] { /* --grf-cor-1..8 */ }
  comOpacidade(cor: string, alfa: number): string { /* hex → rgba */ }
}
```

Isso significa que **re-tematizar a página inteira é editar um arquivo só** (`styles/_paleta.scss`), sem tocar em TypeScript.

**Tokens principais:**

| Token | Uso |
|---|---|
| `--grf-aprovadas` | série "aprovadas" nos gráficos (**separado** do verde de status da tabela) |
| `--grf-reprovadas` | série "reprovadas" |
| `--grf-linha-percentual` | linha de taxa de reprovação |
| `--grf-cor-1..8` | paleta categórica (origens, riscos) — atribuída em ordem fixa, **nunca ciclada** |
| `--cf-kpi-{neutro,aprovado,reprovado,atencao}` | tons dos 4 cards de KPI; **precisam viver em `:root`** porque o `cf-kpi` os lê por `getComputedStyle` para colorir o sparkline |
| `--cf-texto`, `--cf-texto-secundario`, `--cf-borda-suave`, `--cf-superficie` | estrutura |

> **Dependência global crítica:** a feature usa a classe utilitária `.apenas-leitor-tela` em 10 pontos dos templates (texto para leitor de tela). Ela é definida no `styles.scss` global. **Se não for migrada junto, a acessibilidade quebra silenciosamente** — sem erro nenhum.

### 2.8 Tratamento de loading, erro e edge cases

#### Os quatro estados de cada bloco

| Estado | Condição | O que aparece |
|---|---|---|
| Carregando | `carregando: true` | Skeleton com `role="status"` e texto para leitor de tela |
| Erro | `erro != null` | `cf-estado` com mensagem + botão "Tentar novamente" (só se o erro permitir retry) |
| Vazio | `vazio: true` | `cf-estado` com mensagem contextual |
| Pronto (+ atualizando) | dado presente | Conteúdo; se `atualizando`, opacidade 0.45 + barra de progresso, **sem mudar a altura** |

#### Normalização de erro por status HTTP

```ts
export function mapearErro(erro: HttpErrorResponse): ErroCarregamento {
  if (erro.status === 0)   return { mensagem: 'Falha de conexão…', status: 0, permiteNovaTentativa: true };
  if (erro.status === 401 || erro.status === 403)
                           return { mensagem: 'Sessão expirada…', status: erro.status, permiteNovaTentativa: false };
  if (erro.status >= 500)  return { mensagem: 'Erro no servidor…', status: erro.status, permiteNovaTentativa: true };
  return { mensagem: '…', status: erro.status, permiteNovaTentativa: false };
}
```

> **Regra:** erro **limpa** os dados de propósito (diferente da recarga, que preserva). Nunca mostrar um número desatualizado como se fosse atual.

#### Edge cases tratados (todos com teste)

| Caso | Tratamento |
|---|---|
| Divisão por zero (período sem peças) | Todo percentual retorna `0` em vez de `NaN` |
| Crescimento a partir de zero no período anterior | Variação vira `null` → UI mostra `—` em vez de `+∞%` |
| Período anterior ausente no payload | Coluna Δ mostra `—`; **não inventa tendência** |
| Dia/mês sem nenhuma peça | Aparece como zero na série, **não some do eixo** (sumir distorce a leitura da tendência) |
| Rótulo que não cabe na barra | Só é impresso se o segmento tiver ≥18px **medidos em pixel** (não em unidade de dado) |
| Range diário muito longo | Teto de 92 pontos na série |
| Duas ou mais chaves selecionadas numa dimensão | Nenhum card destaca item algum — destacar um só mentiria sobre o recorte |
| Markdown malicioso vindo da IA | Sanitização em 3 camadas (ver D-09) |
| Texto do chip de % sobre a barra colorida | Chip ganha fundo branco 90%; sem isso, cinza sobre azul fica ilegível |

---

## 3. BFF — especificação

> Não existe implementação de BFF neste projeto. **Toda a regra abaixo foi extraída do serviço de mock**, que é a especificação executável do comportamento que o frontend já espera e que os 127 testes verificam.

### 3.1 Responsabilidade

O BFF **agrega**. O frontend recebe números prontos. Concretamente, o BFF precisa:

1. Aplicar os filtros recebidos por query param.
2. Calcular os KPIs do recorte **e do período imediatamente anterior**.
3. Bucketizar a série temporal por dia ou por mês.
4. Calcular as três composições (risco, origem, produto).
5. Paginar e ordenar o relatório analítico.

### 3.2 Regra de filtragem (aplicada a todos os endpoints)

```
peça entra no recorte SE:
      peça.dataAvaliacao[0..10] >= de
  AND peça.dataAvaliacao[0..10] <= ate
  AND (produtos vazio OU peça.produto   ∈ produtos)
  AND (origens   vazio OU peça.origem   ∈ origens)
  AND (riscos    vazio OU peça.risco    ∈ riscos)
  AND (periodo nulo OU chave(peça, granularidade) == periodo)
```

Onde `chave(peça, granularidade)` = `dataAvaliacao[0..10]` se `dia`, `dataAvaliacao[0..7]` se `mes`.

> **Entre dimensões é AND; dentro da dimensão é OR** (a lista CSV). Ex.: `produto=CARTAO,SEGUROS&origem=AGENCIA` = (cartão OU seguros) E agência.

### 3.3 A regra mais importante: a série temporal ignora o recorte de ponto

```
base    = filtrar(peças, filtros, ignorarPeriodo = true)   ← série temporal usa ESTE
recorte = filtros.periodo ? base.filtrar(chave == periodo) : base   ← todo o resto usa ESTE

dashboard = {
  kpis:               agregarKpis(recorte, periodoAnterior),
  serieTemporal:      bucketizar(base),          // ← base, não recorte
  reprovacaoPorRisco: porRisco(recorte),
  origemPorResultado: porOrigem(recorte, periodoAnterior),
  totalPorProduto:    porProduto(recorte),
}
```

**Por quê:** se a série também fosse recortada, ao clicar num mês o gráfico passaria a mostrar só aquele mês — e o usuário perderia a capacidade de clicar em outro mês ou de desfazer. A série precisa continuar mostrando todos os períodos para que o cross-filter seja reversível.

### 3.4 Cálculo dos KPIs

```
agregarKpis(lista):
  totalPecas          = count(lista)
  pecasReprovadas     = count(lista onde resultado == 'REPROVADA')
  pecasAprovadas      = totalPecas - pecasReprovadas
  percentualReprovacao = totalPecas > 0 ? round2(pecasReprovadas / totalPecas * 100) : 0
```

`round2(x)` = `Math.round(x * 100) / 100` (duas casas).

### 3.5 Período anterior — a janela deslocada

Usada pelos KPIs e pelo card de origem:

```
duracao      = ate - de
ateAnterior  = de - 1 dia
deAnterior   = ateAnterior - duracao
```

O recorte anterior usa **os mesmos filtros de dimensão**, mas com `periodo = null` (o recorte de ponto não se aplica à janela anterior).

> Exemplo: recorte `2026-01-01 .. 2026-09-15` (257 dias) ⇒ anterior = `2025-04-19 .. 2025-12-31`.

SQL de referência:

```sql
SELECT COUNT(*) AS total,
       COUNT(*) FILTER (WHERE resultado = 'REPROVADA') AS reprovadas
FROM peca_avaliada
WHERE data_avaliacao::date BETWEEN :de_anterior AND :ate_anterior
  AND (:produtos IS NULL OR produto = ANY(:produtos))
  AND (:origens  IS NULL OR origem  = ANY(:origens))
  AND (:riscos   IS NULL OR risco_atrelado = ANY(:riscos));
```

### 3.6 Série temporal

```
chaves = granularidade == 'dia'
       ? todos os dias entre de..ate      (teto de 92)
       : todas as competências de..ate    (teto de 60)

para cada chave: balde = { aprovadas: 0, reprovadas: 0 }   ← PRÉ-CRIADO
para cada peça em base: incrementa o balde de chave(peça)

ponto = {
  periodo: chave,                       // 'YYYY-MM' ou 'YYYY-MM-DD'
  rotulo:  granularidade == 'dia' ? 'DD/MM' : 'mmm/AA',   // ex.: '14/09', 'set/26'
  aprovadas, reprovadas,
  percentualReprovacao: total > 0 ? round2(reprovadas / total * 100) : 0
}
```

> **Baldes pré-criados são obrigatórios.** Períodos sem nenhuma peça precisam aparecer com zero. Se sumirem do eixo, a tendência fica visualmente distorcida (dois meses não adjacentes passam a parecer adjacentes).

Rótulo de mês em pt-BR: `['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez']` + ano com 2 dígitos.

### 3.7 Composições

Todas seguem o mesmo padrão: agrupa, calcula, **descarta grupos vazios**.

```
porRisco(recorte, riscos):
  para cada risco: { ...risco, total, reprovadas, percentualReprovacao }
  descarta total == 0

porOrigem(recorte, origens, anterior):
  para cada origem: { ...origem, aprovadas, reprovadas,
                      totalPeriodoAnterior, reprovadasPeriodoAnterior }
  descarta aprovadas + reprovadas == 0

porProduto(recorte, produtos):
  para cada produto: { ...produto, total, reprovadas, percentualReprovacao }
  descarta total == 0
  ordena por total DESC          ← contrato: já vem ordenado
```

> `totalPeriodoAnterior` e `reprovadasPeriodoAnterior` são **opcionais no contrato**. Se o BFF não os enviar, a UI mostra `—` na coluna de tendência em vez de inventar um número. Implementá-los depois não quebra nada.

### 3.8 Relatório analítico

```
filtradas = filtrar(peças, filtros)          ← aqui o recorte de ponto SE aplica
ordenadas = ordenar(filtradas, ordenarPor, direcao)
conteudo  = ordenadas[pagina * tamanho ... +tamanho]

totalElementos = count(ordenadas)
totalPaginas   = max(1, ceil(totalElementos / tamanho))
```

Campos de ordenação aceitos: `produto`, `dataAvaliacao`, `resultado`, `riscoAtrelado`.

> **`riscoAtrelado` ordena pelo campo `ordem` da opção, não alfabeticamente** — para que a ordenação siga a sequência definida pelo negócio, não o acaso do nome.

O BFF devolve `produto` e `riscoAtrelado` como objetos `{ chave, rotulo }` já resolvidos — o frontend não mantém tabela de tradução.

---

## 4. Backend — especificação

> Também não existe neste projeto. O mínimo necessário para o BFF funcionar.

### 4.1 Entidade

| Campo | Tipo | Observação |
|---|---|---|
| `id` | string | identificador da peça (ex.: `PC-10957`) |
| `dataAvaliacao` | timestamp | ISO-8601; a data (não a hora) define o bucket |
| `produto` | string (chave) | FK/enum |
| `origem` | string (chave) | FK/enum |
| `riscoAtrelado` | string (chave) | FK/enum |
| `resultado` | enum | `APROVADA` \| `REPROVADA` |
| `parecerIa` | text | **markdown gerado por LLM** |
| `recomendacoesAjuste` | text | markdown; vazio quando aprovada |

### 4.2 Taxonomias

As chaves são estáveis (usadas em filtro e URL); os rótulos são exibição.

```
produtos: CARTAO, CREDITO_PESSOAL, CONSIGNADO, FINANCIAMENTO_VEICULO, SEGUROS, INVESTIMENTOS
origens:  AGENCIA, DIGITAL, PARCEIRO, CALL_CENTER, REDES_SOCIAIS
riscos:   COMPLIANCE(1), JURIDICO(2), OPERACIONAL(3), CONDUTA(4)   ← número = campo `ordem`
```

> **`riscoAtrelado` é categórico, não ordinal.** Antes era uma escala de severidade (Baixo→Crítico); virou tipo de risco. Consequência de design: **não use gradiente de cor** (verde→vermelho) nessa dimensão — use paleta categórica.

### 4.3 Índices sugeridos

```sql
CREATE INDEX idx_peca_data           ON peca_avaliada (data_avaliacao);
CREATE INDEX idx_peca_data_resultado ON peca_avaliada (data_avaliacao, resultado);
CREATE INDEX idx_peca_dimensoes      ON peca_avaliada (produto, origem, risco_atrelado);
```

Toda consulta filtra por intervalo de data; as agregações somam por dimensão dentro desse intervalo.

### 4.4 Endpoint de opções

`GET /filtros` devolve as taxonomias **e** o `periodoDisponivel` (menor e maior `dataAvaliacao` existentes), usado para limitar o date-range picker.

---

## 5. Contratos de API

Base: `{API_URL}/graficos-executivos`. Exemplos abaixo são **dados reais** da base de mock (974 peças), não inventados.

### 5.1 Endpoints

| Método | Path | Devolve |
|---|---|---|
| `GET` | `/graficos-executivos/filtros` | `OpcoesFiltroDto` |
| `GET` | `/graficos-executivos` | `DashboardGraficosDto` |
| `GET` | `/graficos-executivos/analitico` | `PaginaDto<LinhaAnaliticoDto>` |

### 5.2 Query params

| Param | Tipo | Obrigatório | Endpoints | Exemplo |
|---|---|---|---|---|
| `de` | `YYYY-MM-DD` | sim | dashboard, analítico | `2026-01-01` |
| `ate` | `YYYY-MM-DD` | sim | dashboard, analítico | `2026-09-15` |
| `granularidade` | `dia`\|`mes` | sim | dashboard, analítico | `mes` |
| `produto` | CSV | não | dashboard, analítico | `CARTAO,SEGUROS` |
| `origem` | CSV | não | dashboard, analítico | `AGENCIA` |
| `risco` | CSV | não | dashboard, analítico | `COMPLIANCE` |
| `periodo` | `YYYY-MM`\|`YYYY-MM-DD` | não | dashboard, analítico | `2026-03` |
| `pagina` | int (base 0) | sim | analítico | `0` |
| `tamanho` | int | sim | analítico | `10` |
| `ordenarPor` | enum | sim | analítico | `dataAvaliacao` |
| `direcao` | `asc`\|`desc` | sim | analítico | `desc` |

### 5.3 `GET /graficos-executivos/filtros`

```json
{
  "produtos": [
    { "chave": "CARTAO", "rotulo": "Cartão de Crédito" },
    { "chave": "CREDITO_PESSOAL", "rotulo": "Crédito Pessoal" },
    { "chave": "CONSIGNADO", "rotulo": "Consignado" },
    { "chave": "FINANCIAMENTO_VEICULO", "rotulo": "Financiamento de Veículo" },
    { "chave": "SEGUROS", "rotulo": "Seguros" },
    { "chave": "INVESTIMENTOS", "rotulo": "Investimentos" }
  ],
  "origens": [
    { "chave": "AGENCIA", "rotulo": "Agência" },
    { "chave": "DIGITAL", "rotulo": "Canal Digital" },
    { "chave": "PARCEIRO", "rotulo": "Parceiro / Correspondente" },
    { "chave": "CALL_CENTER", "rotulo": "Call Center" },
    { "chave": "REDES_SOCIAIS", "rotulo": "Redes Sociais" }
  ],
  "riscos": [
    { "chave": "COMPLIANCE", "rotulo": "Risco de Compliance e Regulatório", "ordem": 1 },
    { "chave": "JURIDICO", "rotulo": "Risco Jurídico (Legal)", "ordem": 2 },
    { "chave": "OPERACIONAL", "rotulo": "Risco Operacional", "ordem": 3 },
    { "chave": "CONDUTA", "rotulo": "Risco de Conduta", "ordem": 4 }
  ],
  "periodoDisponivel": { "de": "2024-08-01", "ate": "2026-09-13" }
}
```

### 5.4 `GET /graficos-executivos?de=2026-01-01&ate=2026-09-15&granularidade=mes`

```json
{
  "periodo": { "de": "2026-01-01", "ate": "2026-09-15" },
  "kpis": {
    "totalPecas": 370,
    "pecasAprovadas": 268,
    "pecasReprovadas": 102,
    "percentualReprovacao": 27.57,
    "periodoAnterior": {
      "totalPecas": 338,
      "pecasAprovadas": 233,
      "pecasReprovadas": 105,
      "percentualReprovacao": 31.07
    }
  },
  "granularidadeSerie": "mes",
  "serieTemporal": [
    { "periodo": "2026-01", "rotulo": "jan/26", "aprovadas": 25, "reprovadas": 8,  "percentualReprovacao": 24.24 },
    { "periodo": "2026-02", "rotulo": "fev/26", "aprovadas": 29, "reprovadas": 12, "percentualReprovacao": 29.27 },
    { "periodo": "2026-09", "rotulo": "set/26", "aprovadas": 21, "reprovadas": 3,  "percentualReprovacao": 12.5 }
  ],
  "reprovacaoPorRisco": [
    { "chave": "COMPLIANCE",  "rotulo": "Risco de Compliance e Regulatório", "ordem": 1, "total": 148, "reprovadas": 44, "percentualReprovacao": 29.73 },
    { "chave": "JURIDICO",    "rotulo": "Risco Jurídico (Legal)",            "ordem": 2, "total": 96,  "reprovadas": 26, "percentualReprovacao": 27.08 },
    { "chave": "OPERACIONAL", "rotulo": "Risco Operacional",                 "ordem": 3, "total": 82,  "reprovadas": 11, "percentualReprovacao": 13.41 },
    { "chave": "CONDUTA",     "rotulo": "Risco de Conduta",                  "ordem": 4, "total": 44,  "reprovadas": 21, "percentualReprovacao": 47.73 }
  ],
  "origemPorResultado": [
    { "chave": "DIGITAL",       "rotulo": "Canal Digital",             "aprovadas": 96, "reprovadas": 27, "totalPeriodoAnterior": 110, "reprovadasPeriodoAnterior": 31 },
    { "chave": "AGENCIA",       "rotulo": "Agência",                   "aprovadas": 64, "reprovadas": 19, "totalPeriodoAnterior": 78,  "reprovadasPeriodoAnterior": 21 },
    { "chave": "REDES_SOCIAIS", "rotulo": "Redes Sociais",             "aprovadas": 34, "reprovadas": 23, "totalPeriodoAnterior": 49,  "reprovadasPeriodoAnterior": 18 }
  ],
  "totalPorProduto": [
    { "chave": "CARTAO",          "rotulo": "Cartão de Crédito", "total": 101, "reprovadas": 26, "percentualReprovacao": 25.74 },
    { "chave": "CREDITO_PESSOAL", "rotulo": "Crédito Pessoal",   "total": 78,  "reprovadas": 19, "percentualReprovacao": 24.36 },
    { "chave": "INVESTIMENTOS",   "rotulo": "Investimentos",     "total": 27,  "reprovadas": 12, "percentualReprovacao": 44.44 }
  ],
  "atualizadoEm": "2026-09-15T13:19:05.799Z"
}
```

> `serieTemporal`, `reprovacaoPorRisco`, `origemPorResultado` e `totalPorProduto` estão abreviados acima para caber; na resposta real vêm todos os períodos e todas as dimensões com volume > 0.

### 5.5 `GET /graficos-executivos/analitico?...&pagina=0&tamanho=10&ordenarPor=dataAvaliacao&direcao=desc`

```json
{
  "conteudo": [
    {
      "id": "PC-10957",
      "produto": { "chave": "CARTAO", "rotulo": "Cartão de Crédito" },
      "dataAvaliacao": "2026-09-13T18:24:00",
      "resultado": "APROVADA",
      "riscoAtrelado": { "chave": "OPERACIONAL", "rotulo": "Risco Operacional" },
      "parecerIa": "Peça **em conformidade**. Custo Efetivo Total e prazo aparecem com o mesmo destaque da taxa promocional, atendendo à Resolução CMN 4.949.\n\nNenhum ajuste necessário.",
      "recomendacoesAjuste": ""
    },
    {
      "id": "PC-10099",
      "produto": { "chave": "SEGUROS", "rotulo": "Seguros" },
      "dataAvaliacao": "2024-11-26T12:42:00",
      "resultado": "REPROVADA",
      "riscoAtrelado": { "chave": "COMPLIANCE", "rotulo": "Risco de Compliance e Regulatório" },
      "parecerIa": "A peça apresenta **disclaimer em corpo inferior a 8pt**, abaixo do mínimo legível definido na política interna de comunicação.",
      "recomendacoesAjuste": "- Adicionar a identificação da instituição financeira no rodapé.\n- Incluir o range completo de taxas (**de X% a Y% a.m.**), não apenas o piso."
    }
  ],
  "pagina": 0,
  "tamanho": 10,
  "totalElementos": 370,
  "totalPaginas": 37
}
```

### 5.6 Erros

O frontend trata por faixa de status; o corpo do erro não é consumido.

| Status | Comportamento na UI |
|---|---|
| `0` (rede) | "Falha de conexão" + botão tentar novamente |
| `401` / `403` | "Sessão expirada" — **sem** botão de retry |
| `>= 500` | "Erro no servidor" + botão tentar novamente |
| demais `4xx` | mensagem genérica, sem retry |

---

## 6. Variáveis de ambiente e configuração

### 6.1 Variáveis

| Nome | Onde | Propósito |
|---|---|---|
| `API_URL` | configmap K8s → Apache | destino do proxy `/api/*` → BFF |

O frontend **não lê env var em runtime** — usa os arquivos de environment do Angular, trocados em build time.

```ts
// src/environments/environment.ts (desenvolvimento)
export const environment = {
  producao: false,
  usarMock: true,            // ← troca mock por HTTP
  api: { baseUrl: '/api', graficosExecutivos: '/graficos-executivos' },
  atrasoMockMs: 450,         // latência artificial p/ exercitar skeleton
};

// src/environments/environment.prod.ts
export const environment = {
  producao: true,
  usarMock: false,
  api: { baseUrl: '/api', graficosExecutivos: '/graficos-executivos' },
  atrasoMockMs: 0,
};
```

> **Ao migrar, `usarMock` deve ser `false` em todos os ambientes** e todo o `MockService` + `assets/mocks/` + `tools/gerar-mocks.js` devem ser descartados.

### 6.2 Configuração de build

| Config | Valor | Por quê |
|---|---|---|
| `fileReplacements` | `environment.ts` → `environment.prod.ts` | troca mock por HTTP em produção |
| `allowedCommonJsDependencies` | `["dompurify","markdown-it"]` | silencia warning legítimo de CommonJS |
| `budgets` (prod) | `initial: 1.5mb`, `anyComponentStyle: 12kb` | revalidar no projeto destino |
| `serviceWorker` (prod) | `true` | PWA; **conflita se o shell já registrar** |
| `styles` | `src/styles.scss` | inclui `@use 'paleta'` + utilitários |

**Tamanho atual do build de produção:**

| Bundle | Transferido |
|---|---|
| Initial total | 118 kB |
| Chunk lazy da feature | ~205 kB |

### 6.3 Runtime (Apache 2.4)

```apache
# rewrite SPA
RewriteRule ^ /index.html [L]

# proxy para o BFF
ProxyPass        /api/  ${API_URL}/
ProxyPassReverse /api/  ${API_URL}/
ProxyTimeout     300
```

Servindo `dist/browser/`, porta 8080, GKE.

---

## 7. Decisões técnicas e trade-offs

### D-01 · Chart.js + ng2-charts, não ECharts

| | |
|---|---|
| **Escolhido** | Chart.js 4.4.9 + ng2-charts 4.1.1 |
| **Motivo** | ~70 kB gzip com tree-shake vs. 300 kB+ do ECharts; `ng2-charts@4.1.1` é a **última versão compatível com Angular ≥14** (v5 exige 16) |
| **Descartado** | ECharts — recursos avançados (mapas, 3D, streaming) não são necessários aqui |
| **Custo aceito** | Chart.js exige plugins de canvas escritos à mão para coisas que o ECharts traz pronto (total no topo da coluna, faixa de hover) |

### D-02 · Estado em serviço com RxJS, não NgRx

**Imposição do projeto** (`.rules`: "Sem NgRx"). A página tem uma única fonte de filtro e cinco derivações — `BehaviorSubject` + `combineLatest` + `switchMap` resolve sem o boilerplate de actions/reducers/effects. O store é provido no **componente**, não em root, para o estado morrer com a página.

### D-03 · Serviço abstrato com duas implementações

```ts
{ provide: GraficosExecutivosService,
  useClass: environment.usarMock ? GraficosExecutivosMockService : GraficosExecutivosHttpService }
```

Permitiu construir a página inteira sem BFF. **Nenhum componente conhece a origem do dado.** Trocar para o BFF real é mudar uma flag. O mock virou, de quebra, a especificação executável da seção 3.

### D-04 · Stale-while-revalidate

**Problema real observado:** cada troca de filtro colapsava a página em skeleton — o conteúdo sumia, a altura encolhia e o scroll saltava.

**Solução:** `Recurso<T>` ganhou o campo `atualizando`, e o operador `manterDadoAnterior` (via `scan`) preserva o dado anterior durante a recarga. O card mantém a altura e só esmaece.

**Pegadinha:** exige `shareReplay({ refCount: false })`. Com `refCount: true`, o acumulador do `scan` morre quando o último subscriber sai e o efeito se perde.

### D-05 · Dual-axis resolvido por faixas separadas

O gráfico principal tem duas escalas (peças e %), o que é um anti-pattern clássico: o alinhamento entre elas é arbitrário e **inventa correlação visual**.

**Mitigação adotada** (mantendo a leitura combinada que o negócio pediu):

1. Barras confinadas à **metade inferior** (`grace: '82%'` no eixo de volume).
2. Linha confinada à **faixa superior** (`min` negativo no eixo percentual — valor não plotável, só deslocamento).
3. Escala da taxa em **patamares fixos de 25** (0–25/50/75/100), nunca relativa ao pico.

> O item 3 corrige um erro real: com escala relativa (`grace: '25%'`), a **mesma taxa de 25% aparecia em alturas diferentes só por trocar o filtro** — a linha "subia" sem o dado ter mudado, quebrando a comparação entre períodos.

### D-06 · Rótulos medidos em pixel, não em unidade de dado

O teste de "cabe o número dentro da barra?" usa a geometria renderizada:

```ts
const geometria = elemento.getProps(['base', 'y'], true);
return Math.abs(geometria.base - geometria.y) >= 18; // px
```

> Usar `getProps` (API oficial) e não `.base` direto: a propriedade vem `undefined` enquanto a animação não termina, e o rótulo simplesmente nunca aparecia.

### D-07 · Cross-filter: substitui dentro da dimensão, soma entre dimensões

Clicar em dois produtos seguidos deixa só o último; risco + origem + produto se acumulam.

**Motivo:** o card destaca **um** item por vez. Se o clique somasse, o destaque mentiria sobre o recorte aplicado. Quem precisa combinar vários da mesma dimensão usa o multi-select da barra de filtros — e aí nenhum card destaca nada, porque destacar só o primeiro seria igualmente enganoso.

### D-08 · Ordenação pela métrica exibida

Os três cards ordenam do maior para o menor **pela métrica que está na tela**, não por uma métrica interna.

> Erro cometido e corrigido: o card de risco chegou a ordenar por *taxa de reprovação* (visível só no tooltip) enquanto exibia *composição*. A lista parecia fora de ordem (43%, 26%, 21% embaralhados). Ordenar por `reprovadas` é equivalente à composição exibida, já que o denominador é o mesmo para todos.

### D-09 · Sanitização de markdown em três camadas

O `parecerIa` vem de LLM — conteúdo **não confiável** por definição.

```ts
markdown-it({ html: false })      // 1. não interpreta HTML embutido
  → DOMPurify.sanitize(...)       // 2. allowlist estreita de tags
  → DomSanitizer.bypassSecurityTrustHtml(...)  // 3. só depois de sanitizado
```

Coberto por testes que verificam que `<script>`, handlers inline (`onerror`), `<iframe>` e `javascript:` em href não chegam ao DOM. Na célula da tabela só entra texto plano truncado; o HTML só é renderizado no diálogo de detalhe.

### D-10 · Cores lidas em runtime, não hardcoded

Nenhum hex no TypeScript dos gráficos. Re-tematizar = editar `_paleta.scss`. O custo é uma indireção (`LeitorPaletaService`) e a necessidade de manter valores de reserva no código.

**Paleta validada** contra banda de luminosidade, piso de croma, separação sob daltonismo (ΔE) e piso de visão normal. Exceção conhecida e aceita: `--grf-linha-percentual` (#c9a13c) rende ~2,4:1 de contraste — abaixo dos 3:1 para objeto gráfico. É inerente a um âmbar claro; a compensação exigida está no lugar (cada ponto da linha carrega rótulo de valor visível, então nada depende só da cor).

### D-11 · Calendário navega um degrau por vez

O cabeçalho padrão do Material pula de **dias direto para anos** (grade 2016–2039). Foi substituído por `CabecalhoCalendarioComponent`, que **estende `MatCalendarHeader`** e sobrescreve apenas `currentPeriodClicked()`:

```
dias → meses do ano corrente → anos → dias
```

Além disso, `(monthSelected)` seleciona o **mês fechado** (dia 1 ao último, via "dia 0 do mês seguinte" — resolve fevereiro e bissexto) e fecha o picker.

> **Risco assumido:** o construtor do `MatCalendarHeader` não é API pública estável. Já foi preciso remover um `aria-describedby` porque `MatCalendar` não expõe `id` público no 15.2.9.

### D-12 · O botão "Limpar filtros" limpa tudo

Aparece com **qualquer** desvio do padrão — incluindo só a janela de tempo — e restaura o estado inicial completo.

> Versão anterior ignorava o período na contagem: quem selecionava "fevereiro" ficava sem nenhum caminho de volta. E, uma vez que o botão passa a aparecer *por causa* do período, preservá-lo faria o rótulo prometer o que não cumpre.

---

## 8. Passo a passo de implementação

### 8.1 Ordem recomendada

A ordem real usada foi **contrato → mock → UI → HTTP**, e ela se paga: dá para construir e validar a página inteira antes de o BFF existir.

| Fase | O que fazer | Entregável verificável |
|---|---|---|
| **1** | Escrever os DTOs (`graficos-executivos.dto.ts`) e o modelo de filtros | Compila; contrato fechado |
| **2** | Classe abstrata `GraficosExecutivosService` (3 métodos) | — |
| **3** | Backend: tabela + índices | Consulta por intervalo responde |
| **4** | BFF: os 3 endpoints com as regras da seção 3 | Payload bate com os exemplos da seção 5 |
| **5** | `HttpService` + `ApiUrlService` | Teste unitário dos query params |
| **6** | Store (`Recurso<T>`, `manterDadoAnterior`, observables) | Testes do store |
| **7** | Stubs do chassi (ou os componentes reais) | `cf-card` com os 4 estados |
| **8** | Container + sincronia de URL | Deep-link funciona |
| **9** | Componentes de apresentação, um a um | Cada um com seu spec |
| **10** | Estilos e tokens | Validar contraste |

> Se o BFF já existir no projeto destino, as fases 3–4 viram "conferir se o payload bate com a seção 5" e o resto não muda.

### 8.2 Checklist de validação

Confirma que o comportamento ficou idêntico ao original.

**Dados e filtros**

- [ ] Trocar preset (30 dias / 3 meses / Ano atual) recarrega **todos** os blocos
- [ ] Visão de 30 dias renderiza **por dia**; as outras **por mês**
- [ ] Dia/mês sem peças aparece como **zero**, não some do eixo
- [ ] Filtro por produto/origem/risco afeta KPIs, gráfico, 3 cards e tabela
- [ ] Dois produtos selecionados = OR; produto + origem = AND
- [ ] Date-range customizado funciona; clicar num mês seleciona o **mês fechado**
- [ ] Fevereiro seleciona `01/02–28/02` (ou 29 em bissexto)

**Cross-filter**

- [ ] Clicar numa coluna do gráfico recorta a página inteira
- [ ] Clicar na mesma coluna de novo desfaz
- [ ] A **série temporal continua mostrando todos os períodos** quando há recorte
- [ ] Clicar numa fatia do donut / linha de origem / linha de produto recorta a página
- [ ] Clicar no vazio do donut limpa o recorte de risco
- [ ] Dois itens selecionados na mesma dimensão ⇒ **nenhum** card destaca item

**Estados**

- [ ] Primeira carga mostra skeleton
- [ ] Recarga **mantém o dado anterior** esmaecido, sem mudar a altura do card
- [ ] Erro limpa os dados e mostra retry (exceto 401/403)
- [ ] `?simularErro=1` (se mantiver o mock) exercita o estado de erro

**URL**

- [ ] Filtros aparecem nos query params
- [ ] F5 preserva o recorte
- [ ] Colar a URL noutra aba reproduz o mesmo estado
- [ ] Navegação não polui o histórico (`replaceUrl`)

**Visual**

- [ ] Total impresso acima de cada coluna, acompanhando a altura
- [ ] % aparece em **todos** os pontos com dado, sem sobrepor
- [ ] Linha de taxa corre **acima** das barras, sem cruzá-las
- [ ] Mesma taxa (ex.: 25%) fica na mesma altura ao trocar de filtro
- [ ] Títulos dos 4 cards de gráfico em caixa alta e centralizados
- [ ] Responsivo a 420 px: cabeçalho empilha, títulos seguem centralizados

**Segurança e acessibilidade**

- [ ] Markdown com `<script>` / `onerror` / `javascript:` **não** executa
- [ ] Tabela e diálogo renderizam markdown legítimo (negrito, listas)
- [ ] Navegação por teclado atinge as linhas clicáveis (Tab + Enter/Espaço)
- [ ] `.apenas-leitor-tela` presente (senão o leitor de tela perde contexto)

**Build**

- [ ] `ng build --configuration production` sem erro e dentro dos budgets
- [ ] Suite de testes verde (referência: **127 testes**)

---

## 9. Dependências entre este projeto e o novo ambiente

### 9.1 Copiar como está

Não depende de nada do ambiente de origem:

```
features/graficos-executivos/     ← a feature inteira (11 componentes, store, dados, modelos)
core/services/api-url.service.ts
core/services/leitor-paleta.service.ts
core/services/markdown.service.ts
core/models/erro-carregamento.model.ts
core/paginador-pt-br.ts
styles/_paleta.scss
```

> Verificado por varredura: **a feature não importa nada do shell** (`app.module`, `app-routing`, `app.component`).

### 9.2 Adaptar

| Item | Ação |
|---|---|
| Path do BFF | Confirmar `/api/graficos-executivos`, `/filtros`, `/analitico` |
| Formato de lista em query | Assumido CSV (`produto=A,B`); confirmar com o BFF |
| Shape do payload | Envelope agregado único — confirmar com o BFF |
| Paginação | Assumido "Spring Data Page" simplificado |
| Rota e item de menu | Path `/graficos-executivos` e link do shell |
| Guard de rota/perfil | **Não existe** — acrescentar o do chassi |
| Stubs `cf-*` | Trocar pelos componentes do chassi, mantendo o contrato de `@Input`/`@Output` |
| Tema Material | `styles.scss` roda `mat.core()` + `mat.all-component-themes()`. **Se o chassi já tematiza, remover** — duplica CSS e pode sobrescrever o tema oficial |
| `LOCALE_ID` / `registerLocaleData('pt-BR')` / `MatPaginatorIntl` | Remover se o chassi já provê |
| Service worker | Remover o registro se o shell já registra — registrar duas vezes conflita |
| `.apenas-leitor-tela` | Migrar a classe utilitária, ou apontar para a equivalente do chassi |
| Budgets de build | Revalidar: a feature adiciona ~205 kB de chunk lazy |

### 9.3 Descartar

| Item | Motivo |
|---|---|
| `app.module.ts`, `app-routing.module.ts`, `app.component.*` | Shell provisório |
| `core/interceptors/auth-placeholder.interceptor.ts` | **Não faz nada**; o JWT é responsabilidade do interceptor do chassi (SSO Atlante) |
| `graficos-executivos-mock.service.ts` | Substituído pelo BFF real |
| `tools/gerar-mocks.js`, `src/assets/mocks/` | Dados sintéticos |
| `proxy.conf.json` | Só dev local; em produção quem faz proxy é o Apache |
| Scripts `prestart` / `pretest` / `pretest:ci` | Chamam `mock:gerar`; **quebram o CI** no projeto destino |

### 9.4 Acoplamentos frágeis — falham em silêncio

Os três degradam **sem erro nenhum**, o que os torna mais perigosos que uma quebra de build:

| # | Acoplamento | Se quebrar |
|---|---|---|
| 1 | `CabecalhoCalendarioComponent` estende `MatCalendarHeader` (API não pública) | Compilação quebra ao subir o Material — esse ao menos é barulhento |
| 2 | Realce de campo filtrado via `::ng-deep .mat-mdc-text-field-wrapper` / `.mdc-notched-outline__*` | Se o chassi trocar Material MDC por Foundation UI, **o realce some sem aviso** |
| 3 | Tokens `--cf-*` / `--grf-*` e `.apenas-leitor-tela` (globais) | Sem eles, gráficos caem nas **cores de reserva** hardcoded e o leitor de tela perde os textos — **tudo silenciosamente** |

---

## Anexo · Referência rápida de arquivos

| Arquivo | Linhas | Papel |
|---|---|---|
| `components/grafico-correlacao/grafico-correlacao.component.ts` | 475 | Gráfico principal + 2 plugins de canvas |
| `data/graficos-executivos-mock.service.ts` | 371 | **Especificação executável do BFF** (descartar ao migrar) |
| `components/barra-filtros/barra-filtros.component.ts` | 234 | Filtros, chips, resumo de seleção |
| `state/graficos-executivos.store.ts` | 236 | Store RxJS |
| `components/card-reprovacao-risco/card-reprovacao-risco.component.ts` | 215 | Donut + KPI central |
| `models/filtros.model.ts` | 181 | Filtros, presets, serialização de URL |
| `models/graficos-executivos.dto.ts` | 160 | **Contrato com o BFF** |
| `components/card-origem-resultado/card-origem-resultado.component.ts` | 154 | Tick bar + tabela com Δ |
| `containers/pagina-graficos-executivos/…component.ts` | 142 | Container smart |

> `grafico-correlacao.component.ts` está acima do limite recomendado de 300 linhas (soft). Um split dos plugins de canvas foi avaliado e **reprovado no teste net-neutral**: os plugins leem o estado do componente continuamente durante o draw, e extraí-los viraria passagem de estado por parâmetro. A decisão estrutural fica para quem migrar.
