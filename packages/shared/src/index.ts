export type Suit = 'clubs' | 'hearts' | 'spades' | 'diamonds';

export type Rank = '4' | '5' | '6' | '7' | 'Q' | 'J' | 'K' | 'A' | '2' | '3';

export interface Card {
  rank: Rank;
  suit: Suit;
}

export interface PublicPlayer {
  id: string;
  nickname: string;
  avatar: string;
  team: 0 | 1;
  ready: boolean;
  connected: boolean;
}

export interface MatchSummary {
  id: string;
  startedAt: string;
  endedAt: string;
  winnerTeam: 0 | 1;
  scoreA: number;
  scoreB: number;
}
