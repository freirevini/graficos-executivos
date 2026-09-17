# Correção: tornar visível e segura a persistência da whitelist (BFF Spring Boot)

## Role & objective
Você é um engenheiro backend sênior. Um diagnóstico anterior (somente leitura) concluiu que usuários da whitelist somem porque o arquivo JSON acaba gravado em armazenamento não persistente quando o volume não está montado. Nesse caso, a aplicação recria em silêncio uma lista só com o admin de bootstrap.

Objetivo desta rodada: aplicar mudanças pequenas no BFF para:
1. falhar de forma explícita quando o volume persistente não estiver montado;
2. tornar o estado do armazenamento visível nos logs;
3. impedir que operações de cadastro/remoção se sobrescrevam;
4. documentar o runbook.

A causa de infraestrutura NÃO será resolvida aqui.

## Context
- Repositório: BFF `sboot-rreg-base-bff-agente-regulatorio` (Spring Boot). O frontend Angular 15.2.9 consome `/api`; a autenticação é via SSO Atlante (JWT). Nada disso muda nesta rodada.
- `UsuarioAutorizadoServiceImpl.java`: lê/grava o JSON, faz o CRUD e o bootstrap do admin.
  - `@Value` com fallback `java.io.tmpdir/conforme_whitelist.json` (~linha 37).
  - `ensureParentDirectory` faz `mkdirs` se o diretório não existir (~54-62).
  - `initializeStorage()`: se o arquivo não existe, grava `[]` e opcionalmente cria o admin (~48-94).
  - Log `Whitelist storage path=... exists=... size=...` (~44-45).
  - `carregarDados()` (~96-106) e `salvarDados()` com arquivo temporário + `Files.move` (~108-136), ambos `synchronized`.
  - Não há cache: cada operação relê o disco. Remoção é soft-delete via `dataRemocao`.
- Outros arquivos do fluxo:
  - `UsuarioAutorizado.java`: modelo.
  - `UsuarioAutorizadoController.java`: `/conforme/usuarios`, `/me`, `/removidos`, `/restaurar`.
  - `BffWhitelistFilter.java`: filtro fail-closed.
  - `AgenteRegulatorioUtils.java`: identidades do JWT.
- Configuração:
  - `application.yml`: `whitelist.file.path: ${WHITELIST_FILE_PATH:/var/conforme/data/conforme_whitelist.json}` (~97-99), com perfis `des`/`uat`/`prd`.
  - `application-local.yml`: caminho padrão em tmpdir (~64-66).
  - `infra-as-code/infra.yml`: `WHITELIST_FILE_PATH` (~70-73); PVC `conforme-whitelist-data` montado em `/var/conforme/data`, ReadWriteOnce (~115-120); `sessionAffinity: true` (~136); não declara réplicas.
- Teste existente: `UsuarioAutorizadoServiceImplTest` usa `@TempDir` e cobre a sobrevivência entre instâncias do service. Não roda localmente porque o parent POM Atlante não resolve; roda no CI.
- Documentação do fluxo: `docs/seg-acessos.md`.
- Os números de linha são aproximados; confirme lendo o código atual.
- Skills (use se instaladas): `springboot-patterns` (camadas/logging), `springboot-security` (falhar fechado), `springboot-tdd` (testes). Use como referência, sem mudar o padrão já existente no projeto.

## Task steps
0. **Ponto de partida.** Registre `git status` e `git log -1 --oneline` no BFF. Se houver alterações não commitadas, PARE e reporte.
1. **Mapear as escritas.** Leia `UsuarioAutorizadoServiceImpl.java` inteiro e liste cada método que faz carregar → alterar → salvar (cadastrar, atualizar, remover, restaurar, bootstrap). Anote se essa sequência roda sob um único lock ou se só `carregarDados`/`salvarDados` são sincronizados isoladamente.
2. **Atomicidade na mesma JVM.** Faça cada sequência carregar → alterar → salvar executar inteira sob um mesmo lock (ex.: `ReentrantLock` privado). Leituras simples podem ficar como estão, porque a troca via `Files.move` já é atômica.
3. **Atomicidade entre processos** (vários pods no mesmo volume).
   - Dentro do lock do passo 2, adquira um lock de arquivo com `FileChannel.lock()` sobre um arquivo irmão `<nome-do-json>.lock`, no mesmo diretório.
   - Libere o lock com try-with-resources.
   - Ordem obrigatória: primeiro o lock da JVM, depois o do arquivo (evita `OverlappingFileLockException`).
   - Registre no relatório que o lock de arquivo depende do suporte do storage.
4. **Nova propriedade** `whitelist.storage.require-existing-dir` (boolean, padrão `false`).
   - Com `true`: na inicialização, se o diretório pai não existir ou não for gravável, lance `IllegalStateException` com mensagem clara (caminho + "volume persistente não montado ou sem permissão de escrita"). NÃO crie diretório nem arquivo.
   - Com `false`: mantenha o comportamento atual. Porém, se o diretório precisar ser criado, logue WARN: "diretório da whitelist criado pela aplicação; se este ambiente usa volume persistente, ele não está montado".
   - Defina `true` somente no perfil `des` do `application.yml`. Não altere `uat`/`prd`.
5. **Remover o fallback silencioso** para `java.io.tmpdir` no `@Value` (~37), tornando a propriedade obrigatória.
   - ASSUMPTION: todos os perfis e testes já definem `whitelist.file.path`, direta ou indiretamente.
   - Verifique antes. Se algum não definir, NÃO remova o fallback e reporte.
6. **Log de inicialização.** Enriqueça a linha INFO existente com:
   - caminho, `exists`, tamanho e se o diretório já existia;
   - `name` e `type` do `Files.getFileStore` do diretório;
   - contagem de usuários ativos e removidos.

   Mensagens adicionais:
   - Se o arquivo for criado nesta inicialização, logue WARN: "whitelist inicializada vazia; se não for o primeiro deploy deste ambiente, o volume foi recriado ou não está montado".
   - Ao criar o admin de bootstrap, logue INFO sem o e-mail.
7. **Log de escritas.** Após cada operação de escrita, logue INFO com a operação e as contagens de ativos/removidos. Nunca logue e-mails, nomes ou matrículas.
8. **Testes** em `UsuarioAutorizadoServiceImplTest`, seguindo o estilo existente:
   - (a) `require-existing-dir=true` com diretório inexistente → a inicialização falha e nada é criado;
   - (b) `require-existing-dir=false` → comportamento atual preservado;
   - (c) N threads cadastrando usuários distintos em paralelo → todos persistidos após recarregar;
   - (d) o teste de sobrevivência entre instâncias continua passando.
9. **Runbook.** Adicione uma seção curta em `docs/seg-acessos.md` com:
   - requisitos de infra: PVC montado em `/var/conforme/data`, claim reaproveitado entre releases, e 1 réplica com estratégia Recreate (ou volume RWX se houver várias réplicas);
   - como validar após o deploy pelo log de inicialização, incluindo o que indica volume não montado;
   - a propriedade `require-existing-dir` e o plano de ativá-la em `uat`/`prd` após validar em `des`;
   - a regra do soft-delete: remover tira o acesso na hora, e a restauração é feita pela aba Removidos.
10. **Infra (somente leitura).** Leia `infra-as-code/infra.yml`. Verifique se o esquema da plataforma aceita chaves de réplicas, estratégia de deploy e política de reclaim do PVC. Procure no próprio arquivo, em `docs/` ou em outros `infra.yml` do workspace.
    - NÃO altere o arquivo.
    - Apenas escreva no relatório o diff sugerido, citando onde cada chave está documentada.

## Constraints
- Altere somente estes arquivos:
  - `UsuarioAutorizadoServiceImpl.java`;
  - `application.yml` (só a nova propriedade no perfil `des`);
  - `UsuarioAutorizadoServiceImplTest.java`;
  - `docs/seg-acessos.md`.

  Se precisar mexer em qualquer outro, PARE e justifique antes.
- NÃO altere:
  - `infra.yml`, `pom.xml`, parent POM, repositórios Maven, Dockerfile ou pipeline;
  - o frontend;
  - o fluxo SSO Atlante/JWT ou o `BffWhitelistFilter`;
  - os contratos REST.
- O formato do JSON em disco deve continuar idêntico: arquivos existentes em DES/UAT/PRD precisam ser lidos sem migração.
- Não adicione dependências.
- Não faça commit nem push; deixe as alterações para revisão.
- Não use dados reais da whitelist em testes, logs ou no relatório.

## Discovery steps
- ASSUMPTION: a base contém o commit `e714ab5` (ou posterior), com escrita atômica e caminho padrão `/var/conforme/data`. Se o código divergir do descrito no Context (ex.: sem `Files.move` ou sem `ensureParentDirectory`), PARE e reporte as diferenças antes de editar.
- ASSUMPTION: `application.yml` usa blocos por perfil. Se não houver um lugar claro para configurar só o `des`, PARE e reporte.
- Se o construtor do service não permitir injetar a nova propriedade nos testes, ajuste da forma mínima e coerente com o estilo existente (ex.: parâmetro no construtor), sem introduzir frameworks.

## Verification
- Tente `mvn -q test -Dtest=UsuarioAutorizadoServiceImplTest`. Se falhar pelo parent POM Atlante (bloqueio conhecido), NÃO tente contornar: registre o erro e informe o comando que o CI deve rodar.
- Sem compilar, revise manualmente:
  - imports;
  - `FileChannel` fechado via try-with-resources;
  - ordem dos locks (JVM → arquivo);
  - nenhum `mkdirs` quando `require-existing-dir=true`;
  - nenhum log com dado pessoal.
- Confirme com `git diff --stat` que só os arquivos permitidos mudaram.

## Report back
1. Ponto de partida (`git status`, último commit).
2. Resultado do passo 1: métodos de escrita e como estavam protegidos.
3. Alterações por arquivo (o quê e por quê, 1-2 linhas cada).
4. Exemplo das novas linhas de log, com valores fictícios.
5. Testes criados/alterados e resultado (ou motivo de não terem rodado + comando para o CI).
6. Diff sugerido para `infra.yml` (não aplicado), com a fonte de cada chave, ou "esquema não encontrado".
7. Riscos, dependências de infraestrutura e melhorias vistas mas fora do escopo.
8. `git diff --stat`.

## Model notes (composer-2.5)
Execute os passos na ordem, um de cada vez. Não amplie o escopo, mesmo que veja melhorias possíveis: liste-as no item 7 do relatório.
