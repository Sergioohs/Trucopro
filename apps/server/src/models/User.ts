import mongoose, { Schema } from 'mongoose';

const MatchHistorySchema = new Schema({
  matchId: String,
  won: Boolean,
  score: String,
  at: { type: Date, default: Date.now }
}, { _id: false });

const UserSchema = new Schema({
  nickname: { type: String, unique: true, required: true },
  pinHash: { type: String, required: true },
  avatar: { type: String, default: '🂠' },
  wins: { type: Number, default: 0 },
  losses: { type: Number, default: 0 },
  mmr: { type: Number, default: 1000 },
  winByPosition: {
    pos1: { type: Number, default: 0 },
    pos2: { type: Number, default: 0 },
    pos3: { type: Number, default: 0 },
    pos4: { type: Number, default: 0 }
  },
  trucoWon: { type: Number, default: 0 },
  trucoPlayed: { type: Number, default: 0 },
  avgMatchDurationSec: { type: Number, default: 0 },
  matchHistory: { type: [MatchHistorySchema], default: [] },
  banned: { type: Boolean, default: false }
});

export const UserModel = mongoose.model('User', UserSchema);
