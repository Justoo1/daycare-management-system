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

      const { childId, date, reason, notifyParent } = request.body as any;

      if (!childId || !date) {
        return sendBadRequest(reply, 'Child ID and date are required');
      }

      const attendance = await attendanceService.recordAbsenceWithNotification(
        tenant.tenantId,
        tenant.userId,
        childId,
        {
          date: new Date(date),
          reason,
          notifyParent,
        }
      );

      return sendSuccess(reply, { attendance }, 'Absence recorded successfully');
    } catch (error: any) {
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

      console.log('Center Attendance Records:', records);
      console.log('Date Used:', dateToUse);
      console.log('Tenant ID:', tenant.tenantId);
      console.log('Center ID:', centerId);

      return sendSuccess(reply, { records });
    } catch (error: any) {
      return sendServerError(reply, error.message);
    }
  }
}
