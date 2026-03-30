import axios from 'axios';
import { AppDataSource } from '@config/database';
import { User } from '@models/User';
import { In } from 'typeorm';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

interface ExpoPushMessage {
  to: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  sound?: 'default' | null;
  badge?: number;
}

interface ExpoPushTicket {
  status: 'ok' | 'error';
  id?: string;
  message?: string;
  details?: { error?: string };
}

export class PushNotificationService {
  private userRepository = AppDataSource.getRepository(User);

  /**
   * Send a push notification to a specific Expo push token
   */
  async sendToToken(token: string, title: string, body: string, data?: Record<string, unknown>): Promise<void> {
    if (!token || !token.startsWith('ExponentPushToken[')) return;

    const message: ExpoPushMessage = {
      to: token,
      title,
      body,
      sound: 'default',
      data,
    };

    try {
      const response = await axios.post<{ data: ExpoPushTicket[] }>(
        EXPO_PUSH_URL,
        [message],
        {
          headers: {
            Accept: 'application/json',
            'Accept-Encoding': 'gzip, deflate',
            'Content-Type': 'application/json',
          },
        }
      );

      const ticket = response.data.data?.[0];
      if (ticket?.status === 'error') {
        console.error('[PushNotificationService] Expo push error:', ticket.message, ticket.details);
      }
    } catch (error: any) {
      console.error('[PushNotificationService] Failed to send push:', error.message);
    }
  }

  /**
   * Send a push notification to all users whose userIds are provided
   * Looks up push tokens from the database
   */
  async sendToUserIds(
    userIds: string[],
    title: string,
    body: string,
    data?: Record<string, unknown>
  ): Promise<void> {
    if (!userIds.length) return;

    const users = await this.userRepository.find({
      where: { id: In(userIds) },
      select: ['id', 'pushToken'],
    });

    const messages: ExpoPushMessage[] = users
      .filter((u) => u.pushToken && u.pushToken.startsWith('ExponentPushToken['))
      .map((u) => ({
        to: u.pushToken!,
        title,
        body,
        sound: 'default' as const,
        data,
      }));

    if (!messages.length) return;

    // Expo push API accepts up to 100 messages per request
    const chunks: ExpoPushMessage[][] = [];
    for (let i = 0; i < messages.length; i += 100) {
      chunks.push(messages.slice(i, i + 100));
    }

    for (const chunk of chunks) {
      try {
        await axios.post<{ data: ExpoPushTicket[] }>(EXPO_PUSH_URL, chunk, {
          headers: {
            Accept: 'application/json',
            'Accept-Encoding': 'gzip, deflate',
            'Content-Type': 'application/json',
          },
        });
      } catch (error: any) {
        console.error('[PushNotificationService] Batch push failed:', error.message);
      }
    }
  }
}

let pushNotificationServiceInstance: PushNotificationService | null = null;

export function getPushNotificationService(): PushNotificationService {
  if (!pushNotificationServiceInstance) {
    pushNotificationServiceInstance = new PushNotificationService();
  }
  return pushNotificationServiceInstance;
}
