import { Request, Response } from 'express';
import { NotificationModel } from '../models/index';

export const listNotifications = async (req: Request, res: Response) => {
  try {
    const email = (req as any).user?.email;
    if (!email) return res.status(401).json({ error: 'Não autenticado.' });

    const notifications = await NotificationModel.find({
      recipientEmail: email.toLowerCase(),
    }).sort({ createdAt: -1 }).limit(50).lean();

    res.status(200).json(notifications);
  } catch (err: any) {
    console.error('❌ [LIST NOTIFICATIONS ERROR]:', err.message);
    res.status(500).json({ error: 'Erro ao listar notificações.' });
  }
};

export const getUnreadNotificationsCount = async (req: Request, res: Response) => {
  try {
    const email = (req as any).user?.email;
    if (!email) return res.status(401).json({ error: 'Não autenticado.' });

    const count = await NotificationModel.countDocuments({
      recipientEmail: email.toLowerCase(),
      read: false,
    });

    res.status(200).json({ count });
  } catch (err: any) {
    console.error('❌ [COUNT UNREAD NOTIFICATIONS ERROR]:', err.message);
    res.status(500).json({ error: 'Erro ao contar notificações não lidas.' });
  }
};

export const markNotificationsAsRead = async (req: Request, res: Response) => {
  try {
    const email = (req as any).user?.email;
    if (!email) return res.status(401).json({ error: 'Não autenticado.' });

    await NotificationModel.updateMany(
      { recipientEmail: email.toLowerCase(), read: false },
      { $set: { read: true } }
    );

    res.status(200).json({ success: true, message: 'Notificações marcadas como lidas.' });
  } catch (err: any) {
    console.error('❌ [MARK NOTIFICATIONS READ ERROR]:', err.message);
    res.status(500).json({ error: 'Erro ao marcar notificações como lidas.' });
  }
};
