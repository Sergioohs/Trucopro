# TrucoPro — Truco Paulista Online Multiplayer

Projeto de Truco Paulista online (4 jogadores, 2x2) com arquitetura **autoritativa no servidor**, matchmaking por MMR, salas privadas por código e frontend web em Next.js.

> Objetivo deste README: servir como guia prático para **subir direto em VPS**, operar em produção e entender a estrutura técnica sem precisar ler todo o código primeiro.

---

## 1) Visão geral

- **Frontend:** Next.js 14 + TypeScript + Tailwind
- **Backend:** Node.js + TypeScript + Express + Socket.io
- **Banco:** MongoDB
- **Infra:** Docker Compose + Nginx (reverse proxy)
- **Monorepo:** npm workspaces

### Princípios implementados

- Servidor autoritativo para regras de jogo
- Validação de turno e de carta jogada no backend
- Comunicação realtime via WebSocket (Socket.io)
- Persistência de usuário, histórico e partidas
- Operação simples por container (ou Node direto)

---

## 2) Funcionalidades implementadas

### Conta e perfil
- Login com `nickname + PIN` (com registro automático no primeiro acesso)
- JWT para sessão
- Perfil com:
  - avatar
  - vitórias / derrotas
  - winrate
  - MMR
  - histórico de partidas recentes

### Matchmaking e salas
- Fila rápida (`Jogar Agora`) com ETA
- Cancelamento de fila
- Matchmaking com balanceamento por MMR
- Sala privada com código e link
- Lobby com 4 posições, seleção de time e pronto
- Entrada por código de convite
- Reconexão por rejoin de código (até janela de presença)

### Motor do jogo (Truco Paulista)
- Baralho de 40 cartas
- 3 cartas por jogador
- Vira e manilha cíclica
- Desempate por naipe fixo: **paus < copas < espadas < ouros**
- Escada de truco: **1 → 3 → 6 → 9 → 12**
- Ações: pedir truco / aceitar / correr / aumentar
- Partida até 12 pontos
- Anti-AFK por turno (25s) com jogada automática

### Social / competição
- Chat rápido com frases e emojis
- Ranking global top 100 (filtro `daily`, `weekly`, `all`)
- Painel admin oculto (`/admin-hidden`)

---

## 3) Regras documentadas do Truco desta implementação

### Ordem base das cartas
`4 < 5 < 6 < 7 < Q < J < K < A < 2 < 3`

### Manilha
A manilha é a próxima carta da vira na ordem cíclica acima.

Exemplo:
- Vira = `K` → manilha = `A`
- Vira = `3` → manilha = `4`

### Desempate de manilha por naipe
`clubs (paus) < hearts (copas) < spades (espadas) < diamonds (ouros)`

### Pontuação de truco
Mão começa em **1 ponto** e pode escalar para:
`3`, `6`, `9`, `12`.

---

## 4) Estrutura do repositório

```bash
apps/
  server/                  # API HTTP + Socket.io + engine do jogo
    src/
      game/                # motor de Truco e matchmaking
      models/              # schemas Mongo
      services/            # auth, mmr, rate limit
      utils/               # logger
  web/                     # Next.js frontend
    app/                   # páginas e UI
    lib/                   # cliente socket
packages/
  shared/                  # tipos compartilhados
infra/nginx/
  default.conf             # reverse proxy
```

---

## 5) Variáveis de ambiente

Arquivo base: `.env.example`

```env
# Server
PORT=4000
MONGO_URI=mongodb://mongo:27017/trucopro
JWT_SECRET=change_me
LOG_LEVEL=info

# Web
NEXT_PUBLIC_API_URL=http://localhost:4000
NEXT_PUBLIC_WS_URL=http://localhost:4000
```

### Recomendação de produção
- Trocar `JWT_SECRET` por valor forte/único
- Em VPS com domínio+TLS, ajustar URLs públicas no frontend

---

## 6) Execução local (desenvolvimento)

```bash
cp .env.example .env
npm install
npm run dev
```

- Web: `http://localhost:3000`
- API/WS: `http://localhost:4000`

---

## 7) Execução com Docker (recomendada)

```bash
cp .env.example .env
docker compose up --build
```

Serviços:
- `mongo`
- `server`
- `web`
- `nginx`

Acesso principal: `http://localhost`

### Subir em background
```bash
docker compose up -d --build
```

### Logs
```bash
docker compose logs -f nginx
docker compose logs -f server
docker compose logs -f web
```

### Atualização
```bash
git pull
docker compose up -d --build
```

---

## 8) Deploy direto na VPS Ubuntu 22.04

## Opção A — Docker Compose (mais simples)

1. Instalar Docker Engine + Compose plugin
2. Clonar repo
3. Criar `.env`
4. Subir stack

```bash
git clone <repo>
cd Trucopro
cp .env.example .env
docker compose up -d --build
```

5. Liberar portas no firewall:
- `80/tcp` (Nginx)
- opcionalmente `443/tcp` se configurar TLS

6. (Opcional) TLS com Certbot/Nginx

## Opção B — Node direto (sem Docker)

Pré-requisitos:
- Node 20+
- npm
- MongoDB 7
- Nginx

Passos:
```bash
cp .env.example .env
npm install
npm run build
```

Subir processos (pm2/systemd recomendado):
```bash
npm run start --workspace @trucopro/server
npm run start --workspace @trucopro/web
```

Depois, configurar Nginx para:
- proxy `/` → `web:3000`
- proxy `/socket.io` + rotas API → `server:4000`

---

## 9) Endpoints e eventos principais

## HTTP (server)
- `POST /auth/login` → login/registro
- `GET /ranking?period=all|weekly|daily` → top 100
- `GET /admin/hidden/stats` → visão operacional
- `POST /admin/hidden/ban/:nickname` → ban simples

## Socket.io
- `auth`
- `queue:join`, `queue:cancel`
- `room:createPrivate`, `room:joinCode`, `room:ready`, `room:team`
- `game:play`, `game:truco`, `game:heartbeat`
- `chat:quick`

Server emits:
- `room:update`
- `queue:status`
- `room:created`
- `chat:quick`
- `match:over`

---

## 10) Segurança e integridade

- Regras de jogo no servidor (cliente não decide resultado)
- Validação de turno e carta
- JWT na autenticação socket
- Rate limit por socket/evento
- Logs estruturados
- Mecanismo de ban por nickname (admin)

---

## 11) Observabilidade e operação

### Checagem rápida de saúde
- abrir `/admin-hidden` no web (painel oculto)
- consultar `GET /admin/hidden/stats`

### Comandos úteis
```bash
docker compose ps
docker compose logs -f server
docker compose restart server
```

---

## 12) Limitações atuais (transparência)

Este projeto já está funcional para fluxo principal multiplayer, porém ainda pode evoluir em itens de “acabamento competitivo premium”, por exemplo:
- animações/som mais avançados
- tratamento completo de todas as variantes regionais (ex.: mão de 11/cangou em regras específicas de mesa)
- testes automatizados de engine/matchmaking em maior cobertura

---

## 13) Licença

Defina a licença do projeto conforme a necessidade do time (MIT/privada/etc.).
