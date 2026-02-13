import { Card, Rank, Suit } from '@trucopro/shared';

const ranks: Rank[] = ['4', '5', '6', '7', 'Q', 'J', 'K', 'A', '2', '3'];
const suitOrder: Suit[] = ['clubs', 'hearts', 'spades', 'diamonds'];

export type TrucoLevel = 1 | 3 | 6 | 9 | 12;

export interface PlayerSeat {
  userId: string;
  nickname: string;
  team: 0 | 1;
  hand: Card[];
}

export interface TrucoState {
  id: string;
  seats: PlayerSeat[];
  dealer: number;
  currentTurn: number;
  score: [number, number];
  handPoints: TrucoLevel;
  vira: Card;
  manilhaRank: Rank;
  trick: { player: number; card: Card }[];
  trickWins: [number, number];
  round: 1 | 2 | 3;
  pendingTrucoBy?: number;
  currentTrucoIdx: number;
  over: boolean;
  lastRoundCards: { player: number; card: Card }[][];
}

const trucoLevels: TrucoLevel[] = [1, 3, 6, 9, 12];

export function createDeck(): Card[] {
  const deck: Card[] = [];
  for (const rank of ranks) for (const suit of suitOrder) deck.push({ rank, suit });
  return deck;
}

export function shuffle<T>(arr: T[]) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function cyclicManilha(vira: Rank): Rank {
  const idx = ranks.indexOf(vira);
  return ranks[(idx + 1) % ranks.length];
}

function power(card: Card, manilha: Rank) {
  if (card.rank === manilha) return 100 + suitOrder.indexOf(card.suit);
  return ranks.indexOf(card.rank);
}

export function newMatch(id: string, players: Omit<PlayerSeat, 'hand'>[]): TrucoState {
  const seats = players.map((p) => ({ ...p, hand: [] }));
  const deck = shuffle(createDeck());
  for (let i = 0; i < 3; i++) seats.forEach((s) => s.hand.push(deck.pop()!));
  const vira = deck.pop()!;
  return {
    id,
    seats,
    dealer: 0,
    currentTurn: 1,
    score: [0, 0],
    handPoints: 1,
    vira,
    manilhaRank: cyclicManilha(vira.rank),
    trick: [],
    trickWins: [0, 0],
    round: 1,
    currentTrucoIdx: 0,
    over: false,
    lastRoundCards: []
  };
}

function resetHand(state: TrucoState) {
  const deck = shuffle(createDeck());
  state.seats.forEach((s) => {
    s.hand = [deck.pop()!, deck.pop()!, deck.pop()!];
  });
  state.vira = deck.pop()!;
  state.manilhaRank = cyclicManilha(state.vira.rank);
  state.trick = [];
  state.round = 1;
  state.trickWins = [0, 0];
  state.handPoints = 1;
  state.pendingTrucoBy = undefined;
  state.currentTrucoIdx = 0;
  state.dealer = (state.dealer + 1) % 4;
  state.currentTurn = (state.dealer + 1) % 4;
  state.lastRoundCards = [];
}

export function playCard(state: TrucoState, playerIdx: number, card: Card) {
  if (state.over) throw new Error('Partida encerrada');
  if (state.currentTurn !== playerIdx) throw new Error('Não é sua vez');
  const seat = state.seats[playerIdx];
  const handIndex = seat.hand.findIndex((c) => c.rank === card.rank && c.suit === card.suit);
  if (handIndex < 0) throw new Error('Carta inválida');
  seat.hand.splice(handIndex, 1);
  state.trick.push({ player: playerIdx, card });
  state.currentTurn = (state.currentTurn + 1) % 4;

  if (state.trick.length === 4) {
    const ranked = state.trick.map((t) => ({ ...t, p: power(t.card, state.manilhaRank) }));
    ranked.sort((a, b) => b.p - a.p);
    const winner = ranked[0].player;
    state.trickWins[state.seats[winner].team] += 1;
    state.lastRoundCards.push(state.trick);
    state.trick = [];
    state.currentTurn = winner;
    if (state.trickWins[0] === 2 || state.trickWins[1] === 2 || state.round === 3) {
      const winTeam = state.trickWins[0] > state.trickWins[1] ? 0 : 1;
      state.score[winTeam] += state.handPoints;
      if (state.score[0] >= 12 || state.score[1] >= 12) {
        state.over = true;
      } else {
        resetHand(state);
      }
    } else {
      state.round = (state.round + 1) as 1 | 2 | 3;
    }
  }
}

export function requestTruco(state: TrucoState, playerIdx: number) {
  if (state.pendingTrucoBy !== undefined) throw new Error('Já existe pedido');
  if (state.currentTrucoIdx >= trucoLevels.length - 1) throw new Error('Limite do truco');
  state.pendingTrucoBy = playerIdx;
}

export function answerTruco(state: TrucoState, answerBy: number, action: 'accept' | 'run' | 'raise') {
  if (state.pendingTrucoBy === undefined) throw new Error('Sem pedido de truco');
  if (state.seats[answerBy].team === state.seats[state.pendingTrucoBy].team) throw new Error('Time errado');
  if (action === 'run') {
    const winnerTeam = state.seats[state.pendingTrucoBy].team;
    state.score[winnerTeam] += state.handPoints;
    state.pendingTrucoBy = undefined;
    if (state.score[winnerTeam] >= 12) state.over = true;
    else resetHand(state);
    return;
  }
  if (action === 'accept') {
    state.currentTrucoIdx += 1;
    state.handPoints = trucoLevels[state.currentTrucoIdx];
    state.pendingTrucoBy = undefined;
    return;
  }
  if (action === 'raise') {
    state.currentTrucoIdx += 1;
    if (state.currentTrucoIdx >= trucoLevels.length) throw new Error('Não pode aumentar');
    state.handPoints = trucoLevels[state.currentTrucoIdx];
    state.pendingTrucoBy = answerBy;
  }
}

export const TrucoRules = {
  suitOrder,
  trucoLevels,
  manilhaRule: 'Cíclica pela vira: próxima carta na ordem 4,5,6,7,Q,J,K,A,2,3. Desempate por naipe: paus<copas<espadas<ouros.'
};
