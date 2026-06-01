import { Request, Response } from 'express';
import { UserModel } from '../models/index';
import { hashPassword, verifyPassword, createAuthToken } from '../auth';

const isValidEmail = (value: any) =>
  typeof value === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value).trim());

export const signup = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'E-mail e senha são obrigatórios.' });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    if (!isValidEmail(normalizedEmail)) {
      return res.status(400).json({ error: 'E-mail inválido.' });
    }

    if (String(password).trim().length < 6) {
      return res.status(400).json({ error: 'A senha deve ter pelo menos 6 caracteres.' });
    }

    const existingUser = await UserModel.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(409).json({ error: 'Usuário já existe.' });
    }

    const passwordHash = await hashPassword(String(password));
    const user = await UserModel.create({ email: normalizedEmail, passwordHash });
    const token = createAuthToken({ userId: user._id.toString(), email: user.email });
    return res.status(201).json({ token, user: { email: user.email } });
  } catch (err: any) {
    console.error('❌ [SIGNUP ERROR]:', err.message);
    res.status(500).json({ error: err.message });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'E-mail e senha são obrigatórios.' });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    if (!isValidEmail(normalizedEmail)) {
      return res.status(400).json({ error: 'E-mail inválido.' });
    }

    const user = await UserModel.findOne({ email: normalizedEmail });
    if (!user) {
      return res.status(401).json({ error: 'Credenciais inválidas.' });
    }

    const valid = await verifyPassword(String(password), user.passwordHash);
    if (!valid) {
      return res.status(401).json({ error: 'Credenciais inválidas.' });
    }

    const token = createAuthToken({ userId: user._id.toString(), email: user.email });
    return res.status(200).json({ token, user: { email: user.email } });
  } catch (err: any) {
    console.error('❌ [LOGIN ERROR]:', err.message);
    res.status(500).json({ error: err.message });
  }
};

export const me = async (req: Request, res: Response) => {
  // O middleware de autenticação (requireAuth) já garante que req.user exista
  const email = (req as any).user?.email || null;
  return res.status(200).json({ user: { email } });
};

export const refresh = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (!user) {
      return res.status(401).json({ error: 'Não autorizado.' });
    }
    const token = createAuthToken({ userId: user.userId, email: user.email });
    return res.status(200).json({ token, user: { email: user.email } });
  } catch (err: any) {
    console.error('❌ [REFRESH ERROR]:', err.message);
    res.status(500).json({ error: err.message });
  }
};
