# Trabalho realizado em PsicoManager

## Objetivo

Esse arquivo documenta todas as verificações e correções aplicadas ao projeto após o rename de `AgendaFlow` para `PsicoManager`.

## Principais arquivos modificados

- `backend/server.js`
- `backend/controllers/documentoController.js`
- `backend/controllers/agendamentoController.js`
- Arquivos estáticos de frontend em `frontend/**/*.html`, `frontend/**/*.js` e `frontend/**/*.css`
- `README.md`
- `README_WORK.md`
- `formato_das_pastas`

## Verificação do backend e startup

- Confirmei que o backend principal permanece em `backend/server.js`.
- O script `npm start` do root continua correto para iniciar o servidor com `node backend/server.js`.
- O servidor imprime o endereço de acesso no console: `🌐 Servidor rodando em: http://localhost:5000`.
- Verifiquei também que `backend/server.js` não apresenta erros de editor após as alterações.

## Rotas públicas e de autenticação revisadas

Revisão e validação das rotas expostas pelo servidor:

- `GET /` serve `pages/login.html`
- `GET /usuario-logado` retorna o estado de sessão do usuário
- `POST /logout` destrói a sessão existente
- `POST /api/cadastro` cria novo usuário no Supabase
- `POST /api/login` autentica usuário existente
- `GET /auth/*` são rotas públicas gerenciadas por `routes/googleRoutes`
- Rotas estáticas liberadas: `/styles`, `/scripts`, `/images`

## Rotas privadas e módulos revisados

O middleware de autenticação em `backend/server.js` protege as rotas não públicas.
As seguintes rotas/módulos estão registrados e foram verificados logicamente:

- `./routes/googleRoutes` — rotas de login com Google/OAuth
- `./routes/agendamentoRoutes` — rotas de agendamentos
- `./routes/systemRoutes` — rotas de sistema / CRUD geral sob `/api`
- `./routes/espacoRoutes` — rotas de espaços sob `/api/espacos`

## Integração com Supabase

- Confirmei a inicialização do client Supabase em `backend/server.js` com `createClient(supabaseUrl, supabaseKey)`.
- O servidor exige as variáveis de ambiente `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` ou `SUPABASE_KEY`.
- Há um aviso claro se o projeto estiver usando apenas `SUPABASE_KEY` em vez de `SUPABASE_SERVICE_ROLE_KEY`.
- As rotas de autenticação usam o Supabase para:
  - criar usuários (`.from('usuarios').insert(...)`)
  - consultar usuários por e-mail (`.from('usuarios').select('*').eq('email', email)`)

## Correções de branding e conteúdo

- Substituí todas as instâncias de `AgendaFlow` no frontend por `PsicoManager`.
- Alterei o template de contrato em `backend/controllers/documentoController.js` para `PsicoManager - Serviços Psicológicos`.
- Ajustei o texto de sincronização do Google Calendar em `backend/controllers/agendamentoController.js` para `Horário bloqueado via PsicoManager`.
- Altere o segredo de sessão em `backend/server.js` de `agendaflow` para `psicomanager`.
- Atualizei o arquivo de formato de pastas (`formato_das_pastas`) para remover a última referência a `logo-agendaflow.png`.

## Compatibilidade e observações

- Mantive a origem antiga em CORS por compatibilidade com possíveis deployments anteriores: `https://psicomanager-tl02.onrender.com`.
- Não foi necessário alterar a arquitetura de rotas, apenas o branding e alguns textos de integração.
- O servidor imprime o endereço de acesso em `backend/server.js`, garantindo que o projeto seja acessado via `http://localhost:5000` em vez de somente pelo Live Server do frontend.

## Frontend alterado

As mudanças de branding no frontend foram aplicadas em páginas e scripts estáticos, incluindo:

- `frontend/index.html`
- `frontend/pages/login.html`
- `frontend/pages/cadastro.html`
- `frontend/pages/calendario.html`
- `frontend/pages/clientes.html`
- `frontend/pages/pacientes.html`
- `frontend/pages/financeiro.html`
- `frontend/pages/convenios.html`
- `frontend/pages/planos.html`
- `frontend/pages/tarefas.html`
- `frontend/pages/lembretes.html`
- `frontend/pages/relatorios.html`
- `frontend/pages/documentos.html`
- `frontend/pages/espacos.html`
- `frontend/pages/bloqueio.html`
- `frontend/scripts/dashboard.js`
- `frontend/scripts/documentos.js`
- `frontend/scripts/lembretes.js`

## Testes realizados

- Inspeção de arquivo e rota do servidor
- Verificação de configuração Supabase em `backend/server.js`
- Checagem de erros de editor em `backend/server.js`, `backend/controllers/documentoController.js` e `backend/controllers/agendamentoController.js`
- Validação de que não há mais referências de `AgendaFlow` no código fonte do projeto

## Resultado final

- O projeto agora está com o branding `PsicoManager`.
- O backend funciona com a mesma estrutura de rotas e autenticação original.
- O servidor já informa o link de acesso `http://localhost:5000` no console.
- A documentação `README.md` e `README_WORK.md` foi criada/atualizada para refletir as alterações.
