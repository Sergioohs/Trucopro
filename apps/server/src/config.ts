import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: Number(process.env.PORT || 4000),
  mongoUri: process.env.MONGO_URI || 'mongodb://mongo:27017/trucopro',
  jwtSecret: process.env.JWT_SECRET || 'devsecret',
  reconnectGraceSec: 120,
  turnTimerSec: 25
};
