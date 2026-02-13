'use client';
import { useEffect, useMemo, useState } from 'react';
import { socket } from '../lib/socket';

type Profile = {
  id: string;
  nickname: string;
  avatar: string;
  wins: number;
  losses: number;
  winrate: number;
  mmr: number;
  history: Array<{ matchId: string; won: boolean; score: string; at: string }>;
};

export default function HomePage() {
  const [nickname, setNickname] = useState('');
  const [pin, setPin] = useState('');
  const [profile, setProfile] = useState<Profile | null>(null);
  const [queue, setQueue] = useState<{ queued: boolean; estimateSec?: number }>({ queued: false });
  const [room, setRoom] = useState<any>(null);
  const [ranking, setRanking] = useState<any[]>([]);
  const [chat, setChat] = useState<Array<{ from: string; message: string }>>([]);
  const [inviteCode, setInviteCode] = useState('');

  const roomId = room?.id;
  const mySeat = useMemo(() => room?.seats?.find((s: any) => s?.userId === profile?.id), [room, profile]);

  async function login() {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nickname, pin })
    });
    const data = await res.json();
    if (!res.ok) return alert(data.error);
    setProfile(data.profile);
    socket.connect();
    socket.emit('auth', data.token, (r: any) => r.ok || alert('Falha auth socket'));
  }

  function quickPlay() { socket.emit('queue:join'); }
  function cancelQueue() { socket.emit('queue:cancel'); }
  function createPrivate() { socket.emit('room:createPrivate'); }
  function joinByCode() {
    if (!inviteCode.trim()) return;
    socket.emit('room:joinCode', inviteCode.trim().toUpperCase(), (r: any) => {
      if (!r.ok) alert(r.error || 'Não foi possível entrar na sala');
    });
  }

  useEffect(() => {
    socket.on('queue:status', setQueue);
    socket.on('room:update', setRoom);
    socket.on('room:created', (r) => {
      navigator.clipboard.writeText(`${window.location.origin}${r.link}`);
      alert(`Sala ${r.code} criada. Link copiado.`);
    });
    socket.on('chat:quick', (m) => setChat((c) => [...c, m].slice(-30)));
    socket.on('match:over', (m) => alert(`Fim da partida! Time ${m.winnerTeam + 1} venceu (${m.score[0]}-${m.score[1]})`));
    return () => {
      socket.off('queue:status');
      socket.off('room:update');
      socket.off('room:created');
      socket.off('chat:quick');
      socket.off('match:over');
    };
  }, []);

  useEffect(() => {
    const iv = setInterval(() => { if (roomId) socket.emit('game:heartbeat', roomId); }, 5000);
    return () => clearInterval(iv);
  }, [roomId]);

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/ranking?period=all`).then((r) => r.json()).then(setRanking);
  }, []);

  if (!profile) {
    return (
      <main className="min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-md space-y-3 rounded-xl bg-emerald-900 p-6 shadow-2xl">
          <h1 className="text-2xl font-bold">TrucoPro Paulista</h1>
          <input className="w-full rounded p-2 text-black" placeholder="Apelido" value={nickname} onChange={(e) => setNickname(e.target.value)} />
          <input className="w-full rounded p-2 text-black" placeholder="PIN" type="password" value={pin} onChange={(e) => setPin(e.target.value)} />
          <button className="w-full rounded bg-amber-400 p-2 font-semibold text-black" onClick={login}>Entrar</button>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto grid min-h-screen max-w-7xl grid-cols-1 gap-4 p-4 lg:grid-cols-3">
      <section className="rounded-xl bg-emerald-900 p-4">
        <h2 className="text-xl font-bold">Perfil</h2>
        <p>{profile.avatar} {profile.nickname}</p>
        <p>MMR: {Math.round(profile.mmr)}</p>
        <p>W/L: {profile.wins}/{profile.losses} ({Math.round(profile.winrate * 100)}%)</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button className="rounded bg-lime-500 px-3 py-2 font-semibold text-black" onClick={quickPlay}>Jogar Agora</button>
          <button className="rounded bg-zinc-300 px-3 py-2 text-black" onClick={cancelQueue}>Cancelar</button>
          <button className="rounded bg-cyan-400 px-3 py-2 text-black" onClick={createPrivate}>Sala privada</button>
        </div>
        <div className="mt-2 flex gap-2">
          <input className="w-36 rounded p-2 text-black" placeholder="Código da sala" value={inviteCode} onChange={(e) => setInviteCode(e.target.value)} />
          <button className="rounded bg-sky-300 px-3 py-2 text-black" onClick={joinByCode}>Entrar por código</button>
        </div>
        <p className="mt-2 text-sm">Fila: {queue.queued ? `buscando (ETA ${queue.estimateSec}s)` : 'fora da fila'}</p>
      </section>

      <section className="rounded-xl bg-emerald-800 p-4 lg:col-span-2">
        <h2 className="text-xl font-bold">Mesa</h2>
        {!room && <p>Aguardando sala...</p>}
        {room && (
          <>
            <p>Sala: {room.code}</p>
            <p>Mão valendo: {room.match?.handPoints ?? 1}</p>
            <p>Placar: {room.match?.score?.[0] ?? 0} x {room.match?.score?.[1] ?? 0}</p>
            <p>Rodada: {room.match?.round ?? '-'}</p>
            <div className="grid grid-cols-2 gap-2 py-2">
              {room.seats.map((s: any, i: number) => (
                <div key={i} className="rounded bg-emerald-700 p-2">
                  <p>{s ? `${s.nickname} (T${s.team + 1}) ${s.ready ? '✅' : '⏳'} ${s.connected ? '' : '🔌'}` : 'Vazio'}</p>
                  {s?.userId === profile.id && !room.match && (
                    <div className="mt-1 flex gap-1">
                      <button className="rounded bg-violet-300 px-2 text-black" onClick={() => socket.emit('room:team', { roomId: room.id, team: 0 })}>Time 1</button>
                      <button className="rounded bg-violet-300 px-2 text-black" onClick={() => socket.emit('room:team', { roomId: room.id, team: 1 })}>Time 2</button>
                      <button className="rounded bg-lime-400 px-2 text-black" onClick={() => socket.emit('room:ready', { roomId: room.id, ready: true })}>Pronto</button>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {room.match && (
              <div className="mt-3 rounded bg-emerald-950 p-3">
                <p>Vira: {room.match.vira.rank} {room.match.vira.suit} | Manilha: {room.match.manilhaRank}</p>
                <p>Vez: {room.match.seats[room.match.currentTurn]?.nickname}</p>
                <p className="text-xs">{room.match.manilhaRule}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <button className="rounded bg-amber-400 px-2 py-1 text-black" onClick={() => socket.emit('game:truco', { roomId: room.id, action: 'request' })}>Truco!</button>
                  <button className="rounded bg-amber-500 px-2 py-1 text-black" onClick={() => socket.emit('game:truco', { roomId: room.id, action: 'raise' })}>Aumentar</button>
                  <button className="rounded bg-lime-400 px-2 py-1 text-black" onClick={() => socket.emit('game:truco', { roomId: room.id, action: 'accept' })}>Aceitar</button>
                  <button className="rounded bg-rose-400 px-2 py-1 text-black" onClick={() => socket.emit('game:truco', { roomId: room.id, action: 'run' })}>Correr</button>
                </div>
                {mySeat && (
                  <div className="mt-2 flex gap-2">
                    {(room.selfHand || []).map((c: any, i: number) => (
                      <button key={i} className="card-enter rounded bg-white px-3 py-2 font-semibold text-black" onClick={() => socket.emit('game:play', { roomId: room.id, card: c })}>{c.rank} {c.suit}</button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </section>

      <section className="rounded-xl bg-emerald-900 p-4">
        <h2 className="text-xl font-bold">Top 100</h2>
        <ol className="text-sm">
          {ranking.slice(0, 10).map((r) => <li key={r.rank}>#{r.rank} {r.nickname} - {Math.round(r.mmr)}</li>)}
        </ol>
      </section>

      <section className="rounded-xl bg-emerald-900 p-4">
        <h2 className="text-xl font-bold">Chat rápido</h2>
        <div className="mb-2 flex flex-wrap gap-2">
          {['Truco!', 'Corre!', 'Seis!', '😎', '🔥'].map((m) => (
            <button key={m} className="rounded bg-zinc-200 px-2 py-1 text-black" onClick={() => roomId && socket.emit('chat:quick', { roomId, message: m })}>{m}</button>
          ))}
        </div>
        <div className="h-32 space-y-1 overflow-auto text-sm">
          {chat.map((m, i) => <p key={i}><b>{m.from}:</b> {m.message}</p>)}
        </div>
      </section>
    </main>
  );
}
