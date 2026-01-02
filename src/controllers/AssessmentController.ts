import { FastifyRequest, FastifyReply } from 'fastify';
import { getAssessmentService } from '@services/AssessmentService';
import { sendSuccess, sendCreated, sendBadRequest, sendNotFound, sendServerError } from '@utils/response';
import { TenantContext, AssessmentType } from '@shared';

export class AssessmentController {
  /**
   * Create a new assessment
   * POST /api/assessments
   */
  static async createAssessment(request: FastifyRequest, reply: FastifyReply) {
    try {
      const tenant = (request as any).tenant as TenantContext;
      const assessmentService = getAssessmentService();

      const {
        childId,
        assessmentType,
        assessmentDate,
        overallScore,
        ratings,
        strengths,
        areasForImprovement,
        recommendations,
        notes,
        nextAssessmentDate,
        attachmentUrls,
      } = request.body as any;

      if (!childId || !assessmentType || !assessmentDate) {
        return sendBadRequest(reply, 'Missing required fields: childId, assessmentType, assessmentDate');
      }

      const assessment = await assessmentService.createAssessment(
        tenant.tenantId,
        childId,
        tenant.userId,
        {
          assessmentType,
          assessmentDate: new Date(assessmentDate),
          overallScore: overallScore ? parseFloat(overallScore) : undefined,
          ratings,
          strengths,
          areasForImprovement,
          recommendations,
          notes,
          nextAssessmentDate: nextAssessmentDate ? new Date(nextAssessmentDate) : undefined,
          attachmentUrls,
        }
      );

      return sendCreated(reply, { assessment }, 'Assessment created successfully');
    } catch (error: any) {
      return sendServerError(reply, error.message);
    }
  }

  /**
   * Get assessments for a child
   * GET /api/assessments/children/:childId
   */
  static async getAssessmentsByChild(request: FastifyRequest, reply: FastifyReply) {
    try {
      const tenant = (request as any).tenant as TenantContext;
      const assessmentService = getAssessmentService();
      const { childId } = request.params as { childId: string };

      const assessments = await assessmentService.getAssessmentsByChild(tenant.tenantId, childId);

      return sendSuccess(reply, { assessments, count: assessments.length });
    } catch (error: any) {
      return sendServerError(reply, error.message);
    }
  }

  /**
   * Get assessment by ID
   * GET /api/assessments/:id
   */
  static async getAssessmentById(request: FastifyRequest, reply: FastifyReply) {
    try {
      const tenant = (request as any).tenant as TenantContext;
      const assessmentService = getAssessmentService();
      const { id } = request.params as { id: string };

      const assessment = await assessmentService.getAssessmentById(tenant.tenantId, id);

      if (!assessment) {
        return sendNotFound(reply, 'Assessment not found');
      }

      return sendSuccess(reply, { assessment });
    } catch (error: any) {
      return sendServerError(reply, error.message);
    }
  }

  /**
   * Get assessment summary for a child
   * GET /api/assessments/children/:childId/summary
   */
  static async getAssessmentSummary(request: FastifyRequest, reply: FastifyReply) {
    try {
      const tenant = (request as any).tenant as TenantContext;
      const assessmentService = getAssessmentService();
      const { childId } = request.params as { childId: string };

      const summary = await assessmentService.getAssessmentSummary(tenant.tenantId, childId);

      return sendSuccess(reply, { summary });
    } catch (error: any) {
      return sendServerError(reply, error.message);
    }
  }

  /**
   * Get assessment progress for a child
   * GET /api/assessments/children/:childId/progress/:type
   */
  static async getAssessmentProgress(request: FastifyRequest, reply: FastifyReply) {
    try {
      const tenant = (request as any).tenant as TenantContext;
      const assessmentService = getAssessmentService();
      const { childId, type } = request.params as { childId: string; type: AssessmentType };

      const progress = await assessmentService.getAssessmentProgress(
        tenant.tenantId,
        childId,
        type
      );

      return sendSuccess(reply, { progress });
    } catch (error: any) {
      return sendServerError(reply, error.message);
    }
  }

  /**
   * Update assessment
   * PUT /api/assessments/:id
   */
  static async updateAssessment(request: FastifyRequest, reply: FastifyReply) {
    try {
      const tenant = (request as any).tenant as TenantContext;
      const assessmentService = getAssessmentService();
      const { id } = request.params as { id: string };
      const updateData = request.body as any;

      const assessment = await assessmentService.updateAssessment(tenant.tenantId, id, updateData);

      return sendSuccess(reply, { assessment }, 'Assessment updated successfully');
    } catch (error: any) {
      if (error.message === 'Assessment not found') {
        return sendNotFound(reply, error.message);
      }
      return sendServerError(reply, error.message);
    }
  }

  /**
   * Delete assessment
   * DELETE /api/assessments/:id
   */
  static async deleteAssessment(request: FastifyRequest, reply: FastifyReply) {
    try {
      const tenant = (request as any).tenant as TenantContext;
      const assessmentService = getAssessmentService();
      const { id } = request.params as { id: string };

      await assessmentService.deleteAssessment(tenant.tenantId, id);

      return sendSuccess(reply, {}, 'Assessment deleted successfully');
    } catch (error: any) {
      if (error.message === 'Assessment not found') {
        return sendNotFound(reply, error.message);
      }
      return sendServerError(reply, error.message);
    }
  }
}
