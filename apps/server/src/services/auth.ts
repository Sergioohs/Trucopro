import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { UserModel } from '../models/User';

export async function loginOrRegister(nickname: string, pin: string) {
  let user = await UserModel.findOne({ nickname });
  if (!user) {
    const pinHash = await bcrypt.hash(pin, 10);
    user = await UserModel.create({ nickname, pinHash });
  } else {
    const ok = await bcrypt.compare(pin, user.pinHash);
    if (!ok) throw new Error('PIN inválido');
    if (user.banned) throw new Error('Usuário banido');
  }

  const token = jwt.sign({ uid: user.id, nickname: user.nickname }, config.jwtSecret, { expiresIn: '7d' });
  return { token, user };
}

export function verifyToken(token: string): { uid: string; nickname: string } {
  return jwt.verify(token, config.jwtSecret) as { uid: string; nickname: string };
}
