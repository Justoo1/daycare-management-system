import { FastifyRequest, FastifyReply } from 'fastify';
import { getClassService } from '@services/ClassService';
import { getChildService } from '@services/ChildService';
import { sendSuccess, sendCreated, sendBadRequest, sendNotFound, sendServerError } from '@utils/response';
import { TenantContext } from '@shared';

export class ClassController {
  /**
   * Create a new class
   * POST /api/classes
   */
  static async createClass(request: FastifyRequest, reply: FastifyReply) {
    try {
      const tenant = (request as any).tenant as TenantContext;
      const classService = getClassService();

      const {
        centerId,
        name,
        ageGroupMin,
        ageGroupMax,
        capacity,
        room,
        schedule,
      } = request.body as any;

      if (!centerId || !name || ageGroupMin === undefined || ageGroupMax === undefined || !capacity) {
        return sendBadRequest(reply, 'Missing required fields: centerId, name, ageGroupMin, ageGroupMax, capacity');
      }

      const classEntity = await classService.createClass(tenant.tenantId, centerId, {
        name,
        ageGroupMin: parseInt(ageGroupMin),
        ageGroupMax: parseInt(ageGroupMax),
        capacity: parseInt(capacity),
        room,
        schedule,
      });

      return sendCreated(reply, { class: classEntity }, 'Class created successfully');
    } catch (error: any) {
      return sendServerError(reply, error.message);
    }
  }

  /**
   * Get all classes for a center
   * GET /api/classes
   */
  static async getClasses(request: FastifyRequest, reply: FastifyReply) {
    try {
      const tenant = (request as any).tenant as TenantContext;
      const classService = getClassService();
      const { centerId, active } = request.query as { centerId?: string; active?: string };

      let classes;
      if (centerId) {
        // Get classes for specific center
        classes = active === 'true'
          ? await classService.getActiveClasses(tenant.tenantId, centerId)
          : await classService.getClasses(tenant.tenantId, centerId);
      } else {
        // Get all classes for all centers in this tenant
        classes = active === 'true'
          ? await classService.getAllActiveClasses(tenant.tenantId)
          : await classService.getAllClasses(tenant.tenantId);
      }

      return sendSuccess(reply, { classes, count: classes.length });
    } catch (error: any) {
      return sendServerError(reply, error.message);
    }
  }

  /**
   * Get class by ID
   * GET /api/classes/:id
   */
  static async getClassById(request: FastifyRequest, reply: FastifyReply) {
    try {
      const tenant = (request as any).tenant as TenantContext;
      const classService = getClassService();
      const { id } = request.params as { id: string };

      const classEntity = await classService.getClassById(tenant.tenantId, id);

      if (!classEntity) {
        return sendNotFound(reply, 'Class not found');
      }

      return sendSuccess(reply, { class: classEntity });
    } catch (error: any) {
      return sendServerError(reply, error.message);
    }
  }

  /**
   * Update class
   * PUT /api/classes/:id
   */
  static async updateClass(request: FastifyRequest, reply: FastifyReply) {
    try {
      const tenant = (request as any).tenant as TenantContext;
      const classService = getClassService();
      const { id } = request.params as { id: string };
      const updateData = request.body as any;

      const classEntity = await classService.updateClass(tenant.tenantId, id, updateData);

      return sendSuccess(reply, { class: classEntity }, 'Class updated successfully');
    } catch (error: any) {
      if (error.message === 'Class not found') {
        return sendNotFound(reply, error.message);
      }
      return sendServerError(reply, error.message);
    }
  }

  /**
   * Deactivate class
   * POST /api/classes/:id/deactivate
   */
  static async deactivateClass(request: FastifyRequest, reply: FastifyReply) {
    try {
      const tenant = (request as any).tenant as TenantContext;
      const classService = getClassService();
      const { id } = request.params as { id: string };

      await classService.deactivateClass(tenant.tenantId, id);

      return sendSuccess(reply, {}, 'Class deactivated successfully');
    } catch (error: any) {
      if (error.message === 'Class not found') {
        return sendNotFound(reply, error.message);
      }
      return sendServerError(reply, error.message);
    }
  }

  /**
   * Activate class
   * POST /api/classes/:id/activate
   */
  static async activateClass(request: FastifyRequest, reply: FastifyReply) {
    try {
      const tenant = (request as any).tenant as TenantContext;
      const classService = getClassService();
      const { id } = request.params as { id: string };

      await classService.activateClass(tenant.tenantId, id);

      return sendSuccess(reply, {}, 'Class activated successfully');
    } catch (error: any) {
      if (error.message === 'Class not found') {
        return sendNotFound(reply, error.message);
      }
      return sendServerError(reply, error.message);
    }
  }

  /**
   * Delete class
   * DELETE /api/classes/:id
   */
  static async deleteClass(request: FastifyRequest, reply: FastifyReply) {
    try {
      const tenant = (request as any).tenant as TenantContext;
      const classService = getClassService();
      const { id } = request.params as { id: string };

      await classService.deleteClass(tenant.tenantId, id);

      return sendSuccess(reply, {}, 'Class deleted successfully');
    } catch (error: any) {
      if (error.message === 'Class not found') {
        return sendNotFound(reply, error.message);
      }
      return sendServerError(reply, error.message);
    }
  }

  /**
   * Add teacher to class
   * POST /api/classes/:id/teachers
   */
  static async addTeacher(request: FastifyRequest, reply: FastifyReply) {
    try {
      const tenant = (request as any).tenant as TenantContext;
      const classService = getClassService();
      const { id } = request.params as { id: string };
      const { teacherId } = request.body as { teacherId: string };

      if (!teacherId) {
        return sendBadRequest(reply, 'Teacher ID is required');
      }

      const classEntity = await classService.addTeacher(tenant.tenantId, id, teacherId);

      return sendSuccess(reply, { class: classEntity }, 'Teacher added to class successfully');
    } catch (error: any) {
      if (error.message === 'Class not found') {
        return sendNotFound(reply, error.message);
      }
      return sendServerError(reply, error.message);
    }
  }

  /**
   * Remove teacher from class
   * DELETE /api/classes/:id/teachers/:teacherId
   */
  static async removeTeacher(request: FastifyRequest, reply: FastifyReply) {
    try {
      const tenant = (request as any).tenant as TenantContext;
      const classService = getClassService();
      const { id, teacherId } = request.params as { id: string; teacherId: string };

      const classEntity = await classService.removeTeacher(tenant.tenantId, id, teacherId);

      return sendSuccess(reply, { class: classEntity }, 'Teacher removed from class successfully');
    } catch (error: any) {
      if (error.message === 'Class not found') {
        return sendNotFound(reply, error.message);
      }
      return sendServerError(reply, error.message);
    }
  }

  /**
   * Get class capacity info
   * GET /api/classes/:id/capacity
   */
  static async getCapacityInfo(request: FastifyRequest, reply: FastifyReply) {
    try {
      const tenant = (request as any).tenant as TenantContext;
      const classService = getClassService();
      const { id } = request.params as { id: string };

      const capacityInfo = await classService.getCapacityInfo(tenant.tenantId, id);

      return sendSuccess(reply, { capacityInfo });
    } catch (error: any) {
      if (error.message === 'Class not found') {
        return sendNotFound(reply, error.message);
      }
      return sendServerError(reply, error.message);
    }
  }

  /**
   * Get children in a class
   * GET /api/classes/:id/children
   */
  static async getClassChildren(request: FastifyRequest, reply: FastifyReply) {
    try {
      const tenant = (request as any).tenant as TenantContext;
      const childService = getChildService();
      const { id } = request.params as { id: string };

      const children = await childService.getChildrenByClass(tenant.tenantId, id);

      console.log(`[getClassChildren] Found ${children.length} children for class ${id}`);

      return sendSuccess(reply, { children });
    } catch (error: any) {
      console.error('[getClassChildren] Error:', error);
      return sendServerError(reply, error.message);
    }
  }
}
