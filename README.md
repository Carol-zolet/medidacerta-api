# medidacerta-api

Backend NestJS do MedidaCerta — API REST em NestJS + TypeScript, com PostgreSQL via Prisma ORM.
Projeto acadêmico (Fase 2 de uma disciplina), preparado para rodar localmente e ser deployado no Render.

## Stack

- NestJS + TypeScript
- PostgreSQL + Prisma ORM
- Autenticação JWT (bcrypt para hash de senha)
- Validação com class-validator
- Documentação automática com Swagger (`/api`)

## Setup local

### 1. Variáveis de ambiente

```bash
cp .env.example .env
```

Edite `.env` se necessário (por padrão já aponta para o Postgres do `docker-compose`).

### 2. Subir o Postgres

```bash
docker compose up -d db
```

### 3. Instalar dependências

```bash
npm install
```

### 4. Rodar as migrations

```bash
npm run prisma:migrate
```

### 5. Rodar em modo dev

```bash
npm run start:dev
```

A API sobe em `http://localhost:3000`. Documentação Swagger em `http://localhost:3000/api`.

## Rodando tudo via Docker

```bash
docker compose up --build
```

Sobe a API e o Postgres juntos. Rode as migrations manualmente na primeira vez:

```bash
docker compose exec api npx prisma migrate deploy
```

## Comandos Prisma úteis

| Comando | Descrição |
|---|---|
| `npm run prisma:generate` | Gera o Prisma Client |
| `npm run prisma:migrate` | Cria/aplica migration em dev |
| `npm run prisma:deploy` | Aplica migrations pendentes (produção) |
| `npm run prisma:studio` | Abre o Prisma Studio |

## Endpoints principais

### Auth
- `POST /auth/register` — cria usuário
- `POST /auth/login` — retorna JWT

### Users (autenticado)
- `GET /users/me`
- `DELETE /users/me`

### Medidas
- `POST /medidas` (autenticado) — cria/atualiza medidas; gera `codigo_acesso` na primeira vez
- `GET /medidas/me` (autenticado)
- `GET /api/v1/medidas/:codigo` (público) — consulta por código de acesso

## Deploy no Render

1. Crie um Web Service apontando para este repositório, runtime Docker (usa o `Dockerfile` da raiz).
2. Crie um banco PostgreSQL no Render (ou externo) e configure `DATABASE_URL` nas env vars do serviço.
3. Configure `JWT_SECRET` e `JWT_EXPIRES_IN` nas env vars.
4. Rode `npx prisma migrate deploy` como *Pre-Deploy Command* (ou manualmente via shell do Render) antes do primeiro deploy.
