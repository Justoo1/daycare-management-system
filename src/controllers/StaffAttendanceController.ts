import { FastifyRequest, FastifyReply } from 'fastify';
import { getStaffAttendanceService } from '@services/StaffAttendanceService';
import { sendSuccess, sendCreated, sendBadRequest, sendNotFound, sendServerError } from '@utils/response';
import { TenantContext } from '@shared';

export class StaffAttendanceController {
  /**
   * Record check-in
   * POST /api/staff-attendance/check-in
   */
  static async recordCheckIn(request: FastifyRequest, reply: FastifyReply) {
    try {
      const tenant = (request as any).tenant as TenantContext;
      const attendanceService = getStaffAttendanceService();

      const { staffId, attendanceDate, checkInTime, notes } = request.body as any;

      if (!staffId || !attendanceDate || !checkInTime) {
        return sendBadRequest(reply, 'Missing required fields: staffId, attendanceDate, checkInTime');
      }

      const attendance = await attendanceService.recordCheckIn(
        tenant.tenantId,
        staffId,
        new Date(attendanceDate),
        checkInTime,
        notes
      );

      return sendCreated(reply, { attendance }, 'Check-in recorded successfully');
    } catch (error: any) {
      if (error.message === 'Attendance already recorded for this date') {
        return sendBadRequest(reply, error.message);
      }
      return sendServerError(reply, error.message);
    }
  }

  /**
   * Record check-out
   * POST /api/staff-attendance/:id/check-out
   */
  static async recordCheckOut(request: FastifyRequest, reply: FastifyReply) {
    try {
      const tenant = (request as any).tenant as TenantContext;
      const attendanceService = getStaffAttendanceService();
      const { id } = request.params as { id: string };
      const { checkOutTime, breakDuration } = request.body as { checkOutTime: string; breakDuration?: number };

      if (!checkOutTime) {
        return sendBadRequest(reply, 'checkOutTime is required');
      }

      const attendance = await attendanceService.recordCheckOut(
        tenant.tenantId,
        id,
        checkOutTime,
        breakDuration ? parseInt(breakDuration.toString()) : undefined
      );

      return sendSuccess(reply, { attendance }, 'Check-out recorded successfully');
    } catch (error: any) {
      if (error.message === 'Attendance record not found') {
        return sendNotFound(reply, error.message);
      }
      if (
        error.message === 'Cannot check out without checking in first' ||
        error.message === 'Already checked out'
      ) {
        return sendBadRequest(reply, error.message);
      }
      return sendServerError(reply, error.message);
    }
  }

  /**
   * Mark staff as absent
   * POST /api/staff-attendance/mark-absent
   */
  static async markAbsent(request: FastifyRequest, reply: FastifyReply) {
    try {
      const tenant = (request as any).tenant as TenantContext;
      const attendanceService = getStaffAttendanceService();

      const { staffId, attendanceDate, notes } = request.body as any;

      if (!staffId || !attendanceDate) {
        return sendBadRequest(reply, 'Missing required fields: staffId, attendanceDate');
      }

      const attendance = await attendanceService.markAbsent(
        tenant.tenantId,
        staffId,
        new Date(attendanceDate),
        notes
      );

      return sendCreated(reply, { attendance }, 'Staff marked as absent');
    } catch (error: any) {
      return sendServerError(reply, error.message);
    }
  }

  /**
   * Mark staff on leave
   * POST /api/staff-attendance/mark-leave
   */
  static async markOnLeave(request: FastifyRequest, reply: FastifyReply) {
    try {
      const tenant = (request as any).tenant as TenantContext;
      const attendanceService = getStaffAttendanceService();

      const { staffId, attendanceDate, leaveType, notes } = request.body as any;

      if (!staffId || !attendanceDate || !leaveType) {
        return sendBadRequest(reply, 'Missing required fields: staffId, attendanceDate, leaveType');
      }

      if (leaveType !== 'on_leave' && leaveType !== 'sick_leave') {
        return sendBadRequest(reply, 'leaveType must be either "on_leave" or "sick_leave"');
      }

      const attendance = await attendanceService.markOnLeave(
        tenant.tenantId,
        staffId,
        new Date(attendanceDate),
        leaveType,
        notes
      );

      return sendCreated(reply, { attendance }, 'Leave marked successfully');
    } catch (error: any) {
      return sendServerError(reply, error.message);
    }
  }

  /**
   * Check-in via QR code
   * POST /api/staff-attendance/qr-check-in
   */
  static async qrCheckIn(request: FastifyRequest, reply: FastifyReply) {
    try {
      const attendanceService = getStaffAttendanceService();
      const { qrCode, latitude, longitude } = request.body as {
        qrCode: string;
        latitude: number;
        longitude: number;
      };

      if (!qrCode || latitude === undefined || longitude === undefined) {
        return sendBadRequest(reply, 'Missing required fields: qrCode, latitude, longitude');
      }

      const attendance = await attendanceService.recordCheckInByQRCode(
        qrCode,
        latitude,
        longitude
      );

      return sendCreated(reply, { attendance }, 'Checked in successfully');
    } catch (error: any) {
      if (
        error.message.includes('Invalid QR code') ||
        error.message.includes('already recorded') ||
        error.message.includes('must be at the center')
      ) {
        return sendBadRequest(reply, error.message);
      }
      return sendServerError(reply, error.message);
    }
  }

  /**
   * Check-out via QR code
   * POST /api/staff-attendance/qr-check-out
   */
  static async qrCheckOut(request: FastifyRequest, reply: FastifyReply) {
    try {
      const attendanceService = getStaffAttendanceService();
      const { qrCode, latitude, longitude, breakDuration } = request.body as {
        qrCode: string;
        latitude: number;
        longitude: number;
        breakDuration?: number;
      };

      if (!qrCode || latitude === undefined || longitude === undefined) {
        return sendBadRequest(reply, 'Missing required fields: qrCode, latitude, longitude');
      }

      const attendance = await attendanceService.recordCheckOutByQRCode(
        qrCode,
        latitude,
        longitude,
        breakDuration
      );

      return sendSuccess(reply, { attendance }, 'Checked out successfully');
    } catch (error: any) {
      if (
        error.message.includes('Invalid QR code') ||
        error.message.includes('No check-in') ||
        error.message.includes('Already checked out') ||
        error.message.includes('must be at the center')
      ) {
        return sendBadRequest(reply, error.message);
      }
      return sendServerError(reply, error.message);
    }
  }

  /**
   * Verify location for check-in
   * POST /api/staff-attendance/verify-location
   */
  static async verifyLocation(request: FastifyRequest, reply: FastifyReply) {
    try {
      const attendanceService = getStaffAttendanceService();
      const { staffId, latitude, longitude } = request.body as {
        staffId: string;
        latitude: number;
        longitude: number;
      };

      if (!staffId || latitude === undefined || longitude === undefined) {
        return sendBadRequest(reply, 'Missing required fields: staffId, latitude, longitude');
      }

      const result = await attendanceService.verifyLocation(staffId, latitude, longitude);

      return sendSuccess(reply, result);
    } catch (error: any) {
      return sendServerError(reply, error.message);
    }
  }

  /**
   * Get attendance by ID
   * GET /api/staff-attendance/:id
   */
  static async getAttendanceById(request: FastifyRequest, reply: FastifyReply) {
    try {
      const tenant = (request as any).tenant as TenantContext;
      const attendanceService = getStaffAttendanceService();
      const { id } = request.params as { id: string };

      const attendance = await attendanceService.getAttendanceById(tenant.tenantId, id);

      if (!attendance) {
        return sendNotFound(reply, 'Attendance record not found');
      }

      return sendSuccess(reply, { attendance });
    } catch (error: any) {
      return sendServerError(reply, error.message);
    }
  }

  /**
   * Get attendance by staff
   * GET /api/staff-attendance/staff/:staffId
   */
  static async getAttendanceByStaff(request: FastifyRequest, reply: FastifyReply) {
    try {
      const tenant = (request as any).tenant as TenantContext;
      const attendanceService = getStaffAttendanceService();
      const { staffId } = request.params as { staffId: string };
      const query = request.query as any;

      const startDate = query.startDate ? new Date(query.startDate) : undefined;
      const endDate = query.endDate ? new Date(query.endDate) : undefined;

      const attendances = await attendanceService.getAttendanceByStaff(
        tenant.tenantId,
        staffId,
        startDate,
        endDate
      );

      return sendSuccess(reply, { attendances, count: attendances.length });
    } catch (error: any) {
      return sendServerError(reply, error.message);
    }
  }

  /**
   * Get attendance by staff and date
   * GET /api/staff-attendance/staff/:staffId/date/:date
   */
  static async getAttendanceByStaffAndDate(request: FastifyRequest, reply: FastifyReply) {
    try {
      const tenant = (request as any).tenant as TenantContext;
      const attendanceService = getStaffAttendanceService();
      const { staffId, date } = request.params as { staffId: string; date: string };

      const attendance = await attendanceService.getAttendanceByStaffAndDate(
        tenant.tenantId,
        staffId,
        new Date(date)
      );

      return sendSuccess(reply, { attendance });
    } catch (error: any) {
      return sendServerError(reply, error.message);
    }
  }

  /**
   * Get attendance by date
   * GET /api/staff-attendance/date/:date
   */
  static async getAttendanceByDate(request: FastifyRequest, reply: FastifyReply) {
    try {
      const tenant = (request as any).tenant as TenantContext;
      const attendanceService = getStaffAttendanceService();
      const { date } = request.params as { date: string };

      const attendances = await attendanceService.getAttendanceByDate(tenant.tenantId, new Date(date));

      return sendSuccess(reply, { attendances, count: attendances.length });
    } catch (error: any) {
      return sendServerError(reply, error.message);
    }
  }

  /**
   * Update attendance
   * PUT /api/staff-attendance/:id
   */
  static async updateAttendance(request: FastifyRequest, reply: FastifyReply) {
    try {
      const tenant = (request as any).tenant as TenantContext;
      const attendanceService = getStaffAttendanceService();
      const { id } = request.params as { id: string };
      const updateData = request.body as any;

      const attendance = await attendanceService.updateAttendance(tenant.tenantId, id, updateData);

      return sendSuccess(reply, { attendance }, 'Attendance updated successfully');
    } catch (error: any) {
      if (error.message === 'Attendance record not found') {
        return sendNotFound(reply, error.message);
      }
      return sendServerError(reply, error.message);
    }
  }

  /**
   * Delete attendance
   * DELETE /api/staff-attendance/:id
   */
  static async deleteAttendance(request: FastifyRequest, reply: FastifyReply) {
    try {
      const tenant = (request as any).tenant as TenantContext;
      const attendanceService = getStaffAttendanceService();
      const { id } = request.params as { id: string };

      await attendanceService.deleteAttendance(tenant.tenantId, id);

      return sendSuccess(reply, {}, 'Attendance deleted successfully');
    } catch (error: any) {
      if (error.message === 'Attendance record not found') {
        return sendNotFound(reply, error.message);
      }
      return sendServerError(reply, error.message);
    }
  }

  /**
   * Get staff attendance statistics
   * GET /api/staff-attendance/staff/:staffId/statistics
   */
  static async getStaffAttendanceStatistics(request: FastifyRequest, reply: FastifyReply) {
    try {
      const tenant = (request as any).tenant as TenantContext;
      const attendanceService = getStaffAttendanceService();
      const { staffId } = request.params as { staffId: string };
      const query = request.query as any;

      if (!query.startDate || !query.endDate) {
        return sendBadRequest(reply, 'startDate and endDate are required');
      }

      const statistics = await attendanceService.getStaffAttendanceStatistics(
        tenant.tenantId,
        staffId,
        new Date(query.startDate),
        new Date(query.endDate)
      );

      return sendSuccess(reply, { statistics });
    } catch (error: any) {
      return sendServerError(reply, error.message);
    }
  }

  /**
   * Get daily attendance summary
   * GET /api/staff-attendance/summary/date/:date
   */
  static async getDailyAttendanceSummary(request: FastifyRequest, reply: FastifyReply) {
    try {
      const tenant = (request as any).tenant as TenantContext;
      const attendanceService = getStaffAttendanceService();
      const { date } = request.params as { date: string };

      const summary = await attendanceService.getDailyAttendanceSummary(tenant.tenantId, new Date(date));

      return sendSuccess(reply, { summary });
    } catch (error: any) {
      return sendServerError(reply, error.message);
    }
  }

  /**
   * Get late arrivals
   * GET /api/staff-attendance/late-arrivals
   */
  static async getLateArrivals(request: FastifyRequest, reply: FastifyReply) {
    try {
      const tenant = (request as any).tenant as TenantContext;
      const attendanceService = getStaffAttendanceService();
      const query = request.query as any;

      if (!query.startDate || !query.endDate) {
        return sendBadRequest(reply, 'startDate and endDate are required');
      }

      const attendances = await attendanceService.getLateArrivals(
        tenant.tenantId,
        new Date(query.startDate),
        new Date(query.endDate)
      );

      return sendSuccess(reply, { attendances, count: attendances.length });
    } catch (error: any) {
      return sendServerError(reply, error.message);
    }
  }

  /**
   * Get overtime records
   * GET /api/staff-attendance/overtime
   */
  static async getOvertimeRecords(request: FastifyRequest, reply: FastifyReply) {
    try {
      const tenant = (request as any).tenant as TenantContext;
      const attendanceService = getStaffAttendanceService();
      const query = request.query as any;

      if (!query.startDate || !query.endDate) {
        return sendBadRequest(reply, 'startDate and endDate are required');
      }

      const minOvertimeHours = query.minOvertimeHours ? parseFloat(query.minOvertimeHours) : 0;

      const records = await attendanceService.getOvertimeRecords(
        tenant.tenantId,
        new Date(query.startDate),
        new Date(query.endDate),
        minOvertimeHours
      );

      return sendSuccess(reply, { records, count: records.length });
    } catch (error: any) {
      return sendServerError(reply, error.message);
    }
  }

  /**
   * Bulk create attendance
   * POST /api/staff-attendance/bulk
   */
  static async bulkCreateAttendance(request: FastifyRequest, reply: FastifyReply) {
    try {
      const tenant = (request as any).tenant as TenantContext;
      const attendanceService = getStaffAttendanceService();
      const { records } = request.body as { records: any[] };

      if (!records || !Array.isArray(records) || records.length === 0) {
        return sendBadRequest(reply, 'records array is required and must not be empty');
      }

      // Convert date strings to Date objects
      const recordsData = records.map((record) => ({
        ...record,
        attendanceDate: new Date(record.attendanceDate),
      }));

      const attendances = await attendanceService.bulkCreateAttendance(tenant.tenantId, recordsData);

      return sendCreated(
        reply,
        { attendances, count: attendances.length },
        `Created ${attendances.length} attendance records`
      );
    } catch (error: any) {
      return sendServerError(reply, error.message);
    }
  }
}
