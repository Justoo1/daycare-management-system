import { FastifyRequest, FastifyReply } from 'fastify';
import { getReportService } from '@services/ReportService';
import { sendSuccess, sendCreated, sendBadRequest, sendNotFound, sendServerError } from '@utils/response';
import { TenantContext, ReportType, ReportFormat } from '@shared';

export class ReportController {
  /**
   * Generate a custom report
   * POST /api/reports/generate
   */
  static async generateReport(request: FastifyRequest, reply: FastifyReply) {
    try {
      const tenant = (request as any).tenant as TenantContext;
      const reportService = getReportService();

      const {
        reportType,
        reportName,
        startDate,
        endDate,
        filters,
        format,
      } = request.body as any;

      if (!reportType || !reportName || !startDate || !endDate) {
        return sendBadRequest(
          reply,
          'Missing required fields: reportType, reportName, startDate, endDate'
        );
      }

      const report = await reportService.generateReport(tenant.tenantId, tenant.userId, {
        reportType,
        reportName,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        filters,
        format,
      });

      return sendCreated(reply, { report }, 'Report generated successfully');
    } catch (error: any) {
      return sendServerError(reply, error.message);
    }
  }

  /**
   * Get all reports
   * GET /api/reports
   */
  static async getReports(request: FastifyRequest, reply: FastifyReply) {
    try {
      const tenant = (request as any).tenant as TenantContext;
      const reportService = getReportService();
      const query = request.query as any;

      const filters: any = {};
      if (query.reportType) filters.reportType = query.reportType as ReportType;
      if (query.startDate) filters.startDate = new Date(query.startDate);
      if (query.endDate) filters.endDate = new Date(query.endDate);

      const reports = await reportService.getReports(tenant.tenantId, filters);

      return sendSuccess(reply, { reports, count: reports.length });
    } catch (error: any) {
      return sendServerError(reply, error.message);
    }
  }

  /**
   * Get report by ID
   * GET /api/reports/:id
   */
  static async getReportById(request: FastifyRequest, reply: FastifyReply) {
    try {
      const tenant = (request as any).tenant as TenantContext;
      const reportService = getReportService();
      const { id } = request.params as { id: string };

      const report = await reportService.getReportById(tenant.tenantId, id);

      if (!report) {
        return sendNotFound(reply, 'Report not found');
      }

      return sendSuccess(reply, { report });
    } catch (error: any) {
      return sendServerError(reply, error.message);
    }
  }

  /**
   * Get recent reports
   * GET /api/reports/recent
   */
  static async getRecentReports(request: FastifyRequest, reply: FastifyReply) {
    try {
      const tenant = (request as any).tenant as TenantContext;
      const reportService = getReportService();
      const query = request.query as any;

      const limit = query.limit ? parseInt(query.limit) : 10;

      const reports = await reportService.getRecentReports(tenant.tenantId, limit);

      return sendSuccess(reply, { reports, count: reports.length });
    } catch (error: any) {
      return sendServerError(reply, error.message);
    }
  }

  /**
   * Get report statistics
   * GET /api/reports/statistics
   */
  static async getReportStatistics(request: FastifyRequest, reply: FastifyReply) {
    try {
      const tenant = (request as any).tenant as TenantContext;
      const reportService = getReportService();

      const statistics = await reportService.getReportStatistics(tenant.tenantId);

      return sendSuccess(reply, { statistics });
    } catch (error: any) {
      return sendServerError(reply, error.message);
    }
  }

  /**
   * Delete report
   * DELETE /api/reports/:id
   */
  static async deleteReport(request: FastifyRequest, reply: FastifyReply) {
    try {
      const tenant = (request as any).tenant as TenantContext;
      const reportService = getReportService();
      const { id } = request.params as { id: string };

      await reportService.deleteReport(tenant.tenantId, id);

      return sendSuccess(reply, {}, 'Report deleted successfully');
    } catch (error: any) {
      if (error.message === 'Report not found') {
        return sendNotFound(reply, error.message);
      }
      return sendServerError(reply, error.message);
    }
  }
}
