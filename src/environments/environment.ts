/**
 * Configuração de DESENVOLVIMENTO LOCAL.
 *
 * PONTO DE INTEGRAÇÃO: no projeto real, `usarMock` deve ser `false` em todos os
 * ambientes e `api.baseUrl` deve refletir o path que o Apache proxia para o BFF
 * (ver .rules: "Proxy /api/* -> BFF (API_URL via configmap)").
 */
export const environment = {
  producao: false,

  /** true = usa GraficosExecutivosMockService (assets/mocks). false = HttpClient real. */
  usarMock: true,

  api: {
    /** Prefixo do BFF. Montado em ApiUrlService. */
    baseUrl: '/api',
    /** PREMISSA: path do recurso no BFF. Confirmar nome exato na integração. */
    graficosExecutivos: '/graficos-executivos',
    /** PREMISSA: path do recurso da Home no BFF. */
    inicio: '/inicio',
  },

  /** Atraso artificial (ms) aplicado só pelo mock, para exercitar skeleton/loading. */
  atrasoMockMs: 450,
};
