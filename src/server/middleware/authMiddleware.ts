import { Request, Response, NextFunction } from 'express';
import { getAuthUserFromToken, getTokenFromHeader } from '../auth';

/**
 * Middleware de autenticação via JWT Bearer Token.
 * Injeta o usuário autenticado em req.user se o token for válido.
 */
export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  const token = getTokenFromHeader(req.headers.authorization);

  if (!token) {
    return res.status(401).json({ error: 'Token de autenticação não fornecido.' });
  }

  const user = getAuthUserFromToken(token);
  if (!user) {
    return res.status(401).json({ error: 'Token inválido ou expirado.' });
  }

  (req as any).user = user;
  next();
};
