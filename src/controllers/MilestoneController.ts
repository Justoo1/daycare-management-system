import { FastifyRequest, FastifyReply } from 'fastify';
import { getMilestoneService } from '@services/MilestoneService';
import { sendSuccess, sendCreated, sendBadRequest, sendNotFound, sendServerError } from '@utils/response';
import { TenantContext, MilestoneCategory } from '@shared';

export class MilestoneController {
  /**
   * Create a new milestone
   * POST /api/milestones
   */
  static async createMilestone(request: FastifyRequest, reply: FastifyReply) {
    try {
      const tenant = (request as any).tenant as TenantContext;
      const milestoneService = getMilestoneService();

      const {
        childId,
        category,
        title,
        description,
        ageExpected,
        dateAchieved,
        notes,
        photoUrls,
      } = request.body as any;

      if (!childId || !category || !title || !description || ageExpected === undefined) {
        return sendBadRequest(reply, 'Missing required fields: childId, category, title, description, ageExpected');
      }

      const milestone = await milestoneService.createMilestone(
        tenant.tenantId,
        childId,
        tenant.userId,
        {
          category,
          title,
          description,
          ageExpected: parseInt(ageExpected),
          dateAchieved: dateAchieved ? new Date(dateAchieved) : undefined,
          notes,
          photoUrls,
        }
      );

      return sendCreated(reply, { milestone }, 'Milestone created successfully');
    } catch (error: any) {
      return sendServerError(reply, error.message);
    }
  }

  /**
   * Get milestones for a child
   * GET /api/milestones/children/:childId
   */
  static async getMilestonesByChild(request: FastifyRequest, reply: FastifyReply) {
    try {
      const tenant = (request as any).tenant as TenantContext;
      const milestoneService = getMilestoneService();
      const { childId } = request.params as { childId: string };

      const milestones = await milestoneService.getMilestonesByChild(tenant.tenantId, childId);

      return sendSuccess(reply, { milestones, count: milestones.length });
    } catch (error: any) {
      return sendServerError(reply, error.message);
    }
  }

  /**
   * Get milestones by category
   * GET /api/milestones/children/:childId/category/:category
   */
  static async getMilestonesByCategory(request: FastifyRequest, reply: FastifyReply) {
    try {
      const tenant = (request as any).tenant as TenantContext;
      const milestoneService = getMilestoneService();
      const { childId, category } = request.params as { childId: string; category: MilestoneCategory };

      const milestones = await milestoneService.getMilestonesByCategory(
        tenant.tenantId,
        childId,
        category
      );

      return sendSuccess(reply, { milestones, count: milestones.length });
    } catch (error: any) {
      return sendServerError(reply, error.message);
    }
  }

  /**
   * Get milestone summary for a child
   * GET /api/milestones/children/:childId/summary
   */
  static async getMilestoneSummary(request: FastifyRequest, reply: FastifyReply) {
    try {
      const tenant = (request as any).tenant as TenantContext;
      const milestoneService = getMilestoneService();
      const { childId } = request.params as { childId: string };

      const summary = await milestoneService.getMilestoneSummary(tenant.tenantId, childId);

      return sendSuccess(reply, { summary });
    } catch (error: any) {
      return sendServerError(reply, error.message);
    }
  }

  /**
   * Update milestone
   * PUT /api/milestones/:id
   */
  static async updateMilestone(request: FastifyRequest, reply: FastifyReply) {
    try {
      const tenant = (request as any).tenant as TenantContext;
      const milestoneService = getMilestoneService();
      const { id } = request.params as { id: string };
      const updateData = request.body as any;

      const milestone = await milestoneService.updateMilestone(tenant.tenantId, id, updateData);

      return sendSuccess(reply, { milestone }, 'Milestone updated successfully');
    } catch (error: any) {
      if (error.message === 'Milestone not found') {
        return sendNotFound(reply, error.message);
      }
      return sendServerError(reply, error.message);
    }
  }

  /**
   * Mark milestone as achieved
   * POST /api/milestones/:id/achieve
   */
  static async markAsAchieved(request: FastifyRequest, reply: FastifyReply) {
    try {
      const tenant = (request as any).tenant as TenantContext;
      const milestoneService = getMilestoneService();
      const { id } = request.params as { id: string };
      const { dateAchieved, notes } = request.body as { dateAchieved: string; notes?: string };

      if (!dateAchieved) {
        return sendBadRequest(reply, 'dateAchieved is required');
      }

      const milestone = await milestoneService.markAsAchieved(
        tenant.tenantId,
        id,
        new Date(dateAchieved),
        notes
      );

      return sendSuccess(reply, { milestone }, 'Milestone marked as achieved');
    } catch (error: any) {
      if (error.message === 'Milestone not found') {
        return sendNotFound(reply, error.message);
      }
      return sendServerError(reply, error.message);
    }
  }

  /**
   * Delete milestone
   * DELETE /api/milestones/:id
   */
  static async deleteMilestone(request: FastifyRequest, reply: FastifyReply) {
    try {
      const tenant = (request as any).tenant as TenantContext;
      const milestoneService = getMilestoneService();
      const { id } = request.params as { id: string };

      await milestoneService.deleteMilestone(tenant.tenantId, id);

      return sendSuccess(reply, {}, 'Milestone deleted successfully');
    } catch (error: any) {
      if (error.message === 'Milestone not found') {
        return sendNotFound(reply, error.message);
      }
      return sendServerError(reply, error.message);
    }
  }

  /**
   * Get delayed milestones
   * GET /api/milestones/children/:childId/delayed
   */
  static async getDelayedMilestones(request: FastifyRequest, reply: FastifyReply) {
    try {
      const tenant = (request as any).tenant as TenantContext;
      const milestoneService = getMilestoneService();
      const { childId } = request.params as { childId: string };

      const milestones = await milestoneService.getDelayedMilestones(tenant.tenantId, childId);

      return sendSuccess(reply, { milestones, count: milestones.length });
    } catch (error: any) {
      return sendServerError(reply, error.message);
    }
  }
}
