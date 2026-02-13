import { v4 as uuid } from 'uuid';
import { newMatch, PlayerSeat, TrucoState } from './trucoEngine';

export interface QueuePlayer {
  userId: string;
  nickname: string;
  avatar: string;
  mmr: number;
  socketId: string;
  queuedAt: number;
}

export interface Room {
  id: string;
  code: string;
  private: boolean;
  seats: Array<{ userId: string; nickname: string; avatar: string; team: 0 | 1; ready: boolean; socketId: string; connected: boolean } | null>;
  match?: TrucoState;
  createdAt: number;
  lastSeen: Record<string, number>;
}

export class MatchmakingService {
  queue: QueuePlayer[] = [];
  rooms = new Map<string, Room>();

  enqueue(player: QueuePlayer) {
    this.queue = this.queue.filter((q) => q.userId !== player.userId);
    this.queue.push(player);
  }

  dequeue(userId: string) {
    this.queue = this.queue.filter((q) => q.userId !== userId);
  }

  tickBuildMatches() {
    this.queue.sort((a, b) => a.queuedAt - b.queuedAt);
    if (this.queue.length < 4) return [] as Room[];

    const made: Room[] = [];
    for (let i = 0; i + 3 < this.queue.length;) {
      const chunk = this.queue.slice(i, i + 4);
      const avg = chunk.reduce((s, p) => s + p.mmr, 0) / 4;
      const maxDelta = Math.max(...chunk.map((p) => Math.abs(p.mmr - avg)));
      if (maxDelta <= 250 || Date.now() - chunk[0].queuedAt > 10000) {
        const room = this.createRoom(false);
        chunk.forEach((p, idx) => {
          room.seats[idx] = {
            userId: p.userId,
            nickname: p.nickname,
            avatar: p.avatar,
            team: (idx % 2) as 0 | 1,
            ready: true,
            socketId: p.socketId,
            connected: true
          };
          room.lastSeen[p.userId] = Date.now();
        });
        this.startRoom(room.id);
        made.push(room);
        this.queue.splice(i, 4);
      } else {
        i += 1;
      }
    }
    return made;
  }

  createRoom(isPrivate: boolean) {
    const room: Room = {
      id: uuid(),
      code: Math.random().toString(36).slice(2, 8).toUpperCase(),
      private: isPrivate,
      seats: [null, null, null, null],
      createdAt: Date.now(),
      lastSeen: {}
    };
    this.rooms.set(room.id, room);
    return room;
  }

  startRoom(roomId: string) {
    const room = this.rooms.get(roomId);
    if (!room) throw new Error('Sala não encontrada');
    const seated = room.seats.filter(Boolean);
    if (seated.length !== 4 || seated.some((s) => !s!.ready)) throw new Error('Sala incompleta');
    const players: PlayerSeat[] = seated.map((s) => ({ userId: s!.userId, nickname: s!.nickname, team: s!.team, hand: [] }));
    room.match = newMatch(room.id, players);
  }
}
