import { FastifyRequest, FastifyReply } from 'fastify';
import { getShiftService } from '@services/ShiftService';
import { sendSuccess, sendCreated, sendBadRequest, sendNotFound, sendServerError } from '@utils/response';
import { TenantContext } from '@shared';

export class ShiftController {
  /**
   * Create a new shift
   * POST /api/shifts
   */
  static async createShift(request: FastifyRequest, reply: FastifyReply) {
    try {
      const tenant = (request as any).tenant as TenantContext;
      const shiftService = getShiftService();

      const {
        centerId,
        staffId,
        classId,
        shiftDate,
        startTime,
        endTime,
        breakDuration,
        notes,
      } = request.body as any;

      if (!centerId || !staffId || !shiftDate || !startTime || !endTime) {
        return sendBadRequest(
          reply,
          'Missing required fields: centerId, staffId, shiftDate, startTime, endTime'
        );
      }

      const shift = await shiftService.createShift(tenant.tenantId, {
        centerId,
        staffId,
        classId,
        shiftDate: new Date(shiftDate),
        startTime,
        endTime,
        breakDuration: breakDuration ? parseInt(breakDuration) : undefined,
        notes,
      });

      return sendCreated(reply, { shift }, 'Shift created successfully');
    } catch (error: any) {
      if (error.message === 'Staff already has a shift scheduled during this time') {
        return sendBadRequest(reply, error.message);
      }
      return sendServerError(reply, error.message);
    }
  }

  /**
   * Get shifts by staff
   * GET /api/shifts/staff/:staffId
   */
  static async getShiftsByStaff(request: FastifyRequest, reply: FastifyReply) {
    try {
      const tenant = (request as any).tenant as TenantContext;
      const shiftService = getShiftService();
      const { staffId } = request.params as { staffId: string };
      const query = request.query as any;

      const startDate = query.startDate ? new Date(query.startDate) : undefined;
      const endDate = query.endDate ? new Date(query.endDate) : undefined;

      const shifts = await shiftService.getShiftsByStaff(tenant.tenantId, staffId, startDate, endDate);

      return sendSuccess(reply, { shifts, count: shifts.length });
    } catch (error: any) {
      return sendServerError(reply, error.message);
    }
  }

  /**
   * Get shifts by center
   * GET /api/shifts/centers/:centerId
   */
  static async getShiftsByCenter(request: FastifyRequest, reply: FastifyReply) {
    try {
      const tenant = (request as any).tenant as TenantContext;
      const shiftService = getShiftService();
      const { centerId } = request.params as { centerId: string };
      const query = request.query as any;

      const startDate = query.startDate ? new Date(query.startDate) : undefined;
      const endDate = query.endDate ? new Date(query.endDate) : undefined;

      const shifts = await shiftService.getShiftsByCenter(tenant.tenantId, centerId, startDate, endDate);

      return sendSuccess(reply, { shifts, count: shifts.length });
    } catch (error: any) {
      return sendServerError(reply, error.message);
    }
  }

  /**
   * Get shifts by date
   * GET /api/shifts/date/:date
   */
  static async getShiftsByDate(request: FastifyRequest, reply: FastifyReply) {
    try {
      const tenant = (request as any).tenant as TenantContext;
      const shiftService = getShiftService();
      const { date } = request.params as { date: string };

      const shifts = await shiftService.getShiftsByDate(tenant.tenantId, new Date(date));

      return sendSuccess(reply, { shifts, count: shifts.length });
    } catch (error: any) {
      return sendServerError(reply, error.message);
    }
  }

  /**
   * Get shift by ID
   * GET /api/shifts/:id
   */
  static async getShiftById(request: FastifyRequest, reply: FastifyReply) {
    try {
      const tenant = (request as any).tenant as TenantContext;
      const shiftService = getShiftService();
      const { id } = request.params as { id: string };

      const shift = await shiftService.getShiftById(tenant.tenantId, id);

      if (!shift) {
        return sendNotFound(reply, 'Shift not found');
      }

      return sendSuccess(reply, { shift });
    } catch (error: any) {
      return sendServerError(reply, error.message);
    }
  }

  /**
   * Update shift
   * PUT /api/shifts/:id
   */
  static async updateShift(request: FastifyRequest, reply: FastifyReply) {
    try {
      const tenant = (request as any).tenant as TenantContext;
      const shiftService = getShiftService();
      const { id } = request.params as { id: string };
      const updateData = request.body as any;

      const shift = await shiftService.updateShift(tenant.tenantId, id, updateData);

      return sendSuccess(reply, { shift }, 'Shift updated successfully');
    } catch (error: any) {
      if (error.message === 'Shift not found') {
        return sendNotFound(reply, error.message);
      }
      if (error.message === 'Updated shift times overlap with another scheduled shift') {
        return sendBadRequest(reply, error.message);
      }
      return sendServerError(reply, error.message);
    }
  }

  /**
   * Clock in for shift
   * POST /api/shifts/:id/clock-in
   */
  static async clockIn(request: FastifyRequest, reply: FastifyReply) {
    try {
      const tenant = (request as any).tenant as TenantContext;
      const shiftService = getShiftService();
      const { id } = request.params as { id: string };
      const { clockInTime } = request.body as { clockInTime: string };

      if (!clockInTime) {
        return sendBadRequest(reply, 'clockInTime is required');
      }

      const shift = await shiftService.clockIn(tenant.tenantId, id, clockInTime);

      return sendSuccess(reply, { shift }, 'Clocked in successfully');
    } catch (error: any) {
      if (error.message === 'Shift not found') {
        return sendNotFound(reply, error.message);
      }
      if (error.message === 'Shift is not in scheduled status') {
        return sendBadRequest(reply, error.message);
      }
      return sendServerError(reply, error.message);
    }
  }

  /**
   * Clock out for shift
   * POST /api/shifts/:id/clock-out
   */
  static async clockOut(request: FastifyRequest, reply: FastifyReply) {
    try {
      const tenant = (request as any).tenant as TenantContext;
      const shiftService = getShiftService();
      const { id } = request.params as { id: string };
      const { clockOutTime } = request.body as { clockOutTime: string };

      if (!clockOutTime) {
        return sendBadRequest(reply, 'clockOutTime is required');
      }

      const shift = await shiftService.clockOut(tenant.tenantId, id, clockOutTime);

      return sendSuccess(reply, { shift }, 'Clocked out successfully');
    } catch (error: any) {
      if (error.message === 'Shift not found') {
        return sendNotFound(reply, error.message);
      }
      if (error.message === 'Cannot clock out without clocking in first') {
        return sendBadRequest(reply, error.message);
      }
      return sendServerError(reply, error.message);
    }
  }

  /**
   * Cancel shift
   * POST /api/shifts/:id/cancel
   */
  static async cancelShift(request: FastifyRequest, reply: FastifyReply) {
    try {
      const tenant = (request as any).tenant as TenantContext;
      const shiftService = getShiftService();
      const { id } = request.params as { id: string };
      const { reason } = request.body as { reason?: string };

      const shift = await shiftService.cancelShift(tenant.tenantId, id, reason);

      return sendSuccess(reply, { shift }, 'Shift cancelled successfully');
    } catch (error: any) {
      if (error.message === 'Shift not found') {
        return sendNotFound(reply, error.message);
      }
      return sendServerError(reply, error.message);
    }
  }

  /**
   * Mark shift as no-show
   * POST /api/shifts/:id/no-show
   */
  static async markNoShow(request: FastifyRequest, reply: FastifyReply) {
    try {
      const tenant = (request as any).tenant as TenantContext;
      const shiftService = getShiftService();
      const { id } = request.params as { id: string };

      const shift = await shiftService.markNoShow(tenant.tenantId, id);

      return sendSuccess(reply, { shift }, 'Shift marked as no-show');
    } catch (error: any) {
      if (error.message === 'Shift not found') {
        return sendNotFound(reply, error.message);
      }
      return sendServerError(reply, error.message);
    }
  }

  /**
   * Delete shift
   * DELETE /api/shifts/:id
   */
  static async deleteShift(request: FastifyRequest, reply: FastifyReply) {
    try {
      const tenant = (request as any).tenant as TenantContext;
      const shiftService = getShiftService();
      const { id } = request.params as { id: string };

      await shiftService.deleteShift(tenant.tenantId, id);

      return sendSuccess(reply, {}, 'Shift deleted successfully');
    } catch (error: any) {
      if (error.message === 'Shift not found') {
        return sendNotFound(reply, error.message);
      }
      return sendServerError(reply, error.message);
    }
  }

  /**
   * Get shift statistics
   * GET /api/shifts/statistics
   */
  static async getShiftStatistics(request: FastifyRequest, reply: FastifyReply) {
    try {
      const tenant = (request as any).tenant as TenantContext;
      const shiftService = getShiftService();
      const query = request.query as any;

      if (!query.startDate || !query.endDate) {
        return sendBadRequest(reply, 'startDate and endDate are required');
      }

      const statistics = await shiftService.getShiftStatistics(
        tenant.tenantId,
        new Date(query.startDate),
        new Date(query.endDate)
      );

      return sendSuccess(reply, { statistics });
    } catch (error: any) {
      return sendServerError(reply, error.message);
    }
  }

  /**
   * Get upcoming shifts for staff
   * GET /api/shifts/staff/:staffId/upcoming
   */
  static async getUpcomingShifts(request: FastifyRequest, reply: FastifyReply) {
    try {
      const tenant = (request as any).tenant as TenantContext;
      const shiftService = getShiftService();
      const { staffId } = request.params as { staffId: string };
      const query = request.query as any;
      const days = query.days ? parseInt(query.days) : 7;

      const shifts = await shiftService.getUpcomingShifts(tenant.tenantId, staffId, days);

      return sendSuccess(reply, { shifts, count: shifts.length });
    } catch (error: any) {
      return sendServerError(reply, error.message);
    }
  }

  /**
   * Create bulk shifts
   * POST /api/shifts/bulk
   */
  static async createBulkShifts(request: FastifyRequest, reply: FastifyReply) {
    try {
      const tenant = (request as any).tenant as TenantContext;
      const shiftService = getShiftService();
      const { shifts } = request.body as { shifts: any[] };

      if (!shifts || !Array.isArray(shifts) || shifts.length === 0) {
        return sendBadRequest(reply, 'shifts array is required and must not be empty');
      }

      // Convert date strings to Date objects
      const shiftsData = shifts.map((shift) => ({
        ...shift,
        shiftDate: new Date(shift.shiftDate),
      }));

      const createdShifts = await shiftService.createBulkShifts(tenant.tenantId, shiftsData);

      return sendCreated(reply, { shifts: createdShifts, count: createdShifts.length }, `Created ${createdShifts.length} shifts`);
    } catch (error: any) {
      return sendServerError(reply, error.message);
    }
  }
}
