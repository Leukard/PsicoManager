# PsicoManager

**PsicoManager** é um sistema de agendamento e gestão para serviços psicológicos.

## Arquitetura

- Backend: `Node.js` + `Express`
- Frontend: arquivos estáticos HTML/CSS/JS em `frontend`
- Banco de dados: `Supabase` via `@supabase/supabase-js`
- Autenticação: `express-session` e login com Google
- Rotas principais: `backend/routes/*`

## Funcionalidades

- Login com Google e cadastro de usuários
- Verificação de sessão e proteção de rotas
- Gestão de agendamentos, pacientes, convênios, planos, documentos, lembretes e financeiro
- Sincronização com Google Calendar para bloqueios/agendamentos
- Geração de documentos com templates
- Jobs agendados com `node-cron` para lembretes e backups

## Como executar

1. Copie o arquivo `.env` para `backend/.env` e defina as variáveis:
   - `SUPABASE_URL`
   - `SUPABASE_KEY` ou `SUPABASE_SERVICE_ROLE_KEY`
   - outras variáveis de configuração de Google/Google OAuth se necessário

2. No diretório raiz `PsicoManager`, instale dependências:

```bash
npm install
```

3. Inicie o servidor:

```bash
npm start
```

4. Acesse no navegador:

```text
http://localhost:5000
```

## Observações

- O servidor principal é `backend/server.js`.
- O frontend é servido estaticamente a partir da pasta `frontend`.
- O app imprime o endereço de acesso no console.
- A porta padrão é `5000`.

## Estrutura de pastas

- `backend/` - código do servidor e rotas
- `frontend/` - interface do usuário
- `package.json` - scripts e dependências

## Pontos importantes

- O projeto usa `Supabase` para manipulação de dados e autenticação.
- A sessão é mantida com `express-session`.
- O backend também registra tarefas agendadas com `node-cron`.
