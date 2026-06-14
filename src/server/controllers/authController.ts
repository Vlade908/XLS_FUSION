import { Request, Response } from 'express';
import crypto from 'crypto';
import { UserModel } from '../models/index';
import { hashPassword, verifyPassword, createAuthToken } from '../auth';
import { sendResetEmail } from '../utils/emailService';

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

export const forgotPassword = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'E-mail é obrigatório.' });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const user = await UserModel.findOne({ email: normalizedEmail });

    if (!user) {
      return res.status(200).json({ 
        message: 'Se o e-mail estiver cadastrado, um link de redefinição será enviado.' 
      });
    }

    const token = crypto.randomBytes(20).toString('hex');
    user.resetPasswordToken = token;
    user.resetPasswordExpires = new Date(Date.now() + 3600000); // 1 hora
    await user.save();

    const emailResult = await sendResetEmail(user.email, token);

    const responsePayload: any = {
      message: 'Se o e-mail estiver cadastrado, um link de redefinição será enviado.'
    };
    if (process.env.NODE_ENV !== 'production') {
      responsePayload.devInfo = {
        token,
        resetUrl: emailResult.resetUrl
      };
    }

    return res.status(200).json(responsePayload);
  } catch (err: any) {
    console.error('❌ [FORGOT PASSWORD ERROR]:', err.message);
    res.status(500).json({ error: err.message });
  }
};

export const resetPassword = async (req: Request, res: Response) => {
  try {
    const { token, password } = req.body;
    if (!token || !password) {
      return res.status(400).json({ error: 'Token e senha são obrigatórios.' });
    }

    if (String(password).trim().length < 6) {
      return res.status(400).json({ error: 'A nova senha deve ter pelo menos 6 caracteres.' });
    }

    const user = await UserModel.findOne({
      resetPasswordToken: String(token).trim(),
      resetPasswordExpires: { $gt: new Date() },
    });

    if (!user) {
      return res.status(400).json({ error: 'Token de redefinição de senha inválido ou expirado.' });
    }

    user.passwordHash = await hashPassword(String(password));
    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;
    await user.save();

    return res.status(200).json({ message: 'Senha redefinida com sucesso!' });
  } catch (err: any) {
    console.error('❌ [RESET PASSWORD ERROR]:', err.message);
    res.status(500).json({ error: err.message });
  }
};
