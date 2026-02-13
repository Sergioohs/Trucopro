import mongoose, { Schema } from 'mongoose';

const MatchSchema = new Schema({
  players: [String],
  teamA: [String],
  teamB: [String],
  scoreA: Number,
  scoreB: Number,
  winnerTeam: Number,
  startedAt: Date,
  endedAt: Date,
  durationSec: Number,
  ranked: Boolean
});

export const MatchModel = mongoose.model('Match', MatchSchema);
