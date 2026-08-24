import { Notification, NotificationType } from './notification.model';
import { emitToUser } from '../../config/socket';

export async function createNotification(input: {
  userId: string;
  type: NotificationType;
  workspaceId: string;
  taskId?: string;
  actorId?: string;
  message: string;
}) {
  const notification = await Notification.create(input);
  emitToUser(input.userId, 'notification:new', notification);
  return notification;
}

export async function listNotifications(userId: string, unreadOnly = false) {
  const query: Record<string, unknown> = { userId };
  if (unreadOnly) query.readAt = null;
  return Notification.find(query).sort({ createdAt: -1 }).limit(50);
}

export async function markAsRead(userId: string, notificationId: string) {
  await Notification.updateOne({ _id: notificationId, userId }, { readAt: new Date() });
}

export async function markAllAsRead(userId: string) {
  await Notification.updateMany({ userId, readAt: null }, { readAt: new Date() });
}
