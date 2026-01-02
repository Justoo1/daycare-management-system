import { FastifyRequest, FastifyReply } from 'fastify';
import { getCenterService } from '@services/CenterService';
import { sendSuccess, sendCreated, sendBadRequest, sendNotFound, sendServerError } from '@utils/response';
import { TenantContext } from '@shared';

export class CenterController {
  /**
   * Create a new center
   * POST /api/centers
   */
  static async createCenter(request: FastifyRequest, reply: FastifyReply) {
    try {
      const tenant = (request as any).tenant as TenantContext;
      const centerService = getCenterService();

      const {
        name,
        address,
        city,
        region,
        phoneNumber,
        email,
        registrationNumber,
        capacity,
        operatingHoursStart,
        operatingHoursEnd,
        monthlyTuition,
        mealFee,
        activityFee,
        lateFeePerHour,
        infantStaffRatio,
        toddlerStaffRatio,
        preschoolStaffRatio,
      } = request.body as any;

      if (!name || !address || !phoneNumber || !email || !registrationNumber || !operatingHoursStart || !operatingHoursEnd) {
        return sendBadRequest(reply, 'Missing required fields: name, address, phoneNumber, email, registrationNumber, operatingHoursStart, operatingHoursEnd');
      }

      const center = await centerService.createCenter(tenant.tenantId, {
        name,
        address,
        city,
        region,
        phoneNumber,
        email,
        registrationNumber,
        capacity,
        operatingHoursStart,
        operatingHoursEnd,
        monthlyTuition,
        mealFee,
        activityFee,
        lateFeePerHour,
        infantStaffRatio,
        toddlerStaffRatio,
        preschoolStaffRatio,
      });

      return sendCreated(reply, { center }, 'Center created successfully');
    } catch (error: any) {
      return sendServerError(reply, error.message);
    }
  }

  /**
   * Get all centers
   * GET /api/centers
   */
  static async getCenters(request: FastifyRequest, reply: FastifyReply) {
    try {
      const tenant = (request as any).tenant as TenantContext;
      const centerService = getCenterService();
      const { active } = request.query as { active?: string };

      const centers = active === 'true'
        ? await centerService.getActiveCenters(tenant.tenantId)
        : await centerService.getCenters(tenant.tenantId);
      console.log('Centers fetched:', centers);
      return sendSuccess(reply, { centers, count: centers.length });
    } catch (error: any) {
      return sendServerError(reply, error.message);
    }
  }

  /**
   * Get center by ID
   * GET /api/centers/:id
   */
  static async getCenterById(request: FastifyRequest, reply: FastifyReply) {
    try {
      const tenant = (request as any).tenant as TenantContext;
      const centerService = getCenterService();
      const { id } = request.params as { id: string };

      const center = await centerService.getCenterById(tenant.tenantId, id);

      if (!center) {
        return sendNotFound(reply, 'Center not found');
      }

      return sendSuccess(reply, { center });
    } catch (error: any) {
      return sendServerError(reply, error.message);
    }
  }

  /**
   * Update center
   * PUT /api/centers/:id
   */
  static async updateCenter(request: FastifyRequest, reply: FastifyReply) {
    try {
      const tenant = (request as any).tenant as TenantContext;
      const centerService = getCenterService();
      const { id } = request.params as { id: string };
      const updateData = request.body as any;

      const center = await centerService.updateCenter(tenant.tenantId, id, updateData);

      return sendSuccess(reply, { center }, 'Center updated successfully');
    } catch (error: any) {
      if (error.message === 'Center not found') {
        return sendNotFound(reply, error.message);
      }
      return sendServerError(reply, error.message);
    }
  }

  /**
   * Deactivate center
   * POST /api/centers/:id/deactivate
   */
  static async deactivateCenter(request: FastifyRequest, reply: FastifyReply) {
    try {
      const tenant = (request as any).tenant as TenantContext;
      const centerService = getCenterService();
      const { id } = request.params as { id: string };

      await centerService.deactivateCenter(tenant.tenantId, id);

      return sendSuccess(reply, {}, 'Center deactivated successfully');
    } catch (error: any) {
      if (error.message === 'Center not found') {
        return sendNotFound(reply, error.message);
      }
      return sendServerError(reply, error.message);
    }
  }

  /**
   * Activate center
   * POST /api/centers/:id/activate
   */
  static async activateCenter(request: FastifyRequest, reply: FastifyReply) {
    try {
      const tenant = (request as any).tenant as TenantContext;
      const centerService = getCenterService();
      const { id } = request.params as { id: string };

      await centerService.activateCenter(tenant.tenantId, id);

      return sendSuccess(reply, {}, 'Center activated successfully');
    } catch (error: any) {
      if (error.message === 'Center not found') {
        return sendNotFound(reply, error.message);
      }
      return sendServerError(reply, error.message);
    }
  }

  /**
   * Delete center
   * DELETE /api/centers/:id
   */
  static async deleteCenter(request: FastifyRequest, reply: FastifyReply) {
    try {
      const tenant = (request as any).tenant as TenantContext;
      const centerService = getCenterService();
      const { id } = request.params as { id: string };

      await centerService.deleteCenter(tenant.tenantId, id);

      return sendSuccess(reply, {}, 'Center deleted successfully');
    } catch (error: any) {
      if (error.message === 'Center not found') {
        return sendNotFound(reply, error.message);
      }
      return sendServerError(reply, error.message);
    }
  }

  /**
   * Get center statistics
   * GET /api/centers/:id/stats
   */
  static async getCenterStats(request: FastifyRequest, reply: FastifyReply) {
    try {
      const tenant = (request as any).tenant as TenantContext;
      const centerService = getCenterService();
      const { id } = request.params as { id: string };

      const stats = await centerService.getCenterStats(tenant.tenantId, id);

      return sendSuccess(reply, { stats });
    } catch (error: any) {
      if (error.message === 'Center not found') {
        return sendNotFound(reply, error.message);
      }
      return sendServerError(reply, error.message);
    }
  }
}
