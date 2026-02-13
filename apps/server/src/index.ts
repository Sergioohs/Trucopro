import express from 'express';
import http from 'http';
import cors from 'cors';
import pinoHttp from 'pino-http';
import mongoose from 'mongoose';
import { Server } from 'socket.io';
import { z } from 'zod';
import { config } from './config';
import { logger } from './utils/logger';
import { loginOrRegister, verifyToken } from './services/auth';
import { MatchmakingService } from './game/matchmaking';
import { allowAction } from './services/rateLimiter';
import { UserModel } from './models/User';
import { MatchModel } from './models/Match';
import { answerTruco, playCard, requestTruco, TrucoRules } from './game/trucoEngine';
import { updateMmr } from './services/mmr';

const app = express();
app.use(cors());
app.use(express.json());
app.use(pinoHttp({ logger }));

const matchmaking = new MatchmakingService();

app.post('/auth/login', async (req, res) => {
  const body = z.object({ nickname: z.string().min(3), pin: z.string().min(4).max(12) }).parse(req.body);
  try {
    const { token, user } = await loginOrRegister(body.nickname, body.pin);
    res.json({ token, profile: {
      id: user.id,
      nickname: user.nickname,
      avatar: user.avatar,
      wins: user.wins,
      losses: user.losses,
      winrate: user.wins + user.losses > 0 ? user.wins / (user.wins + user.losses) : 0,
      mmr: user.mmr,
      history: user.matchHistory.slice(-20)
    } });
  } catch (e: any) {
    res.status(401).json({ error: e.message });
  }
});

app.get('/ranking', async (req, res) => {
  const period = String(req.query.period || 'all');
  const since = period === 'daily' ? new Date(Date.now() - 86400000) : period === 'weekly' ? new Date(Date.now() - 7 * 86400000) : null;
  const q = since ? { 'matchHistory.at': { $gte: since } } : {};
  const players = await UserModel.find(q).sort({ mmr: -1 }).limit(100);
  res.json(players.map((p, i) => ({ rank: i + 1, nickname: p.nickname, mmr: p.mmr, wins: p.wins, losses: p.losses })));
});

app.get('/admin/hidden/stats', async (_req, res) => {
  const onlinePlayers = Array.from(io.sockets.sockets.values()).length;
  const activeRooms = Array.from(matchmaking.rooms.values()).map((r) => ({
    id: r.id,
    code: r.code,
    players: r.seats.filter(Boolean).length,
    inGame: Boolean(r.match)
  }));
  const lastMatches = await MatchModel.find().sort({ endedAt: -1 }).limit(30);
  res.json({ onlinePlayers, activeRooms, lastMatches });
});

app.post('/admin/hidden/ban/:nickname', async (req, res) => {
  await UserModel.updateOne({ nickname: req.params.nickname }, { $set: { banned: true } });
  res.json({ ok: true });
});

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

 codex/opa-56d81w
const turnTimers = new Map<string, { turn: number; deadline: number }>();

function refreshTurnTimer(roomId: string) {
  const room = matchmaking.rooms.get(roomId);
  if (!room?.match || room.match.over) return;
  const prev = turnTimers.get(roomId);
  if (!prev || prev.turn !== room.match.currentTurn) {
    turnTimers.set(roomId, { turn: room.match.currentTurn, deadline: Date.now() + config.turnTimerSec * 1000 });
  }
}

=======
 main
function roomSnapshot(roomId: string) {
  const room = matchmaking.rooms.get(roomId);
  if (!room) return null;
  return {
    id: room.id,
    code: room.code,
    seats: room.seats,
    match: room.match ? {
      id: room.match.id,
      score: room.match.score,
      handPoints: room.match.handPoints,
      vira: room.match.vira,
      manilhaRank: room.match.manilhaRank,
      currentTurn: room.match.currentTurn,
      round: room.match.round,
      trick: room.match.trick,
      trickWins: room.match.trickWins,
      lastRoundCards: room.match.lastRoundCards,
      over: room.match.over,
      suitOrder: TrucoRules.suitOrder,
      manilhaRule: TrucoRules.manilhaRule,
      seats: room.match.seats.map((s) => ({ userId: s.userId, nickname: s.nickname, team: s.team, cardCount: s.hand.length }))
    } : null
  };
}

function emitRoom(roomId: string) {
 codex/opa-56d81w
  const base = roomSnapshot(roomId);
  if (!base) return;
  const room = matchmaking.rooms.get(roomId);
  if (!room?.match) {
    io.to(roomId).emit('room:update', base);
    refreshTurnTimer(roomId);
    return;
  }

  refreshTurnTimer(roomId);

  room.match.seats.forEach((seat) => {
    const socketId = room.seats.find((s) => s?.userId === seat.userId)?.socketId;
    if (!socketId) return;
    io.to(socketId).emit('room:update', {
      ...base,
      selfHand: seat.hand
    });
  });
=======
  io.to(roomId).emit('room:update', roomSnapshot(roomId));
 main
}

setInterval(() => {
  const made = matchmaking.tickBuildMatches();
  made.forEach((room) => {
    room.seats.filter(Boolean).forEach((s) => io.sockets.sockets.get(s!.socketId)?.join(room.id));
    emitRoom(room.id);
  });
}, 1000);

setInterval(() => {
  const now = Date.now();
  matchmaking.rooms.forEach((room) => {
    room.seats.forEach((seat) => {
      if (!seat) return;
      if (now - (room.lastSeen[seat.userId] || now) > config.reconnectGraceSec * 1000) {
        seat.connected = false;
      }
    });
  });
}, 5000);

 codex/opa-56d81w

setInterval(() => {
  const now = Date.now();
  turnTimers.forEach((timer, roomId) => {
    const room = matchmaking.rooms.get(roomId);
    if (!room?.match || room.match.over) return;
    if (now < timer.deadline) return;

    const seat = room.match.seats[timer.turn];
    const fallbackCard = seat.hand[0];
    if (!fallbackCard) return;

    try {
      playCard(room.match, timer.turn, fallbackCard);
      io.to(roomId).emit('chat:quick', { from: 'Sistema', message: `${seat.nickname} ficou AFK e jogou automático.` });
      emitRoom(roomId);
      if (room.match.over) finalizeMatch(roomId);
    } catch {
      // noop: state may have advanced concurrently
    }
  });
}, 1000);

=======
 main
io.on('connection', (socket) => {
  let auth: { uid: string; nickname: string } | null = null;

  socket.on('auth', (token: string, cb) => {
    try {
      auth = verifyToken(token);
      cb({ ok: true });
    } catch {
      cb({ ok: false });
    }
  });

  socket.on('queue:join', async () => {
    if (!auth) return;
    const user = await UserModel.findById(auth.uid);
    if (!user) return;
    matchmaking.enqueue({ userId: auth.uid, nickname: auth.nickname, avatar: user.avatar, mmr: user.mmr, socketId: socket.id, queuedAt: Date.now() });
    socket.emit('queue:status', { queued: true, estimateSec: 10 });
  });

  socket.on('queue:cancel', () => {
    if (!auth) return;
    matchmaking.dequeue(auth.uid);
    socket.emit('queue:status', { queued: false });
  });

  socket.on('room:createPrivate', () => {
    if (!auth) return;
    const room = matchmaking.createRoom(true);
    socket.join(room.id);
    socket.emit('room:created', { roomId: room.id, code: room.code, link: `/room/${room.code}` });
  });

  socket.on('room:joinCode', async (code: string, cb) => {
    if (!auth) return cb({ ok: false });
    const room = Array.from(matchmaking.rooms.values()).find((r) => r.code === code.toUpperCase());
    if (!room) return cb({ ok: false, error: 'Sala não encontrada' });
 codex/opa-56d81w

    const existingSeat = room.seats.find((s) => s?.userId === auth.uid);
    if (existingSeat) {
      existingSeat.socketId = socket.id;
      existingSeat.connected = true;
      room.lastSeen[auth.uid] = Date.now();
      socket.join(room.id);
      emitRoom(room.id);
      return cb({ ok: true, roomId: room.id, reconnected: true });
    }

=======
 main
    const user = await UserModel.findById(auth.uid);
    const idx = room.seats.findIndex((s) => !s);
    if (idx < 0 || !user) return cb({ ok: false, error: 'Sala cheia' });
    room.seats[idx] = { userId: auth.uid, nickname: auth.nickname, avatar: user.avatar, team: (idx % 2) as 0 | 1, ready: false, socketId: socket.id, connected: true };
    room.lastSeen[auth.uid] = Date.now();
    socket.join(room.id);
    emitRoom(room.id);
    cb({ ok: true, roomId: room.id });
  });

  socket.on('room:ready', ({ roomId, ready }) => {
    if (!auth) return;
    const room = matchmaking.rooms.get(roomId);
    if (!room) return;
    const seat = room.seats.find((s) => s?.userId === auth!.uid);
    if (!seat) return;
    seat.ready = Boolean(ready);
    room.lastSeen[auth.uid] = Date.now();
    if (room.seats.filter(Boolean).length === 4 && room.seats.every((s) => s?.ready)) {
      matchmaking.startRoom(roomId);
    }
    emitRoom(roomId);
  });

  socket.on('room:team', ({ roomId, team }) => {
    if (!auth) return;
    const room = matchmaking.rooms.get(roomId);
    if (!room || room.match) return;
    const seat = room.seats.find((s) => s?.userId === auth!.uid);
    if (!seat || (team !== 0 && team !== 1)) return;
    seat.team = team;
    emitRoom(roomId);
  });

  socket.on('game:heartbeat', (roomId: string) => {
    if (!auth) return;
    const room = matchmaking.rooms.get(roomId);
    if (!room) return;
    room.lastSeen[auth.uid] = Date.now();
  });

  socket.on('game:play', ({ roomId, card }) => {
    if (!auth) return;
    if (!allowAction(`${socket.id}:play`)) return;
    const room = matchmaking.rooms.get(roomId);
    if (!room?.match) return;
    const idx = room.match.seats.findIndex((s) => s.userId === auth!.uid);
    if (idx < 0) return;
    try {
      playCard(room.match, idx, card);
      emitRoom(roomId);
      if (room.match.over) finalizeMatch(roomId);
    } catch (e: any) {
      socket.emit('error:msg', e.message);
    }
  });

  socket.on('game:truco', ({ roomId, action }) => {
    if (!auth) return;
    if (!allowAction(`${socket.id}:truco`)) return;
    const room = matchmaking.rooms.get(roomId);
    if (!room?.match) return;
    const idx = room.match.seats.findIndex((s) => s.userId === auth!.uid);
    if (idx < 0) return;
    try {
      if (action === 'request') requestTruco(room.match, idx);
      else answerTruco(room.match, idx, action);
      emitRoom(roomId);
      if (room.match.over) finalizeMatch(roomId);
    } catch (e: any) {
      socket.emit('error:msg', e.message);
    }
  });

  socket.on('chat:quick', ({ roomId, message }) => {
    if (!auth) return;
    const allowed = ['Truco!', 'Corre!', 'Seis!', 'Nove!', 'Doze!', 'Boa!', '😅', '🔥', '😎'];
    if (!allowed.includes(message)) return;
    io.to(roomId).emit('chat:quick', { from: auth.nickname, message });
  });

  socket.on('disconnect', () => {
    if (!auth) return;
    matchmaking.dequeue(auth.uid);
    matchmaking.rooms.forEach((room) => {
      room.seats.forEach((s) => {
        if (s?.userId === auth!.uid) s.connected = false;
      });
      emitRoom(room.id);
    });
  });
});

async function finalizeMatch(roomId: string) {
  const room = matchmaking.rooms.get(roomId);
  if (!room?.match) return;
  const winnerTeam = room.match.score[0] >= 12 ? 0 : 1;
  const loserTeam = winnerTeam === 0 ? 1 : 0;
  const teamAIds = room.match.seats.filter((s) => s.team === 0).map((s) => s.userId);
  const teamBIds = room.match.seats.filter((s) => s.team === 1).map((s) => s.userId);
  const aUsers = await UserModel.find({ _id: { $in: teamAIds } });
  const bUsers = await UserModel.find({ _id: { $in: teamBIds } });
  const avgA = aUsers.reduce((s, u) => s + u.mmr, 0) / aUsers.length;
  const avgB = bUsers.reduce((s, u) => s + u.mmr, 0) / bUsers.length;
  const { newA, newB } = updateMmr(avgA, avgB, winnerTeam === 0 ? 1 : 0);

  for (const u of aUsers) {
    const won = winnerTeam === 0;
    u.mmr += newA - avgA;
    if (won) u.wins += 1; else u.losses += 1;
    u.matchHistory = [...u.matchHistory.slice(-19), { matchId: room.id, won, score: `${room.match.score[0]}-${room.match.score[1]}`, at: new Date() }];
    await u.save();
  }
  for (const u of bUsers) {
    const won = winnerTeam === 1;
    u.mmr += newB - avgB;
    if (won) u.wins += 1; else u.losses += 1;
    u.matchHistory = [...u.matchHistory.slice(-19), { matchId: room.id, won, score: `${room.match.score[0]}-${room.match.score[1]}`, at: new Date() }];
    await u.save();
  }

  await MatchModel.create({
    players: room.match.seats.map((s) => s.nickname),
    teamA: teamAIds,
    teamB: teamBIds,
    scoreA: room.match.score[0],
    scoreB: room.match.score[1],
    winnerTeam,
    startedAt: new Date(room.createdAt),
    endedAt: new Date(),
    durationSec: Math.round((Date.now() - room.createdAt) / 1000),
    ranked: !room.private
  });

  io.to(roomId).emit('match:over', { winnerTeam, score: room.match.score });
 codex/opa-56d81w
  turnTimers.delete(roomId);
=======
 main
}

async function bootstrap() {
  await mongoose.connect(config.mongoUri);
  server.listen(config.port, () => logger.info(`Server on ${config.port}`));
}

bootstrap().catch((e) => {
  logger.error(e);
  process.exit(1);
});
