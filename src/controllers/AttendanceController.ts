import { FastifyRequest, FastifyReply } from 'fastify';
import { getAttendanceService } from '@services/AttendanceService';
import { sendSuccess, sendCreated, sendBadRequest, sendNotFound, sendServerError, sendPaginatedSuccess } from '@utils/response';
import { TenantContext } from '@shared';

export class AttendanceController {
  /**
   * Check in a child
   * POST /api/attendance/check-in
   */
  static async checkIn(request: FastifyRequest, reply: FastifyReply) {
    try {
      const tenant = (request as any).tenant as TenantContext;
      const attendanceService = getAttendanceService();

      const {
        childId,
        centerId,
        classId,
        checkInTime,
        checkInPhotoUrl,
        temperature,
        healthNotes,
        notes,
        checkedInByUserId,
      } = request.body as any;

      console.log('[AttendanceController.checkIn] Request body:', {
        childId,
        centerId,
        checkInTime,
        checkInPhotoUrl: checkInPhotoUrl ? `URL received (length: ${checkInPhotoUrl.length})` : 'NOT PROVIDED',
      });

      if (!childId || !checkInTime) {
        return sendBadRequest(reply, 'Child ID and check-in time are required');
      }

      if (!centerId) {
        return sendBadRequest(reply, 'Center ID is required');
      }

      // Validate staff can only check-in children from their assigned class
      const isManager = ['super_admin', 'center_owner', 'director'].includes(tenant.role);
      if (!isManager && tenant.classId && classId && tenant.classId !== classId) {
        return sendBadRequest(reply, 'You can only check in children from your assigned class');
      }

      const attendance = await attendanceService.checkIn(
        tenant.tenantId,
        centerId,
        childId,
        {
          classId,
          checkInTime,
          checkInPhotoUrl,
          temperature,
          healthNotes,
          notes,
          checkedInByUserId,
        },
        tenant.classId
      );

      console.log('[AttendanceController.checkIn] Attendance saved:', {
        id: attendance.id,
        checkInPhotoUrl: attendance.checkInPhotoUrl ? `URL saved (length: ${attendance.checkInPhotoUrl.length})` : 'NOT SAVED',
      });

      return sendCreated(reply, { attendance }, 'Child checked in successfully');
    } catch (error: any) {
      if (error.message.includes('already checked in')) {
        return sendBadRequest(reply, error.message);
      }
      if (error.message.includes('not in your assigned class')) {
        return sendBadRequest(reply, error.message);
      }
      return sendServerError(reply, error.message);
    }
  }

  /**
   * Check out a child
   * POST /api/attendance/check-out
   */
  static async checkOut(request: FastifyRequest, reply: FastifyReply) {
    try {
      const tenant = (request as any).tenant as TenantContext;
      const attendanceService = getAttendanceService();

      const {
        childId,
        centerId,
        checkOutTime,
        checkOutPhotoUrl,
        notes,
        checkedOutByUserId,
        checkedOutByName,
        checkedOutByRelationship,
      } = request.body as any;

      console.log('[AttendanceController.checkOut] Request body:', {
        childId,
        centerId,
        checkOutTime,
        checkOutPhotoUrl: checkOutPhotoUrl ? `URL received (length: ${checkOutPhotoUrl.length})` : 'NOT PROVIDED',
        checkedOutByName,
        checkedOutByRelationship,
      });

      if (!childId || !checkOutTime || !checkedOutByName || !checkedOutByRelationship) {
        return sendBadRequest(reply, 'Child ID, check-out time, pickup person name, and relationship are required');
      }

      if (!centerId) {
        return sendBadRequest(reply, 'Center ID is required');
      }

      const attendance = await attendanceService.checkOut(
        tenant.tenantId,
        centerId,
        childId,
        {
          checkOutTime,
          checkOutPhotoUrl,
          notes,
          checkedOutByUserId,
          checkedOutByName,
          checkedOutByRelationship,
        },
        tenant.classId
      );

      console.log('[AttendanceController.checkOut] Attendance saved:', {
        id: attendance.id,
        checkOutPhotoUrl: attendance.checkOutPhotoUrl ? `URL saved (length: ${attendance.checkOutPhotoUrl.length})` : 'NOT SAVED',
        checkInPhotoUrl: attendance.checkInPhotoUrl ? 'EXISTS' : 'NOT SET',
      });

      return sendSuccess(reply, { attendance }, 'Child checked out successfully');
    } catch (error: any) {
      if (error.message.includes('not found')) {
        return sendNotFound(reply, error.message);
      }
      if (error.message.includes('not in your assigned class')) {
        return sendBadRequest(reply, error.message);
      }
      return sendServerError(reply, error.message);
    }
  }

  /**
   * Check in a child using QR code
   * POST /api/attendance/qr-check-in
   */
  static async checkInByQRCode(request: FastifyRequest, reply: FastifyReply) {
    try {
      const tenant = (request as any).tenant as TenantContext;
      const attendanceService = getAttendanceService();

      const {
        qrCode,
        centerId,
        checkInTime,
        temperature,
        healthNotes,
        checkInPhotoUrl,
        notes,
        checkedInByUserId,
      } = request.body as any;

      console.log('[AttendanceController.checkInByQRCode] Request body:', {
        qrCode,
        centerId,
        checkInTime,
        checkInPhotoUrl: checkInPhotoUrl ? `URL received (length: ${checkInPhotoUrl.length})` : 'NOT PROVIDED',
      });

      if (!qrCode || !checkInTime || !centerId) {
        return sendBadRequest(reply, 'QR code, center ID, and check-in time are required');
      }

      // Check if staff has an assigned class
      const isManager = ['super_admin', 'center_owner', 'director'].includes(tenant.role);
      if (!isManager && !tenant.classId) {
        return sendBadRequest(reply, 'You must be assigned to a class before you can check-in children');
      }

      const result = await attendanceService.checkInByQRCode(
        tenant.tenantId,
        centerId,
        qrCode,
        {
          checkInTime,
          temperature,
          healthNotes,
          checkInPhotoUrl,
          notes,
          checkedInByUserId,
        },
        tenant.classId
      );

      return sendCreated(reply, {
        attendance: result.attendance,
        child: {
          id: result.child.id,
          firstName: result.child.firstName,
          lastName: result.child.lastName,
          className: result.child.class?.name,
        }
      }, `${result.child.firstName} ${result.child.lastName} checked in successfully`);
    } catch (error: any) {
      if (error.message.includes('already checked in')) {
        return sendBadRequest(reply, error.message);
      }
      if (error.message.includes('Invalid QR code')) {
        return sendNotFound(reply, error.message);
      }
      return sendServerError(reply, error.message);
    }
  }

  /**
   * Check out a child using QR code with pickup authorization
   * POST /api/attendance/qr-check-out
   */
  static async checkOutByQRCode(request: FastifyRequest, reply: FastifyReply) {
    try {
      const tenant = (request as any).tenant as TenantContext;
      const attendanceService = getAttendanceService();

      const {
        qrCode,
        centerId,
        checkOutTime,
        checkOutPhotoUrl,
        notes,
        checkedOutByUserId,
        checkedOutByName,
        checkedOutByRelationship,
      } = request.body as any;

      console.log('[AttendanceController.checkOutByQRCode] Request body:', {
        qrCode,
        centerId,
        checkOutTime,
        checkOutPhotoUrl: checkOutPhotoUrl ? `URL received (length: ${checkOutPhotoUrl.length})` : 'NOT PROVIDED',
        checkedOutByName,
        checkedOutByRelationship,
      });

      if (!qrCode || !checkOutTime || !centerId || !checkedOutByName || !checkedOutByRelationship) {
        return sendBadRequest(reply, 'QR code, center ID, check-out time, pickup person name, and relationship are required');
      }

      // Check if staff has an assigned class
      const isManager = ['super_admin', 'center_owner', 'director'].includes(tenant.role);
      if (!isManager && !tenant.classId) {
        return sendBadRequest(reply, 'You must be assigned to a class before you can check-out children');
      }

      const result = await attendanceService.checkOutByQRCode(
        tenant.tenantId,
        centerId,
        qrCode,
        {
          checkOutTime,
          checkOutPhotoUrl,
          notes,
          checkedOutByUserId,
          checkedOutByName,
          checkedOutByRelationship,
        },
        tenant.classId
      );

      return sendSuccess(reply, {
        attendance: result.attendance,
        child: {
          id: result.child.id,
          firstName: result.child.firstName,
          lastName: result.child.lastName,
          className: result.child.class?.name,
        },
        pickedUpBy: {
          name: checkedOutByName,
          relationship: checkedOutByRelationship,
        }
      }, `${result.child.firstName} ${result.child.lastName} checked out successfully`);
    } catch (error: any) {
      if (error.message.includes('Unauthorized pickup')) {
        return sendBadRequest(reply, error.message);
      }
      if (error.message.includes('Invalid QR code')) {
        return sendNotFound(reply, error.message);
      }
      if (error.message.includes('not found')) {
        return sendNotFound(reply, error.message);
      }
      return sendServerError(reply, error.message);
    }
  }

  /**
   * Record absence
   * POST /api/attendance/absence
   */
  static async recordAbsence(request: FastifyRequest, reply: FastifyReply) {
    try {
      const tenant = (request as any).tenant as TenantContext;
      const attendanceService = getAttendanceService();

      const { childId, centerId, date, reason, notifyParent } = request.body as any;

      if (!childId || !date) {
        return sendBadRequest(reply, 'Child ID and date are required');
      }

      // Use centerId from request body, or fall back to tenant's centerId
      const effectiveCenterId = centerId || tenant.centerId;
      if (!effectiveCenterId) {
        return sendBadRequest(reply, 'Center ID is required');
      }

      const attendance = await attendanceService.recordAbsenceWithNotification(
        tenant.tenantId,
        effectiveCenterId,
        childId,
        {
          date: new Date(date),
          reason,
          notifyParent,
        }
      );

      return sendSuccess(reply, { attendance }, 'Absence recorded successfully');
    } catch (error: any) {
      if (error.message.includes('already')) {
        return sendBadRequest(reply, error.message);
      }
      return sendServerError(reply, error.message);
    }
  }

  /**
   * Get attendance record for a date
   * GET /api/attendance/children/:childId?date=2024-01-01
   */
  static async getAttendanceByDate(request: FastifyRequest, reply: FastifyReply) {
    try {
      const tenant = (request as any).tenant as TenantContext;
      const attendanceService = getAttendanceService();

      const { childId } = request.params as { childId: string };
      const { date } = request.query as { date: string };

      if (!date) {
        return sendBadRequest(reply, 'Date parameter is required');
      }

      const attendance = await attendanceService.getAttendanceByDate(
        tenant.tenantId,
        childId,
        new Date(date)
      );

      console.log('[AttendanceController.getAttendanceByDate] Retrieved:', {
        childId,
        date,
        found: !!attendance,
        checkInPhotoUrl: attendance?.checkInPhotoUrl ? `URL exists (length: ${attendance.checkInPhotoUrl.length})` : 'NOT SET',
        checkOutPhotoUrl: attendance?.checkOutPhotoUrl ? `URL exists (length: ${attendance.checkOutPhotoUrl.length})` : 'NOT SET',
      });

      if (!attendance) {
        return sendNotFound(reply, 'No attendance record found for this date');
      }

      return sendSuccess(reply, { attendance });
    } catch (error: any) {
      return sendServerError(reply, error.message);
    }
  }

  /**
   * Get attendance history for a child
   * GET /api/attendance/children/:childId/history?page=1&limit=20
   */
  static async getAttendanceHistory(request: FastifyRequest, reply: FastifyReply) {
    try {
      const tenant = (request as any).tenant as TenantContext;
      const attendanceService = getAttendanceService();

      const { childId } = request.params as { childId: string };
      const { page = 1, limit = 20, startDate, endDate } = request.query as {
        page?: number;
        limit?: number;
        startDate?: string;
        endDate?: string;
      };

      console.log('[AttendanceHistory] Request params:', {
        childId,
        tenantId: tenant.tenantId,
        startDate,
        endDate,
        page,
        limit
      });

      const skip = (Number(page) - 1) * Number(limit);

      const [records, total] = await attendanceService.getAttendanceHistory(
        tenant.tenantId,
        childId,
        {
          skip,
          take: Number(limit),
          startDate: startDate ? new Date(startDate) : undefined,
          endDate: endDate ? new Date(endDate) : undefined,
        }
      );

      console.log('[AttendanceHistory] Found records:', { total, recordCount: records.length });

      // Log photo URLs in records
      records.forEach((record, index) => {
        if (record.checkInPhotoUrl || record.checkOutPhotoUrl) {
          console.log(`[AttendanceHistory] Record ${index} has photos:`, {
            id: record.id,
            checkInPhotoUrl: record.checkInPhotoUrl ? 'YES' : 'NO',
            checkOutPhotoUrl: record.checkOutPhotoUrl ? 'YES' : 'NO',
          });
        }
      });

      return sendPaginatedSuccess(
        reply,
        records,
        {
          page: Number(page),
          limit: Number(limit),
          total,
        }
      );
    } catch (error: any) {
      return sendServerError(reply, error.message);
    }
  }

  /**
   * Get daily attendance summary
   * GET /api/attendance/summary?date=2024-01-01
   */
  static async getDailyAttendanceSummary(request: FastifyRequest, reply: FastifyReply) {
    try {
      const tenant = (request as any).tenant as TenantContext;
      const attendanceService = getAttendanceService();

      const { date } = request.query as { date: string };

      if (!date) {
        return sendBadRequest(reply, 'Date parameter is required');
      }

      const summary = await attendanceService.getDailyAttendanceSummary(
        tenant.tenantId,
        tenant.userId,
        new Date(date)
      );

      return sendSuccess(reply, { summary });
    } catch (error: any) {
      return sendServerError(reply, error.message);
    }
  }

  /**
   * Get attendance pattern analysis
   * GET /api/attendance/children/:childId/pattern?days=30
   */
  static async getAttendancePattern(request: FastifyRequest, reply: FastifyReply) {
    try {
      const tenant = (request as any).tenant as TenantContext;
      const attendanceService = getAttendanceService();

      const { childId } = request.params as { childId: string };
      const { days = 30 } = request.query as { days?: number };

      const pattern = await attendanceService.getAttendancePattern(
        tenant.tenantId,
        childId,
        Number(days)
      );

      return sendSuccess(reply, { pattern });
    } catch (error: any) {
      return sendServerError(reply, error.message);
    }
  }

  /**
   * Get class attendance for a date
   * GET /api/attendance/classes/:classId?date=2024-01-01
   */
  static async getClassAttendance(request: FastifyRequest, reply: FastifyReply) {
    try {
      const tenant = (request as any).tenant as TenantContext;
      const attendanceService = getAttendanceService();

      const { classId } = request.params as { classId: string };
      const { date } = request.query as { date: string };

      if (!date) {
        return sendBadRequest(reply, 'Date parameter is required');
      }

      const records = await attendanceService.getClassAttendance(
        tenant.tenantId,
        classId,
        new Date(date)
      );

      return sendSuccess(reply, { records });
    } catch (error: any) {
      return sendServerError(reply, error.message);
    }
  }

  /**
   * Get center attendance for a specific date
   * GET /api/attendance/centers/:centerId?date=2024-01-01
   */
  static async getCenterAttendance(request: FastifyRequest, reply: FastifyReply) {
    try {
      const tenant = (request as any).tenant as TenantContext;
      const attendanceService = getAttendanceService();

      const { centerId } = request.params as { centerId: string };
      const { date } = request.query as { date?: string };

      const dateToUse = date ? new Date(date) : new Date();

      const records = await attendanceService.getCenterAttendance(
        tenant.tenantId,
        centerId,
        dateToUse
      );

      console.log('Center Attendance Records:', records.length);
      console.log('Date Used:', dateToUse);
      console.log('Tenant ID:', tenant.tenantId);
      console.log('Center ID:', centerId);

      // Log any records with photo URLs
      const recordsWithPhotos = records.filter(r => r.checkInPhotoUrl || r.checkOutPhotoUrl);
      if (recordsWithPhotos.length > 0) {
        console.log('[getCenterAttendance] Records with photos:', recordsWithPhotos.map(r => ({
          id: r.id,
          childId: r.childId,
          checkInPhotoUrl: r.checkInPhotoUrl ? 'YES' : 'NO',
          checkOutPhotoUrl: r.checkOutPhotoUrl ? 'YES' : 'NO',
        })));
      } else {
        console.log('[getCenterAttendance] No records have photo URLs');
      }

      return sendSuccess(reply, { records });
    } catch (error: any) {
      return sendServerError(reply, error.message);
    }
  }

  /**
   * Initiate secure checkout with OTP verification
   * POST /api/attendance/secure-checkout/initiate
   * Sends OTP to pickup person's phone
   */
  static async initiateSecureCheckout(request: FastifyRequest, reply: FastifyReply) {
    try {
      const tenant = (request as any).tenant as TenantContext;
      const attendanceService = getAttendanceService();

      const {
        childId,
        centerId,
        pickupPersonName,
        pickupPersonRelationship,
        checkOutTime,
        checkOutPhotoUrl,
        notes,
      } = request.body as any;

      if (!childId || !centerId || !pickupPersonName || !pickupPersonRelationship || !checkOutTime) {
        return sendBadRequest(reply, 'Child ID, center ID, pickup person name, relationship, and check-out time are required');
      }

      // Get staff's classId for validation
      const isManager = ['super_admin', 'center_owner', 'director'].includes(tenant.role);
      const staffClassId = isManager ? undefined : tenant.classId;

      const result = await attendanceService.initiateSecureCheckout(
        tenant.tenantId,
        centerId,
        childId,
        {
          pickupPersonName,
          pickupPersonRelationship,
          checkOutTime,
          checkOutPhotoUrl,
          notes,
        },
        tenant.userId,
        staffClassId
      );

      return sendSuccess(reply, {
        pendingCheckoutId: result.pendingCheckout.id,
        childName: `${result.child.firstName} ${result.child.lastName}`,
        pickupPersonName: result.pendingCheckout.pickupPersonName,
        pickupPersonPhone: result.pendingCheckout.pickupPersonPhone.replace(/(\d{3})\d{4}(\d{3})/, '$1****$2'), // Mask phone number
        expiresAt: result.pendingCheckout.expiresAt,
      }, 'Verification code sent to pickup person');
    } catch (error: any) {
      if (error.message.includes('not found') || error.message.includes('No check-in')) {
        return sendNotFound(reply, error.message);
      }
      if (error.message.includes('not authorized') || error.message.includes('Unauthorized')) {
        return sendBadRequest(reply, error.message);
      }
      return sendServerError(reply, error.message);
    }
  }

  /**
   * Initiate secure checkout via QR code with OTP verification
   * POST /api/attendance/secure-checkout/qr/initiate
   * Sends OTP to pickup person's phone
   */
  static async initiateSecureCheckoutByQR(request: FastifyRequest, reply: FastifyReply) {
    try {
      const tenant = (request as any).tenant as TenantContext;
      const attendanceService = getAttendanceService();

      const {
        qrCode,
        centerId,
        pickupPersonName,
        pickupPersonRelationship,
        checkOutTime,
        checkOutPhotoUrl,
        notes,
      } = request.body as any;

      if (!qrCode || !centerId || !pickupPersonName || !pickupPersonRelationship || !checkOutTime) {
        return sendBadRequest(reply, 'QR code, center ID, pickup person name, relationship, and check-out time are required');
      }

      // Get staff's classId for validation
      const isManager = ['super_admin', 'center_owner', 'director'].includes(tenant.role);
      const staffClassId = isManager ? undefined : tenant.classId;

      const result = await attendanceService.initiateSecureCheckoutByQRCode(
        tenant.tenantId,
        centerId,
        qrCode,
        {
          pickupPersonName,
          pickupPersonRelationship,
          checkOutTime,
          checkOutPhotoUrl,
          notes,
        },
        tenant.userId,
        staffClassId
      );

      return sendSuccess(reply, {
        pendingCheckoutId: result.pendingCheckout.id,
        childName: `${result.child.firstName} ${result.child.lastName}`,
        pickupPersonName: result.pendingCheckout.pickupPersonName,
        pickupPersonPhone: result.pendingCheckout.pickupPersonPhone.replace(/(\d{3})\d{4}(\d{3})/, '$1****$2'), // Mask phone number
        expiresAt: result.pendingCheckout.expiresAt,
      }, 'Verification code sent to pickup person');
    } catch (error: any) {
      if (error.message.includes('Invalid QR code') || error.message.includes('not found') || error.message.includes('No check-in')) {
        return sendNotFound(reply, error.message);
      }
      if (error.message.includes('not authorized') || error.message.includes('Unauthorized')) {
        return sendBadRequest(reply, error.message);
      }
      return sendServerError(reply, error.message);
    }
  }

  /**
   * Verify OTP and complete checkout
   * POST /api/attendance/secure-checkout/verify
   */
  static async verifySecureCheckout(request: FastifyRequest, reply: FastifyReply) {
    try {
      const tenant = (request as any).tenant as TenantContext;
      const attendanceService = getAttendanceService();

      const { pendingCheckoutId, otpCode } = request.body as any;

      if (!pendingCheckoutId || !otpCode) {
        return sendBadRequest(reply, 'Pending checkout ID and OTP code are required');
      }

      const result = await attendanceService.verifyCheckoutOTP(
        tenant.tenantId,
        pendingCheckoutId,
        otpCode,
        tenant.userId
      );

      if (!result.success) {
        // Check if it's a security concern (max attempts exceeded)
        if (result.error?.includes('Maximum verification attempts') || result.error?.includes('unauthorized')) {
          return reply.status(403).send({
            success: false,
            message: result.error,
            securityAlert: true,
          });
        }
        // Include remaining attempts in the response for the frontend
        return reply.status(400).send({
          success: false,
          message: result.error || 'Verification failed',
          data: {
            remainingAttempts: result.remainingAttempts,
          },
        });
      }

      return sendSuccess(reply, {
        attendance: result.attendance,
        child: result.child ? {
          id: result.child.id,
          firstName: result.child.firstName,
          lastName: result.child.lastName,
        } : null,
      }, 'Child checked out successfully');
    } catch (error: any) {
      return sendServerError(reply, error.message);
    }
  }

  /**
   * Resend OTP for pending checkout
   * POST /api/attendance/secure-checkout/:pendingCheckoutId/resend
   */
  static async resendCheckoutOTP(request: FastifyRequest, reply: FastifyReply) {
    try {
      const tenant = (request as any).tenant as TenantContext;
      const attendanceService = getAttendanceService();

      const { pendingCheckoutId } = request.params as { pendingCheckoutId: string };

      const result = await attendanceService.resendCheckoutOTP(
        tenant.tenantId,
        pendingCheckoutId
      );

      if (!result.success) {
        return sendBadRequest(reply, result.error || 'Failed to resend verification code');
      }

      return sendSuccess(reply, { expiresAt: result.expiresAt }, 'Verification code resent successfully');
    } catch (error: any) {
      return sendServerError(reply, error.message);
    }
  }

  /**
   * Cancel pending checkout
   * POST /api/attendance/secure-checkout/:pendingCheckoutId/cancel
   */
  static async cancelPendingCheckout(request: FastifyRequest, reply: FastifyReply) {
    try {
      const tenant = (request as any).tenant as TenantContext;
      const attendanceService = getAttendanceService();

      const { pendingCheckoutId } = request.params as { pendingCheckoutId: string };

      await attendanceService.cancelPendingCheckout(
        tenant.tenantId,
        pendingCheckoutId
      );

      return sendSuccess(reply, null, 'Checkout cancelled');
    } catch (error: any) {
      return sendServerError(reply, error.message);
    }
  }

  /**
   * Get pending checkout status
   * GET /api/attendance/secure-checkout/:pendingCheckoutId
   */
  static async getPendingCheckout(request: FastifyRequest, reply: FastifyReply) {
    try {
      const tenant = (request as any).tenant as TenantContext;
      const attendanceService = getAttendanceService();

      const { pendingCheckoutId } = request.params as { pendingCheckoutId: string };

      const pendingCheckout = await attendanceService.getPendingCheckout(
        tenant.tenantId,
        pendingCheckoutId
      );

      if (!pendingCheckout) {
        return sendNotFound(reply, 'Pending checkout not found');
      }

      return sendSuccess(reply, {
        id: pendingCheckout.id,
        status: pendingCheckout.status,
        childName: pendingCheckout.child ? `${pendingCheckout.child.firstName} ${pendingCheckout.child.lastName}` : null,
        pickupPersonName: pendingCheckout.pickupPersonName,
        pickupPersonRelationship: pendingCheckout.pickupPersonRelationship,
        expiresAt: pendingCheckout.expiresAt,
        attemptCount: pendingCheckout.attemptCount,
        maxAttempts: pendingCheckout.maxAttempts,
      });
    } catch (error: any) {
      return sendServerError(reply, error.message);
    }
  }
}
