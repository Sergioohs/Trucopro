# TrucoPro — Truco Paulista Online Multiplayer

Plataforma web multiplayer de Truco Paulista com arquitetura escalável (Next.js + Node.js + Socket.io + MongoDB), servidor autoritativo, matchmaking por MMR, salas privadas, ranking global e painel administrativo oculto.

## Stack
- **Frontend:** Next.js 14 + TypeScript + Tailwind
- **Backend:** Node.js + TypeScript + Express + Socket.io
- **Banco:** MongoDB
- **Infra:** Docker Compose + Nginx reverse proxy
- **Monorepo:** npm workspaces

## Regras do Truco Paulista implementadas
- Baralho de 40 cartas (`4,5,6,7,Q,J,K,A,2,3` x 4 naipes)
- 3 cartas por jogador, 3 rodadas por mão
- Vira define manilha por regra cíclica
- Desempate de manilha por naipe fixo: **paus < copas < espadas < ouros**
- Escada de truco: **1 → 3 → 6 → 9 → 12**
- Ações: pedir truco, aceitar, correr, aumentar
- Partida até 12 pontos
- Servidor autoritativo para validação de turno/carta

 codex/opa-56d81w
## Funcionalidades implementadas
=======
> Observação operacional: mão de 11/cangou e anti-AFK com timer de jogada foram estruturados para evolução, com heartbeat/reconexão e validações de ação já no servidor.

## Funcionalidades
 main
- Login com apelido + PIN (registro automático)
- JWT para autenticação
- Perfil com avatar, vitórias, derrotas, winrate, MMR e histórico recente
- Matchmaking por fila automática com cancelamento e ETA
- Salas privadas por código/link
- Lobby 4 posições, time e pronto
 codex/opa-56d81w
- Reconexão por código (até 120s)
- Anti-AFK por timer de turno (25s) com jogada automática
=======
- Reconexão (janela de 120s)
 main
- Chat rápido/emoji/provocações
- Ranking Top 100 (daily/weekly/all)
- Painel admin oculto `/admin-hidden`
- Logs estruturados e rate limit por socket

 codex/opa-56d81w
## Estrutura
=======
## Estrutura do projeto
 main

```bash
apps/
  server/        # API + Socket.io + engine autoritativo
  web/           # Next.js frontend
packages/
  shared/        # tipos compartilhados
infra/nginx/     # reverse proxy
```

 codex/opa-56d81w
## Rodar local (dev)
=======
## Rodando localmente (dev)
 main

```bash
cp .env.example .env
npm install
npm run dev
```

- Frontend: http://localhost:3000
- Backend: http://localhost:4000

 codex/opa-56d81w
## Rodar com Docker
=======
## Rodando com Docker Compose
 main

```bash
cp .env.example .env
docker compose up --build
```

Acesse: `http://localhost`

 codex/opa-56d81w
## Deploy direto na VPS Ubuntu 22.04

### Opção A (recomendada): Docker Compose
1. Instale Docker Engine + Compose plugin.
2. Clone o repo e crie `.env`:
   ```bash
   cp .env.example .env
   ```
3. Suba:
   ```bash
   docker compose up -d --build
   ```
4. Atualização:
   ```bash
   git pull
   docker compose up -d --build
   ```

### Opção B: processo Node direto (sem Docker)
1. Instale Node 20+, npm e MongoDB 7.
2. Configure `.env` e ajuste `MONGO_URI` para o Mongo local/VPS.
3. Build:
   ```bash
   npm install
   npm run build
   ```
4. Inicie backend e frontend (ex.: systemd/pm2):
   ```bash
   npm run start --workspace @trucopro/server
   npm run start --workspace @trucopro/web
   ```
5. Coloque Nginx na frente para proxy de `/:3000` e `/socket.io`/API para `:4000`.
=======
## Deploy VPS Ubuntu 22.04 (produção)
1. Instale Docker + Compose plugin.
2. Clone o repositório e crie `.env`.
3. Configure DNS apontando para a VPS.
4. Rode:
   ```bash
   docker compose up -d --build
   ```
5. (Opcional) coloque TLS via Nginx + certbot na VPS.
 main

## Variáveis de ambiente
Veja `.env.example`.

 codex/opa-56d81w
## Segurança atual
=======
## Segurança
 main
- Servidor autoritativo (gameplay validada no backend)
- Validação de turno/carta
- JWT
- Rate limit por socket
 codex/opa-56d81w
- Anti-AFK com timer por turno
=======
 main
- Logs estruturados
- Banimento por nickname via rota admin
