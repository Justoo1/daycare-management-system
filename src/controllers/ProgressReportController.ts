import { FastifyRequest, FastifyReply } from 'fastify';
import { getProgressReportService } from '@services/ProgressReportService';
import { sendSuccess, sendCreated, sendBadRequest, sendNotFound, sendServerError } from '@utils/response';
import { TenantContext } from '@shared';

export class ProgressReportController {
  /**
   * Generate a progress report
   * POST /api/progress-reports
   */
  static async generateProgressReport(request: FastifyRequest, reply: FastifyReply) {
    try {
      const tenant = (request as any).tenant as TenantContext;
      const progressReportService = getProgressReportService();

      const {
        childId,
        reportPeriod,
        startDate,
        endDate,
        teacherComments,
        directorComments,
        behaviorRating,
        socialSkillsRating,
        academicProgressRating,
        academicProgress,
        socialEmotionalDevelopment,
        physicalDevelopment,
        languageDevelopment,
        cognitiveDevelopment,
        recommendations,
        goalsForNextPeriod,
      } = request.body as any;

      if (!childId || !reportPeriod || !startDate || !endDate) {
        return sendBadRequest(reply, 'Missing required fields: childId, reportPeriod, startDate, endDate');
      }

      const report = await progressReportService.generateProgressReport(
        tenant.tenantId,
        childId,
        tenant.userId,
        {
          reportPeriod,
          startDate: new Date(startDate),
          endDate: new Date(endDate),
          teacherComments,
          directorComments,
          behaviorRating: behaviorRating ? parseInt(behaviorRating) : undefined,
          socialSkillsRating: socialSkillsRating ? parseInt(socialSkillsRating) : undefined,
          academicProgressRating: academicProgressRating ? parseInt(academicProgressRating) : undefined,
          academicProgress,
          socialEmotionalDevelopment,
          physicalDevelopment,
          languageDevelopment,
          cognitiveDevelopment,
          recommendations,
          goalsForNextPeriod,
        }
      );

      return sendCreated(reply, { report }, 'Progress report generated successfully');
    } catch (error: any) {
      return sendServerError(reply, error.message);
    }
  }

  /**
   * Get progress reports for a child
   * GET /api/progress-reports/children/:childId
   */
  static async getProgressReportsByChild(request: FastifyRequest, reply: FastifyReply) {
    try {
      const tenant = (request as any).tenant as TenantContext;
      const progressReportService = getProgressReportService();
      const { childId } = request.params as { childId: string };

      const reports = await progressReportService.getProgressReportsByChild(tenant.tenantId, childId);

      return sendSuccess(reply, { reports, count: reports.length });
    } catch (error: any) {
      return sendServerError(reply, error.message);
    }
  }

  /**
   * Get progress report by ID
   * GET /api/progress-reports/:id
   */
  static async getProgressReportById(request: FastifyRequest, reply: FastifyReply) {
    try {
      const tenant = (request as any).tenant as TenantContext;
      const progressReportService = getProgressReportService();
      const { id } = request.params as { id: string };

      const report = await progressReportService.getProgressReportById(tenant.tenantId, id);

      if (!report) {
        return sendNotFound(reply, 'Progress report not found');
      }

      return sendSuccess(reply, { report });
    } catch (error: any) {
      return sendServerError(reply, error.message);
    }
  }

  /**
   * Get report statistics for a child
   * GET /api/progress-reports/children/:childId/statistics
   */
  static async getReportStatistics(request: FastifyRequest, reply: FastifyReply) {
    try {
      const tenant = (request as any).tenant as TenantContext;
      const progressReportService = getProgressReportService();
      const { childId } = request.params as { childId: string };

      const statistics = await progressReportService.getReportStatistics(tenant.tenantId, childId);

      return sendSuccess(reply, { statistics });
    } catch (error: any) {
      return sendServerError(reply, error.message);
    }
  }

  /**
   * Update progress report
   * PUT /api/progress-reports/:id
   */
  static async updateProgressReport(request: FastifyRequest, reply: FastifyReply) {
    try {
      const tenant = (request as any).tenant as TenantContext;
      const progressReportService = getProgressReportService();
      const { id } = request.params as { id: string };
      const updateData = request.body as any;

      const report = await progressReportService.updateProgressReport(tenant.tenantId, id, updateData);

      return sendSuccess(reply, { report }, 'Progress report updated successfully');
    } catch (error: any) {
      if (error.message === 'Progress report not found') {
        return sendNotFound(reply, error.message);
      }
      return sendServerError(reply, error.message);
    }
  }

  /**
   * Delete progress report
   * DELETE /api/progress-reports/:id
   */
  static async deleteProgressReport(request: FastifyRequest, reply: FastifyReply) {
    try {
      const tenant = (request as any).tenant as TenantContext;
      const progressReportService = getProgressReportService();
      const { id } = request.params as { id: string };

      await progressReportService.deleteProgressReport(tenant.tenantId, id);

      return sendSuccess(reply, {}, 'Progress report deleted successfully');
    } catch (error: any) {
      if (error.message === 'Progress report not found') {
        return sendNotFound(reply, error.message);
      }
      return sendServerError(reply, error.message);
    }
  }

  /**
   * Share report with parent
   * POST /api/progress-reports/:id/share
   */
  static async shareWithParent(request: FastifyRequest, reply: FastifyReply) {
    try {
      const tenant = (request as any).tenant as TenantContext;
      const progressReportService = getProgressReportService();
      const { id } = request.params as { id: string };

      const report = await progressReportService.shareWithParent(tenant.tenantId, id);

      return sendSuccess(reply, { report }, 'Progress report shared with parent successfully');
    } catch (error: any) {
      if (error.message === 'Progress report not found') {
        return sendNotFound(reply, error.message);
      }
      return sendServerError(reply, error.message);
    }
  }

  /**
   * Generate bulk reports for a class
   * POST /api/progress-reports/bulk
   */
  static async generateBulkReports(request: FastifyRequest, reply: FastifyReply) {
    try {
      const tenant = (request as any).tenant as TenantContext;
      const progressReportService = getProgressReportService();

      const { classId, reportPeriod, startDate, endDate } = request.body as any;

      if (!classId || !reportPeriod || !startDate || !endDate) {
        return sendBadRequest(reply, 'Missing required fields: classId, reportPeriod, startDate, endDate');
      }

      const reports = await progressReportService.generateBulkReportsForClass(
        tenant.tenantId,
        classId,
        tenant.userId,
        {
          reportPeriod,
          startDate: new Date(startDate),
          endDate: new Date(endDate),
        }
      );

      return sendCreated(reply, { reports, count: reports.length }, `Generated ${reports.length} progress reports`);
    } catch (error: any) {
      return sendServerError(reply, error.message);
    }
  }
}
