# Diagnóstico: whitelist de acesso perde usuários cadastrados (BFF Spring Boot)

## Role & objective
Você é um engenheiro backend sênior investigando um bug de persistência. Objetivo desta rodada: DIAGNOSTICAR, sem alterar nenhum arquivo, por que usuários adicionados à whitelist de acesso deixam de constar ou perdem o acesso depois de algum tempo. Entregue um relatório com a causa-raiz provável, as evidências e uma proposta de correção. Nenhuma correção deve ser aplicada nesta rodada.

## Context
- Frontend: Angular 15.2.9 com Angular Material 15.2.9, TypeScript 4.9.5. As chamadas do front vão para `/api`, atendido por um BFF em Spring Boot.
- Autenticação: SSO corporativo Atlante (CA-API, endpoint `/J_SECURITY_CHECK`), que emite JWT. O login em si funciona.
- Controle de acesso: uma whitelist mantida no BFF, persistida em um arquivo JSON, define quem pode acessar após o login (pode haver perfis, ex.: admin e comum). O Angular consome essa API no fluxo de login.
- Sintoma: usuários são cadastrados na whitelist com sucesso, mas depois de um tempo deixam de ser reconhecidos.
- Skills: se estiverem instaladas, siga `systematic-debugging` para conduzir a investigação por evidências. Use `springboot-patterns` e `springboot-security` apenas como referência de leitura.

## Task steps
1. Localize a implementação da whitelist no BFF: classes que leem/escrevem o JSON (busque por `whitelist`, `allowlist`, `.json`, `ObjectMapper`, `ClassPathResource`, `ResourceLoader`, `@Value`, `Files.write`, `FileWriter`), os endpoints de cadastro/remoção e o ponto onde o acesso é checado.
2. Descreva o ciclo de vida do dado:
   - de onde o arquivo é lido no startup;
   - onde fica em memória (campo, `@Cacheable`, bean singleton);
   - quando e como é gravado;
   - qual caminho físico é usado na leitura e na escrita. Resolva `application*.yml/properties`, perfis ativos e variáveis de ambiente.
3. Avalie cada hipótese e marque CONFIRMADA / DESCARTADA / INCONCLUSIVA, com evidência no formato arquivo:linha:
   - H1: o JSON é lido do classpath (`src/main/resources`, `classpath:`). A escrita não persiste ou vai para uma cópia temporária, e no restart volta a versão empacotada.
   - H2: o arquivo é gravado no filesystem do container/servidor sem armazenamento persistente (`/tmp`, `java.io.tmpdir`, diretório relativo) e se perde em restart/redeploy.
   - H3: o arquivo é versionado no Git e copiado no build/deploy (Dockerfile `COPY`, pipeline, resources), sobrescrevendo o conteúdo a cada deploy.
   - H4: há mais de uma instância do BFF (réplicas/pods), cada uma com sua própria cópia do arquivo.
   - H5: a escrita não é atômica nem sincronizada. Exemplos: read-modify-write sem lock, ou escrita direta que trunca o arquivo antes de gravar. Isso permite perder atualizações ou corromper o JSON.
   - H6: em erro de leitura/parse, o código cai para lista vazia/padrão e depois grava por cima, apagando dados válidos. Inclui exceções engolidas sem log.
   - H7: as alterações ficam só em memória e nunca são gravadas, ou são gravadas num caminho diferente do lido (ex.: caminho relativo ao working dir).
   - H8: não é problema de armazenamento: o usuário continua no arquivo, mas a checagem falha. Exemplos: identificador do JWT diferente do salvo (maiúsculas/minúsculas, espaços, matrícula vs e-mail), ou expiração/renovação do JWT tratada como "sem acesso".
4. Leia (sem alterar) os arquivos de deploy/infra presentes no repositório: Dockerfile, manifests Kubernetes/OpenShift, pipeline CI/CD. Extraia número de réplicas, volumes montados e working dir.
5. Consolide a causa-raiz mais provável (pode ser uma combinação) e proponha a correção.

## Constraints
- Rodada SOMENTE LEITURA: não edite, crie ou apague arquivos. Não rode nada que altere estado (commit, deploy, escrita no JSON real).
- Pode rodar testes existentes e build local, desde que isso não modifique arquivos versionados.
- Não altere nem proponha alterar o fluxo de autenticação SSO Atlante/JWT. O foco é a whitelist.
- No frontend Angular, apenas leia o serviço/endpoint/payload usado no cadastro e no login, se necessário.
- Não exponha dados reais da whitelist (nomes, e-mails, matrículas) no relatório. Use contagens ou valores mascarados.

## Discovery steps
- ASSUMPTION: a whitelist está no repositório do BFF Spring Boot. Se não encontrar, PARE e reporte onde procurou.
- ASSUMPTION: a persistência é um único arquivo JSON. Se houver banco, cache distribuído ou outro mecanismo, PARE a análise de hipóteses e descreva o mecanismo real.
- ASSUMPTION: a equipe só controla os arquivos do repositório e não consegue alterar infraestrutura (volumes, réplicas). Se a correção depender disso, diga explicitamente em vez de assumir que é possível.
- Se réplicas/volumes não estiverem definidos no repositório, marque H2/H4 como INCONCLUSIVA e liste exatamente o que precisa ser confirmado com o time de infraestrutura.
- Se já existir teste cobrindo a persistência da whitelist, rode-o e reporte o resultado.

## Verification
Antes de concluir, confirme que:
- todas as hipóteses H1–H8 têm status e evidência (ou o motivo de estarem inconclusivas);
- o caminho físico do arquivo foi resolvido considerando perfil ativo e variáveis de ambiente;
- `git status` não mostra nenhuma alteração feita por você.

## Report back
Imprima ao final, nesta ordem:
1. Mapa da implementação: arquivos/classes envolvidos (caminho + papel em 1 linha).
2. Ciclo de vida do dado: leitura → memória → escrita, com o caminho físico resolvido.
3. Tabela H1–H8: status | evidência (arquivo:linha) | observação.
4. Causa-raiz provável e grau de confiança (alto/médio/baixo).
5. Correção proposta em passos, arquivos que seriam alterados e se ela depende de algo fora do repositório (volume persistente, banco, réplica única).
6. Perguntas em aberto para o time.
7. Saída de `git status` confirmando zero alterações.

## Model notes
- composer-2.5: siga os passos na ordem e respeite a regra de somente leitura, mesmo que a correção pareça óbvia. Se achar a causa já no passo 1, ainda assim complete a tabela H1–H8.
- Grok 4.5 High: priorize descartar hipóteses com evidência em vez de reforçar a primeira. Dê atenção especial a H6 e H8, que se parecem com perda de dados sem ser.
