import { FastifyRequest, FastifyReply } from 'fastify';
import { getNotificationService } from '@services/NotificationService';
import { sendSuccess, sendBadRequest, sendServerError } from '@utils/response';
import { TenantContext } from '@shared';

export class NotificationController {
  /**
   * Send a test SMS
   * POST /api/notifications/test-sms
   */
  static async sendTestSMS(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { phoneNumber, message } = request.body as any;

      if (!phoneNumber || !message) {
        return sendBadRequest(reply, 'Phone number and message are required');
      }

      const notificationService = getNotificationService();
      await notificationService.sendSMS({
        recipient: phoneNumber,
        message,
      });

      return sendSuccess(reply, {}, 'Test SMS sent successfully');
    } catch (error: any) {
      return sendServerError(reply, error.message);
    }
  }

  /**
   * Send OTP to a phone number
   * POST /api/notifications/send-otp
   */
  static async sendOTP(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { phoneNumber, otpCode } = request.body as any;

      if (!phoneNumber || !otpCode) {
        return sendBadRequest(reply, 'Phone number and OTP code are required');
      }

      const notificationService = getNotificationService();
      await notificationService.sendOTP(phoneNumber, otpCode);

      return sendSuccess(reply, {}, 'OTP sent successfully');
    } catch (error: any) {
      return sendServerError(reply, error.message);
    }
  }

  /**
   * Send check-in notification
   * POST /api/notifications/check-in
   */
  static async sendCheckInNotification(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { phoneNumber, childName, time } = request.body as any;

      if (!phoneNumber || !childName || !time) {
        return sendBadRequest(reply, 'Phone number, child name, and time are required');
      }

      const notificationService = getNotificationService();
      await notificationService.sendCheckInNotification(phoneNumber, childName, time);

      return sendSuccess(reply, {}, 'Check-in notification sent successfully');
    } catch (error: any) {
      return sendServerError(reply, error.message);
    }
  }

  /**
   * Send check-out notification
   * POST /api/notifications/check-out
   */
  static async sendCheckOutNotification(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { phoneNumber, childName, time } = request.body as any;

      if (!phoneNumber || !childName || !time) {
        return sendBadRequest(reply, 'Phone number, child name, and time are required');
      }

      const notificationService = getNotificationService();
      await notificationService.sendCheckOutNotification(phoneNumber, childName, time);

      return sendSuccess(reply, {}, 'Check-out notification sent successfully');
    } catch (error: any) {
      return sendServerError(reply, error.message);
    }
  }

  /**
   * Send daily report notification
   * POST /api/notifications/daily-report
   */
  static async sendDailyReportNotification(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { phoneNumber, childName } = request.body as any;

      if (!phoneNumber || !childName) {
        return sendBadRequest(reply, 'Phone number and child name are required');
      }

      const notificationService = getNotificationService();
      await notificationService.sendDailyReportNotification(phoneNumber, childName);

      return sendSuccess(reply, {}, 'Daily report notification sent successfully');
    } catch (error: any) {
      return sendServerError(reply, error.message);
    }
  }

  /**
   * Send payment reminder
   * POST /api/notifications/payment-reminder
   */
  static async sendPaymentReminder(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { phoneNumber, amount, dueDate } = request.body as any;

      if (!phoneNumber || !amount || !dueDate) {
        return sendBadRequest(reply, 'Phone number, amount, and due date are required');
      }

      const notificationService = getNotificationService();
      await notificationService.sendPaymentReminder(phoneNumber, amount, dueDate);

      return sendSuccess(reply, {}, 'Payment reminder sent successfully');
    } catch (error: any) {
      return sendServerError(reply, error.message);
    }
  }

  /**
   * Send emergency broadcast
   * POST /api/notifications/emergency-broadcast
   */
  static async sendEmergencyBroadcast(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { phoneNumbers, message } = request.body as any;

      if (!phoneNumbers || !Array.isArray(phoneNumbers) || phoneNumbers.length === 0) {
        return sendBadRequest(reply, 'Phone numbers array is required');
      }

      if (!message) {
        return sendBadRequest(reply, 'Message is required');
      }

      const notificationService = getNotificationService();
      await notificationService.sendEmergencyBroadcast(phoneNumbers, message);

      return sendSuccess(
        reply,
        { sentTo: phoneNumbers.length },
        `Emergency broadcast sent to ${phoneNumbers.length} recipients`
      );
    } catch (error: any) {
      return sendServerError(reply, error.message);
    }
  }

  /**
   * Check SMS balance
   * GET /api/notifications/balance
   */
  static async checkBalance(request: FastifyRequest, reply: FastifyReply) {
    try {
      const notificationService = getNotificationService();
      const balance = await notificationService.checkBalance();

      return sendSuccess(reply, { balance }, 'SMS balance retrieved successfully');
    } catch (error: any) {
      return sendServerError(reply, error.message);
    }
  }
}
