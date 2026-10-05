/* eslint-disable */
/**
 * Gera a base de mocks de desenvolvimento em src/assets/mocks/.
 *
 * A pasta de saída está no .gitignore: mock é artefato LOCAL e não deve ir para
 * o repositório. Este gerador, sim, é versionado — quem clonar roda
 * `npm run mock:gerar` (o `prestart` já faz isso automaticamente).
 *
 * O PRNG é semeado, então rodar de novo produz exatamente o mesmo conjunto:
 * screenshots e testes manuais continuam comparáveis entre execuções.
 */
const fs = require('fs');
const path = require('path');

const DESTINO = path.join(__dirname, '..', 'src', 'assets', 'mocks', 'graficos-executivos');
const DESTINO_INICIO = path.join(__dirname, '..', 'src', 'assets', 'mocks', 'inicio');
const MESES_DE_HISTORICO = 26; // 12 do período padrão + 12 do comparativo + folga
const PECAS_POR_MES = [28, 46];

// --- PRNG determinístico (LCG) ----------------------------------------------
let semente = 20260914;
const aleatorio = () => {
  semente = (semente * 1103515245 + 12345) % 2147483648;
  return semente / 2147483648;
};
const inteiro = (min, max) => min + Math.floor(aleatorio() * (max - min + 1));
const sortear = (lista) => lista[inteiro(0, lista.length - 1)];
const sortearPonderado = (pares) => {
  const total = pares.reduce((soma, [, peso]) => soma + peso, 0);
  let alvo = aleatorio() * total;
  for (const [valor, peso] of pares) {
    alvo -= peso;
    if (alvo <= 0) return valor;
  }
  return pares[pares.length - 1][0];
};

// --- Dimensões ---------------------------------------------------------------
const produtos = [
  { chave: 'CARTAO', rotulo: 'Cartão de Crédito', peso: 26, viesReprovacao: 1.15 },
  { chave: 'CREDITO_PESSOAL', rotulo: 'Crédito Pessoal', peso: 21, viesReprovacao: 1.05 },
  { chave: 'CONSIGNADO', rotulo: 'Consignado', peso: 17, viesReprovacao: 1.3 },
  { chave: 'FINANCIAMENTO_VEICULO', rotulo: 'Financiamento de Veículo', peso: 16, viesReprovacao: 0.9 },
  { chave: 'SEGUROS', rotulo: 'Seguros', peso: 12, viesReprovacao: 0.85 },
  { chave: 'INVESTIMENTOS', rotulo: 'Investimentos', peso: 8, viesReprovacao: 1.4 },
];

const origens = [
  { chave: 'AGENCIA', rotulo: 'Agência', peso: 22, viesReprovacao: 0.8 },
  { chave: 'DIGITAL', rotulo: 'Canal Digital', peso: 30, viesReprovacao: 1.0 },
  { chave: 'PARCEIRO', rotulo: 'Parceiro / Correspondente', peso: 20, viesReprovacao: 1.45 },
  { chave: 'CALL_CENTER', rotulo: 'Call Center', peso: 13, viesReprovacao: 1.1 },
  { chave: 'REDES_SOCIAIS', rotulo: 'Redes Sociais', peso: 15, viesReprovacao: 1.25 },
];

// Tipo de risco atrelado à peça — categórico, não mais uma escala ordinal de
// severidade (era Baixo/Médio/Alto/Crítico). `ordem` aqui só fixa a ordem de
// exibição estável nas listas, sem implicar gradiente de gravidade.
const riscos = [
  { chave: 'COMPLIANCE', rotulo: 'Risco de Compliance e Regulatório', ordem: 1, peso: 30, baseReprovacao: 0.30 },
  { chave: 'JURIDICO', rotulo: 'Risco Jurídico (Legal)', ordem: 2, peso: 22, baseReprovacao: 0.24 },
  { chave: 'OPERACIONAL', rotulo: 'Risco Operacional', ordem: 3, peso: 33, baseReprovacao: 0.13 },
  { chave: 'CONDUTA', rotulo: 'Risco de Conduta', ordem: 4, peso: 15, baseReprovacao: 0.34 },
];

// --- Textos ricos (markdown) -------------------------------------------------
const pareceresAprovada = [
  'Peça **em conformidade**. Custo Efetivo Total e prazo aparecem com o mesmo destaque da taxa promocional, atendendo à Resolução CMN 4.949.\n\nNenhum ajuste necessário.',
  'Análise concluída **sem apontamentos**. Verificados:\n\n- presença do CET anual;\n- identificação da instituição financeira;\n- ausência de promessa de retorno garantido.',
  'Material **aprovado**. A expressão *"sujeito a análise de crédito"* está legível e o disclaimer ocupa área compatível com a peça principal.',
  'Conteúdo alinhado ao código de autorregulação. O público-alvo declarado é compatível com o produto anunciado e **não há apelo a endividamento**.',
];

const pareceresReprovada = [
  'Peça **reprovada**. A taxa de juros é exibida apenas na modalidade mensal, sem o equivalente anual, contrariando a Resolução CMN 4.949.\n\n> O CET também não foi localizado na peça.',
  'Foram identificados **dois apontamentos graves**:\n\n1. ausência do Custo Efetivo Total;\n2. uso do termo *"aprovação imediata"*, que sugere isenção de análise de crédito.',
  'Reprovada por **omissão de condicionantes**. O benefício anunciado depende de contratação de seguro não mencionado no material.',
  'A peça apresenta **disclaimer em corpo inferior a 8pt**, abaixo do mínimo legível definido na política interna de comunicação.',
  'Reprovada: comparativo com concorrentes **sem fonte nem data-base**, prática vedada pelo código de autorregulação da FEBRABAN.',
];

const recomendacoes = [
  '- Incluir o **CET anual** com o mesmo destaque tipográfico da taxa promocional.\n- Acrescentar a data-base da simulação.',
  '1. Substituir *"aprovação imediata"* por **"sujeito a análise de crédito"**.\n2. Elevar o corpo do disclaimer para no mínimo 8pt.\n3. Reenviar para nova avaliação.',
  '- Explicitar que o benefício está **condicionado à contratação do seguro prestamista**.\n- Citar o número do processo SUSEP.',
  '- Citar **fonte e data-base** do comparativo.\n- Remover o superlativo *"a menor taxa do mercado"* ou sustentá-lo com pesquisa auditável.',
  '- Adicionar a identificação da instituição financeira no rodapé.\n- Incluir o range completo de taxas (**de X% a Y% a.m.**), não apenas o piso.',
];

// Pipeline de IA do projeto: técnica RAG (regras de compliance e de negócio) com 2
// agentes em sequência. Toda peça passa pelos dois, então a "participação" é 100%.
const modelosIa = [
  { chave: 'GEMINI_38FLASH', rotulo: 'Gemini 3.8 Flash', papel: 'Agente de triagem: entende o contexto da peça e prepara as informações para o avaliador', faixaSegundos: [6, 14], versao: '3.8-flash', dataLancamento: '09/2024', logo: 'gemini' },
  { chave: 'GEMINI_31PRO', rotulo: 'Gemini 3.1 Pro', papel: 'Agente avaliador: aplica as regras e o RAG à peça e gera o resultado estruturado', faixaSegundos: [18, 50], versao: '3.1-pro', dataLancamento: '07/2024', logo: 'gemini' },
];

// --- Geração -----------------------------------------------------------------
const hoje = new Date();
const pecas = [];
let sequencial = 10000;

for (let recuo = MESES_DE_HISTORICO - 1; recuo >= 0; recuo--) {
  const cursor = new Date(hoje.getFullYear(), hoje.getMonth() - recuo, 1);
  const ano = cursor.getFullYear();
  const mes = cursor.getMonth();
  const ultimoDia = new Date(ano, mes + 1, 0).getDate();
  const ehMesCorrente = recuo === 0;

  // Tendência leve de crescimento de volume ao longo do histórico.
  const fatorVolume = 0.75 + (MESES_DE_HISTORICO - recuo) / MESES_DE_HISTORICO * 0.5;
  let quantidade = Math.round(inteiro(PECAS_POR_MES[0], PECAS_POR_MES[1]) * fatorVolume);
  if (ehMesCorrente) {
    quantidade = Math.round(quantidade * (hoje.getDate() / ultimoDia));
  }

  for (let i = 0; i < quantidade; i++) {
    const produto = sortearPonderado(produtos.map((p) => [p, p.peso]));
    const origem = sortearPonderado(origens.map((o) => [o, o.peso]));
    const risco = sortearPonderado(riscos.map((r) => [r, r.peso]));

    const dia = ehMesCorrente ? inteiro(1, hoje.getDate()) : inteiro(1, ultimoDia);
    const probabilidade = Math.min(
      0.95,
      risco.baseReprovacao * produto.viesReprovacao * origem.viesReprovacao,
    );
    const reprovada = aleatorio() < probabilidade;
    const duracaoAnaliseSegundos = modelosIa.reduce((soma, m) => soma + inteiro(m.faixaSegundos[0], m.faixaSegundos[1]), 0);

    pecas.push({
      id: `PC-${sequencial++}`,
      dataAvaliacao: `${ano}-${String(mes + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}T${String(ehMesCorrente && dia === hoje.getDate() ? inteiro(0, Math.max(0, hoje.getHours() - 1)) : inteiro(8, 19)).padStart(2, '0')}:${String(inteiro(0, 59)).padStart(2, '0')}:00`,
      produto: produto.chave,
      origem: origem.chave,
      riscoAtrelado: risco.chave,
      resultado: reprovada ? 'REPROVADA' : 'APROVADA',
      parecerIa: reprovada ? sortear(pareceresReprovada) : sortear(pareceresAprovada),
      recomendacoesAjuste: reprovada ? sortear(recomendacoes) : '',
      duracaoAnaliseSegundos,
    });
  }
}

pecas.sort((a, b) => (a.dataAvaliacao < b.dataAvaliacao ? 1 : -1));

const primeira = pecas[pecas.length - 1].dataAvaliacao.slice(0, 10);
const ultima = pecas[0].dataAvaliacao.slice(0, 10);

const filtros = {
  produtos: produtos.map(({ chave, rotulo }) => ({ chave, rotulo })),
  origens: origens.map(({ chave, rotulo }) => ({ chave, rotulo })),
  riscos: riscos.map(({ chave, rotulo, ordem }) => ({ chave, rotulo, ordem })),
  periodoDisponivel: { de: primeira, ate: ultima },
};

const tempoMedioSegundos = Math.round(
  pecas.reduce((soma, p) => soma + p.duracaoAnaliseSegundos, 0) / pecas.length,
);

const configuracao = {
  modelos: modelosIa.map(({ chave, rotulo, papel, versao, dataLancamento, logo }) => {
    return {
      chave,
      rotulo,
      papel,
      participacaoPercentual: 100,
      versao,
      dataLancamento,
      logo,
    };
  }),
  tempoMedioSegundos,
  versaoPrompt: 'v3.2.1',
  janelaDados: { de: primeira, ate: ultima },
  atualizadoEm: hoje.toISOString(),
};

fs.mkdirSync(DESTINO, { recursive: true });
fs.mkdirSync(DESTINO_INICIO, { recursive: true });
fs.writeFileSync(path.join(DESTINO, 'pecas.mock.json'), JSON.stringify(pecas, null, 2));
fs.writeFileSync(path.join(DESTINO, 'filtros.mock.json'), JSON.stringify(filtros, null, 2));
fs.writeFileSync(path.join(DESTINO_INICIO, 'configuracao.mock.json'), JSON.stringify(configuracao, null, 2));

const reprovadas = pecas.filter((p) => p.resultado === 'REPROVADA').length;
console.log(`[mocks] ${pecas.length} peças de ${primeira} a ${ultima}`);
console.log(`[mocks] ${reprovadas} reprovadas (${((reprovadas / pecas.length) * 100).toFixed(1)}%)`);
console.log(`[mocks] tempo médio de análise: ${tempoMedioSegundos}s`);
console.log(`[mocks] destino: ${path.relative(process.cwd(), DESTINO)}`);
console.log(`[mocks] destino: ${path.relative(process.cwd(), DESTINO_INICIO)}`);
