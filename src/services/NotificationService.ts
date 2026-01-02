import axios from 'axios';
import { config } from '@config/environment';

/**
 * Arkesel SMS API Service
 * Documentation: https://developers.arkesel.com/#tag/SMS-V2
 */

interface ArkselSMSResponse {
  code: string;
  message: string;
  data?: {
    status: string;
    code: string;
    message_id?: string;
  };
}

interface SendSMSParams {
  recipient: string;
  message: string;
  sender?: string;
}

export class NotificationService {
  private readonly baseUrl = 'https://sms.arkesel.com/api/v2/sms';
  private readonly apiKey: string;
  private readonly defaultSender: string;

  constructor() {
    this.apiKey = config.notifications.arkesel.apiKey;
    this.defaultSender = config.notifications.arkesel.senderId || 'Nkabom';
  }

  /**
   * Send SMS via Arkesel API
   * @param params - SMS parameters (recipient, message, optional sender)
   * @returns Promise with response data
   */
  async sendSMS(params: SendSMSParams): Promise<ArkselSMSResponse> {
    try {
      const { recipient, message, sender } = params;

      // Validate Ghana phone number format
      const normalizedPhone = this.normalizePhoneNumber(recipient);

      const response = await axios.post<ArkselSMSResponse>(
        `${this.baseUrl}/send`,
        {
          sender: sender || this.defaultSender,
          message,
          recipients: [normalizedPhone],
        },
        {
          headers: {
            'api-key': this.apiKey,
            'Content-Type': 'application/json',
          },
        }
      );

      // Check for successful response codes from Arkesel API
      // Common success codes: '200', '1000', 'ok', 'Ok', 'OK'
      const successCodes = ['200', '1000', 'ok', 'Ok', 'OK'];
      const isSuccess = successCodes.includes(String(response.data.code).toLowerCase());

      // Also check HTTP status code
      const httpSuccess = response.status === 200 || response.status === 201;

      if (isSuccess || (httpSuccess && response.data)) {
        console.log(`✅ SMS sent successfully to ${normalizedPhone}`, {
          code: response.data.code,
          message: response.data.message,
          httpStatus: response.status,
        });
        return response.data;
      } else {
        console.warn('⚠️  Unexpected Arkesel response:', response.data);
        throw new Error(`Arkesel API error: ${response.data.message || JSON.stringify(response.data)}`);
      }
    } catch (error: any) {
      // If it's an axios error, log the full response
      if (error.response) {
        console.error('❌ Failed to send SMS - Arkesel response:', {
          status: error.response.status,
          data: error.response.data,
        });

        // Extract meaningful error message from Arkesel response
        const arkeselMessage = error.response.data?.message || error.response.data?.error || 'Unknown error';
        throw new Error(arkeselMessage);
      } else {
        console.error('❌ Failed to send SMS:', error.message);
        throw new Error(error.message);
      }
    }
  }

  /**
   * Send OTP SMS to phone number
   * @param phoneNumber - Recipient phone number (Ghana format)
   * @param otpCode - 6-digit OTP code
   */
  async sendOTP(phoneNumber: string, otpCode: string): Promise<void> {
    const message = `Your Nkabom verification code is: ${otpCode}. Valid for 10 minutes. Do not share this code with anyone.`;

    await this.sendSMS({
      recipient: phoneNumber,
      message,
    });
  }

  /**
   * Send staff invitation with OTP for first login
   * @param phoneNumber - Staff member's phone number
   * @param staffName - Staff member's name
   * @param otpCode - 6-digit OTP code
   */
  async sendStaffInvitation(phoneNumber: string, staffName: string, otpCode: string): Promise<void> {
    const message = `Welcome to Nkabom, ${staffName}! Your account has been created. Use this code to login: ${otpCode}. Valid for 60 minutes.`;

    await this.sendSMS({
      recipient: phoneNumber,
      message,
    });
  }

  /**
   * Send attendance check-in notification to parent
   * @param phoneNumber - Parent's phone number
   * @param childName - Child's name
   * @param time - Check-in time
   */
  async sendCheckInNotification(
    phoneNumber: string,
    childName: string,
    time: string
  ): Promise<void> {
    const message = `${childName} has been checked in at ${time}. Have a great day!`;

    await this.sendSMS({
      recipient: phoneNumber,
      message,
    });
  }

  /**
   * Send attendance check-out notification to parent
   * @param phoneNumber - Parent's phone number
   * @param childName - Child's name
   * @param time - Check-out time
   */
  async sendCheckOutNotification(
    phoneNumber: string,
    childName: string,
    time: string
  ): Promise<void> {
    const message = `${childName} has been checked out at ${time}. See you tomorrow!`;

    await this.sendSMS({
      recipient: phoneNumber,
      message,
    });
  }

  /**
   * Send daily activity report notification
   * @param phoneNumber - Parent's phone number
   * @param childName - Child's name
   */
  async sendDailyReportNotification(
    phoneNumber: string,
    childName: string
  ): Promise<void> {
    const message = `${childName}'s daily report is ready! Log in to view activities, meals, naps, and photos from today.`;

    await this.sendSMS({
      recipient: phoneNumber,
      message,
    });
  }

  /**
   * Send absence reminder to parent
   * @param phoneNumber - Parent's phone number
   * @param childName - Child's name
   * @param date - Absence date
   */
  async sendAbsenceReminder(
    phoneNumber: string,
    childName: string,
    date: string
  ): Promise<void> {
    const message = `Reminder: ${childName} is marked absent for ${date}. Please contact us if this is incorrect.`;

    await this.sendSMS({
      recipient: phoneNumber,
      message,
    });
  }

  /**
   * Send payment reminder
   * @param phoneNumber - Parent's phone number
   * @param amount - Amount due
   * @param dueDate - Payment due date
   */
  async sendPaymentReminder(
    phoneNumber: string,
    amount: number,
    dueDate: string
  ): Promise<void> {
    const message = `Payment reminder: GHS ${amount.toFixed(2)} is due on ${dueDate}. Please make payment to avoid late fees.`;

    await this.sendSMS({
      recipient: phoneNumber,
      message,
    });
  }

  /**
   * Send emergency broadcast to multiple recipients
   * @param phoneNumbers - Array of phone numbers
   * @param message - Emergency message
   */
  async sendEmergencyBroadcast(
    phoneNumbers: string[],
    message: string
  ): Promise<void> {
    const sendPromises = phoneNumbers.map((phone) =>
      this.sendSMS({
        recipient: phone,
        message: `🚨 EMERGENCY: ${message}`,
      })
    );

    await Promise.allSettled(sendPromises);
  }

  /**
   * Normalize Ghana phone number to international format
   * @param phoneNumber - Phone number in any format
   * @returns Normalized phone number (+233XXXXXXXXX)
   */
  private normalizePhoneNumber(phoneNumber: string): string {
    // Remove all non-digit characters
    let cleaned = phoneNumber.replace(/\D/g, '');

    // Handle different formats
    if (cleaned.startsWith('233')) {
      // Already in international format without +
      return `+${cleaned}`;
    } else if (cleaned.startsWith('0')) {
      // Ghana local format (0XXXXXXXXX)
      return `+233${cleaned.substring(1)}`;
    } else if (cleaned.length === 9) {
      // Missing leading 0 (XXXXXXXXX)
      return `+233${cleaned}`;
    } else if (cleaned.startsWith('+233')) {
      // Already properly formatted
      return cleaned;
    }

    // If can't normalize, return as is with + prefix
    return `+${cleaned}`;
  }

  /**
   * Check SMS balance (if supported by Arkesel API)
   */
  async checkBalance(): Promise<any> {
    try {
      const response = await axios.get(`${this.baseUrl}/balance`, {
        headers: {
          'api-key': this.apiKey,
        },
      });

      return response.data;
    } catch (error: any) {
      console.error('Failed to check SMS balance:', error.message);
      throw error;
    }
  }
}

// Singleton instance
let notificationServiceInstance: NotificationService | null = null;

export function getNotificationService(): NotificationService {
  if (!notificationServiceInstance) {
    notificationServiceInstance = new NotificationService();
  }
  return notificationServiceInstance;
}
