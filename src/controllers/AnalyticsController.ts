import { FastifyRequest, FastifyReply } from 'fastify';
import { getAnalyticsService } from '@services/AnalyticsService';
import { sendSuccess, sendBadRequest, sendServerError } from '@utils/response';
import { TenantContext } from '@shared';

export class AnalyticsController {
  /**
   * Get attendance trends
   * GET /api/analytics/attendance/trends
   *
   * Staff with VIEW_CLASS_CHILDREN permission (but not VIEW_ALL_CHILDREN)
   * will see stats filtered to their assigned class only.
   * Accepts optional classId query parameter for explicit filtering.
   */
  static async getAttendanceTrends(request: FastifyRequest, reply: FastifyReply) {
    try {
      const tenant = (request as any).tenant as TenantContext;
      const analyticsService = getAnalyticsService();
      const query = request.query as any;

      if (!query.startDate || !query.endDate) {
        return sendBadRequest(reply, 'startDate and endDate are required');
      }

      const groupBy = (query.groupBy || 'day') as 'day' | 'week' | 'month';

      // Determine class filter:
      // 1. Use explicit classId from query if provided
      // 2. Otherwise, managers see all, teachers see their assigned class
      const isManager = ['super_admin', 'center_owner', 'director'].includes(tenant.role);
      const filterClassId = query.classId || (!isManager ? tenant.classId : undefined);

      const trends = await analyticsService.getAttendanceTrends(
        tenant.tenantId,
        new Date(query.startDate),
        new Date(query.endDate),
        groupBy,
        filterClassId
      );

      return sendSuccess(reply, { trends });
    } catch (error: any) {
      return sendServerError(reply, error.message);
    }
  }

  /**
   * Get attendance by class
   * GET /api/analytics/attendance/by-class
   */
  static async getAttendanceByClass(request: FastifyRequest, reply: FastifyReply) {
    try {
      const tenant = (request as any).tenant as TenantContext;
      const analyticsService = getAnalyticsService();
      const query = request.query as any;

      if (!query.startDate || !query.endDate) {
        return sendBadRequest(reply, 'startDate and endDate are required');
      }

      const data = await analyticsService.getAttendanceByClass(
        tenant.tenantId,
        new Date(query.startDate),
        new Date(query.endDate)
      );

      return sendSuccess(reply, { data });
    } catch (error: any) {
      return sendServerError(reply, error.message);
    }
  }

  /**
   * Get enrollment trends
   * GET /api/analytics/enrollment/trends
   */
  static async getEnrollmentTrends(request: FastifyRequest, reply: FastifyReply) {
    try {
      const tenant = (request as any).tenant as TenantContext;
      const analyticsService = getAnalyticsService();
      const query = request.query as any;

      if (!query.startDate || !query.endDate) {
        return sendBadRequest(reply, 'startDate and endDate are required');
      }

      const trends = await analyticsService.getEnrollmentTrends(
        tenant.tenantId,
        new Date(query.startDate),
        new Date(query.endDate)
      );

      return sendSuccess(reply, { trends });
    } catch (error: any) {
      return sendServerError(reply, error.message);
    }
  }

  /**
   * Get enrollment demographics
   * GET /api/analytics/enrollment/demographics
   */
  static async getEnrollmentDemographics(request: FastifyRequest, reply: FastifyReply) {
    try {
      const tenant = (request as any).tenant as TenantContext;
      const analyticsService = getAnalyticsService();

      const demographics = await analyticsService.getEnrollmentDemographics(tenant.tenantId);

      return sendSuccess(reply, { demographics });
    } catch (error: any) {
      return sendServerError(reply, error.message);
    }
  }

  /**
   * Get retention rate
   * GET /api/analytics/enrollment/retention
   */
  static async getRetentionRate(request: FastifyRequest, reply: FastifyReply) {
    try {
      const tenant = (request as any).tenant as TenantContext;
      const analyticsService = getAnalyticsService();
      const query = request.query as any;

      if (!query.startDate || !query.endDate) {
        return sendBadRequest(reply, 'startDate and endDate are required');
      }

      const retention = await analyticsService.getRetentionRate(
        tenant.tenantId,
        new Date(query.startDate),
        new Date(query.endDate)
      );

      return sendSuccess(reply, { retention });
    } catch (error: any) {
      return sendServerError(reply, error.message);
    }
  }

  /**
   * Get staff analytics
   * GET /api/analytics/staff
   */
  static async getStaffAnalytics(request: FastifyRequest, reply: FastifyReply) {
    try {
      const tenant = (request as any).tenant as TenantContext;
      const analyticsService = getAnalyticsService();
      const query = request.query as any;

      if (!query.startDate || !query.endDate) {
        return sendBadRequest(reply, 'startDate and endDate are required');
      }

      const analytics = await analyticsService.getStaffAnalytics(
        tenant.tenantId,
        new Date(query.startDate),
        new Date(query.endDate)
      );

      return sendSuccess(reply, { analytics });
    } catch (error: any) {
      return sendServerError(reply, error.message);
    }
  }

  /**
   * Get dashboard summary
   * GET /api/analytics/dashboard
   *
   * Staff with VIEW_CLASS_CHILDREN permission (but not VIEW_ALL_CHILDREN)
   * will see stats filtered to their assigned class only.
   */
  static async getDashboardSummary(request: FastifyRequest, reply: FastifyReply) {
    try {
      const tenant = (request as any).tenant as TenantContext;
      const analyticsService = getAnalyticsService();

      // Determine if user should see class-filtered stats
      // Managers (super_admin, center_owner, director) see all stats
      // Staff/teachers with assigned class see only their class stats
      const isManager = ['super_admin', 'center_owner', 'director'].includes(tenant.role);

      // For non-managers: filter by their assigned class
      // If they don't have an assigned class, they'll see empty stats
      const filterClassId = !isManager ? tenant.classId : undefined;

      const summary = await analyticsService.getDashboardSummary(tenant.tenantId, filterClassId);

      return sendSuccess(reply, { summary });
    } catch (error: any) {
      return sendServerError(reply, error.message);
    }
  }
}
