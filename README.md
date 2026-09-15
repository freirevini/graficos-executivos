# Gráficos Executivos — pacote de implementação

Feature Angular 15 de painel executivo de conformidade regulatória: KPIs, gráfico
combinado de volume × taxa de reprovação com cross-filter, três cards de composição
(risco/origem/produto, também clicáveis) e relatório analítico paginado com parecer
de IA em markdown sanitizado.

**Este repositório não roda sozinho.** É o pacote portável extraído de um projeto
maior (`front-conforme`), pronto para ser colado em outro projeto Angular 15 que já
tenha frontend, BFF e backend configurados para deploy — conforme pedido no
desenvolvimento original.

## Leia primeiro

**[`implementation-page.md`](./implementation-page.md)** — documentação técnica completa:
visão geral, todos os componentes, gerenciamento de estado, especificação do BFF
(derivada da regra de negócio), contratos de API com JSON real, variáveis de
ambiente, 12 decisões técnicas com o motivo de cada uma, passo a passo de
implementação e checklist de validação.

Este README é só o mapa de arquivos. Toda decisão, todo trade-off e todo "por quê"
estão no documento acima — não duplicado aqui de propósito, para não haver duas
fontes divergindo.

## O que tem aqui

```
src/app/features/graficos-executivos/   # a feature inteira — 11 componentes,
                                          # store RxJS, DTOs, service HTTP (sem mock)
src/app/shared/chassi/                   # 5 stubs de UI — trocar pelo chassi real
src/app/core/services/                   # api-url, leitor-paleta, markdown (sanitização)
src/app/core/models/                     # normalização de erro HTTP
src/app/core/paginador-pt-br.ts          # tradução do mat-paginator
src/styles/_paleta.scss                  # todos os tokens de cor, lidos em runtime
implementation-page.md                   # documentação completa (leia isso)
```

**Excluído de propósito** (ver seção 9.3 do documento): serviço de mock, gerador de
dados sintéticos, shell da aplicação (`app.module`/`app-routing`/`app.component`),
interceptor de autenticação placeholder, `environment.*`. Nenhum desses faz sentido
fora do projeto de origem — o documento explica exatamente o que recriar no lugar de
cada um.

## Antes de compilar no projeto destino

1. Ler a seção **9 (Dependências entre este projeto e o novo ambiente)** do
   `implementation-page.md` — separa "copiar como está" de "adaptar" de "descartar".
2. Instalar as dependências da seção **2.2**, nas versões exatas (travadas).
3. Aplicar os deltas de `tsconfig.json` e `angular.json` da seção **2.2** / **6.2**.
4. Criar `src/environments/environment.ts` no formato da seção **6.1**.
5. Implementar os 3 endpoints do BFF conforme as seções **3** e **5**.
6. Seguir o checklist de validação da seção **8.2**.

## Stack de origem

Angular 15.2.9 · TypeScript 4.9.5 · RxJS 7.8.1 · Chart.js 4.4.9 + ng2-charts 4.1.1 ·
markdown-it + DOMPurify · sem NgRx (estado via services + RxJS).
