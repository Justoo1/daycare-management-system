import { FastifyRequest, FastifyReply } from 'fastify';
import { getChildService } from '@services/ChildService';
import { sendSuccess, sendCreated, sendBadRequest, sendNotFound, sendServerError, sendPaginatedSuccess } from '@utils/response';
import { TenantContext } from '@shared';

export class ChildController {
  /**
   * Create a new child
   * POST /api/children
   */
  static async createChild(request: FastifyRequest, reply: FastifyReply) {
    try {
      const tenant = (request as any).tenant as TenantContext;
      const childService = getChildService();

      const {
        centerId,
        classId,
        firstName,
        lastName,
        dateOfBirth,
        gender,
        bloodType,
        allergies,
        medicalConditions,
        dietaryRestrictions,
        emergencyContactName,
        emergencyContactPhone,
        emergencyContactRelationship,
        specialNeeds,
      } = request.body as any;

      if (!centerId || !firstName || !lastName || !dateOfBirth || !gender) {
        return sendBadRequest(reply, 'Missing required fields: centerId, firstName, lastName, dateOfBirth, gender');
      }

      const child = await childService.createChild(tenant.tenantId, centerId, {
        firstName,
        lastName,
        dateOfBirth: new Date(dateOfBirth),
        gender,
        bloodType,
        allergies,
        medicalConditions,
        dietaryRestrictions,
        emergencyContactName,
        emergencyContactPhone,
        emergencyContactRelationship,
        specialNeeds,
        classId,
      });

      return sendCreated(reply, { child }, 'Child created successfully');
    } catch (error: any) {
      return sendServerError(reply, error.message);
    }
  }

  /**
   * Get child by ID
   * GET /api/children/:id
   */
  static async getChild(request: FastifyRequest, reply: FastifyReply) {
    try {
      const tenant = (request as any).tenant as TenantContext;
      const childService = getChildService();

      const { id } = request.params as { id: string };

      console.log('Getting child with ID:', id, 'for tenant:', tenant.tenantId);

      const child = await childService.getChildById(tenant.tenantId, id);

      console.log('Child found:', child);

      if (!child) {
        return sendNotFound(reply, 'Child not found');
      }

      return sendSuccess(reply, { child });
    } catch (error: any) {
      console.error('Error getting child:', error);
      return sendServerError(reply, error.message);
    }
  }

  /**
   * Get all children for center
   * GET /api/children?page=1&limit=20&centerId=uuid
   */
  static async listChildren(request: FastifyRequest, reply: FastifyReply) {
    try {
      const tenant = (request as any).tenant as TenantContext;
      const childService = getChildService();

      const { page = 1, limit = 20, centerId, classId } = request.query as {
        page?: number;
        limit?: number;
        centerId?: string;
        classId?: string;
      };

      const skip = (Number(page) - 1) * Number(limit);

      // Filter by staff's classId if user is staff/teacher
      const isManager = ['super_admin', 'center_owner', 'director'].includes(tenant.role);

      // For non-managers: use their centerId from token if not provided in query
      // For managers: use query param (optional)
      const effectiveCenterId = centerId || (!isManager ? tenant.centerId : undefined);

      console.log('[Children Debug] listChildren called:', {
        role: tenant.role,
        isManager,
        tenantCenterId: tenant.centerId,
        tenantClassId: tenant.classId,
        queryCenterId: centerId,
        effectiveCenterId,
        queryClassId: classId,
      });

      // For non-managers: centerId is required (from query or token)
      // For managers: centerId is optional (if not provided, fetch all children in tenant)
      if (!isManager && !effectiveCenterId) {
        return sendBadRequest(reply, 'centerId is required. Please ensure you are assigned to a center.');
      }

      // For non-managers: use their assigned classId (if they have one), otherwise use a non-existent ID to return empty results
      // For managers: use the query parameter classId (optional filtering)
      const filterClassId = !isManager
        ? (tenant.classId || 'no-class-assigned') // Staff without class sees nothing
        : classId; // Managers can optionally filter by class

      console.log('[Children Debug] Filter classId:', filterClassId);

      const [children, total] = effectiveCenterId
        ? await childService.getChildrenByCenter(
            tenant.tenantId,
            effectiveCenterId,
            { skip, take: Number(limit) },
            filterClassId
          )
        : await childService.getAllChildrenInTenant(
            tenant.tenantId,
            { skip, take: Number(limit) },
            filterClassId
          );

      console.log('Children fetched:', { count: children.length, total, centerId, classId: filterClassId });

      return sendPaginatedSuccess(
        reply,
        children,
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
   * Update child information
   * PUT /api/children/:id
   */
  static async updateChild(request: FastifyRequest, reply: FastifyReply) {
    try {
      const tenant = (request as any).tenant as TenantContext;
      const childService = getChildService();

      const { id } = request.params as { id: string };
      const updateData = request.body as any;

      const child = await childService.updateChild(tenant.tenantId, id, updateData);

      return sendSuccess(reply, { child }, 'Child updated successfully');
    } catch (error: any) {
      if (error.message.includes('not found')) {
        return sendNotFound(reply, error.message);
      }
      return sendServerError(reply, error.message);
    }
  }

  /**
   * Add guardian to child
   * POST /api/children/:childId/guardians
   */
  static async addGuardian(request: FastifyRequest, reply: FastifyReply) {
    try {
      const tenant = (request as any).tenant as TenantContext;
      const childService = getChildService();

      const { childId } = request.params as { childId: string };
      const {
        centerId,
        firstName,
        lastName,
        email,
        phoneNumber,
        relationship,
        ...otherFields
      } = request.body as any;

      if (!centerId || !firstName || !lastName || !email || !phoneNumber || !relationship) {
        return sendBadRequest(reply, 'Missing required fields: centerId, firstName, lastName, email, phoneNumber, relationship');
      }

      const guardian = await childService.addGuardian(
        tenant.tenantId,
        centerId,
        childId,
        {
          firstName,
          lastName,
          email,
          phoneNumber,
          relationship,
          ...otherFields,
        }
      );

      return sendCreated(reply, { guardian }, 'Guardian added successfully');
    } catch (error: any) {
      if (error.message.includes('not found')) {
        return sendNotFound(reply, error.message);
      }
      return sendServerError(reply, error.message);
    }
  }

  /**
   * Get child's guardians
   * GET /api/children/:childId/guardians
   */
  static async getGuardians(request: FastifyRequest, reply: FastifyReply) {
    try {
      const tenant = (request as any).tenant as TenantContext;
      const childService = getChildService();

      const { childId } = request.params as { childId: string };

      const guardians = await childService.getGuardians(tenant.tenantId, childId);

      return sendSuccess(reply, { guardians });
    } catch (error: any) {
      return sendServerError(reply, error.message);
    }
  }

  /**
   * Update guardian information
   * PUT /api/guardians/:id
   */
  static async updateGuardian(request: FastifyRequest, reply: FastifyReply) {
    try {
      const tenant = (request as any).tenant as TenantContext;
      const childService = getChildService();

      const { id } = request.params as { id: string };
      const updateData = request.body as any;

      const guardian = await childService.updateGuardian(tenant.tenantId, id, updateData);

      return sendSuccess(reply, { guardian }, 'Guardian updated successfully');
    } catch (error: any) {
      if (error.message.includes('not found')) {
        return sendNotFound(reply, error.message);
      }
      return sendServerError(reply, error.message);
    }
  }

  /**
   * Enroll child to class
   * POST /api/children/:childId/enroll
   */
  static async enrollChild(request: FastifyRequest, reply: FastifyReply) {
    try {
      const tenant = (request as any).tenant as TenantContext;
      const childService = getChildService();

      const { childId } = request.params as { childId: string };
      const { classId } = request.body as any;

      if (!classId) {
        return sendBadRequest(reply, 'Class ID is required');
      }

      const child = await childService.enrollChild(tenant.tenantId, childId, classId);

      return sendSuccess(reply, { child }, 'Child enrolled successfully');
    } catch (error: any) {
      if (error.message.includes('not found')) {
        return sendNotFound(reply, error.message);
      }
      return sendServerError(reply, error.message);
    }
  }

  /**
   * Withdraw child from center
   * POST /api/children/:childId/withdraw
   */
  static async withdrawChild(request: FastifyRequest, reply: FastifyReply) {
    try {
      const tenant = (request as any).tenant as TenantContext;
      const childService = getChildService();

      const { childId } = request.params as { childId: string };
      const { reason } = request.body as any;

      if (!reason) {
        return sendBadRequest(reply, 'Withdrawal reason is required');
      }

      const child = await childService.withdrawChild(tenant.tenantId, childId, reason);

      return sendSuccess(reply, { child }, 'Child withdrawn successfully');
    } catch (error: any) {
      if (error.message.includes('not found')) {
        return sendNotFound(reply, error.message);
      }
      return sendServerError(reply, error.message);
    }
  }

  /**
   * Search children by name
   * GET /api/children/search?q=name&centerId=uuid
   */
  static async searchChildren(request: FastifyRequest, reply: FastifyReply) {
    try {
      const tenant = (request as any).tenant as TenantContext;
      const childService = getChildService();

      const { q, centerId } = request.query as { q: string; centerId?: string };

      if (!q || q.length < 2) {
        return sendBadRequest(reply, 'Search query must be at least 2 characters');
      }

      if (!centerId) {
        return sendBadRequest(reply, 'centerId query parameter is required');
      }

      // Filter by staff's classId if user is staff/teacher
      const isManager = ['super_admin', 'center_owner', 'director'].includes(tenant.role);

      // For non-managers: use their assigned classId (if they have one), otherwise use a non-existent ID
      // For managers: no filter (undefined means search all)
      const filterClassId = !isManager
        ? (tenant.classId || 'no-class-assigned') // Staff without class sees nothing
        : undefined; // Managers search all

      const children = await childService.searchChildren(tenant.tenantId, centerId, q, filterClassId);

      return sendSuccess(reply, { children });
    } catch (error: any) {
      return sendServerError(reply, error.message);
    }
  }

  /**
   * Add child to waitlist
   * POST /api/children/:childId/waitlist
   */
  static async addToWaitlist(request: FastifyRequest, reply: FastifyReply) {
    try {
      const tenant = (request as any).tenant as TenantContext;
      const childService = getChildService();

      const { childId } = request.params as { childId: string };
      const { classId } = request.body as { classId?: string };

      const child = await childService.addToWaitlist(tenant.tenantId, childId, classId);

      return sendSuccess(reply, { child }, 'Child added to waitlist successfully');
    } catch (error: any) {
      if (error.message.includes('not found')) {
        return sendNotFound(reply, error.message);
      }
      return sendServerError(reply, error.message);
    }
  }

  /**
   * Approve enrollment application
   * POST /api/children/:childId/approve
   */
  static async approveApplication(request: FastifyRequest, reply: FastifyReply) {
    try {
      const tenant = (request as any).tenant as TenantContext;
      const childService = getChildService();

      const { childId } = request.params as { childId: string };

      const child = await childService.approveApplication(tenant.tenantId, childId, tenant.userId);

      return sendSuccess(reply, { child }, 'Application approved successfully');
    } catch (error: any) {
      if (error.message.includes('not found')) {
        return sendNotFound(reply, error.message);
      }
      return sendServerError(reply, error.message);
    }
  }

  /**
   * Reject enrollment application
   * POST /api/children/:childId/reject
   */
  static async rejectApplication(request: FastifyRequest, reply: FastifyReply) {
    try {
      const tenant = (request as any).tenant as TenantContext;
      const childService = getChildService();

      const { childId } = request.params as { childId: string };
      const { reason } = request.body as { reason: string };

      if (!reason) {
        return sendBadRequest(reply, 'Rejection reason is required');
      }

      const child = await childService.rejectApplication(tenant.tenantId, childId, reason);

      return sendSuccess(reply, { child }, 'Application rejected successfully');
    } catch (error: any) {
      if (error.message.includes('not found')) {
        return sendNotFound(reply, error.message);
      }
      return sendServerError(reply, error.message);
    }
  }

  /**
   * Promote child from waitlist to enrolled
   * POST /api/children/:childId/promote
   */
  static async promoteFromWaitlist(request: FastifyRequest, reply: FastifyReply) {
    try {
      const tenant = (request as any).tenant as TenantContext;
      const childService = getChildService();

      const { childId } = request.params as { childId: string };
      const { classId } = request.body as { classId: string };

      if (!classId) {
        return sendBadRequest(reply, 'Class ID is required');
      }

      const child = await childService.promoteFromWaitlist(tenant.tenantId, childId, classId);

      return sendSuccess(reply, { child }, 'Child promoted from waitlist successfully');
    } catch (error: any) {
      if (error.message.includes('not found')) {
        return sendNotFound(reply, error.message);
      }
      return sendServerError(reply, error.message);
    }
  }

  /**
   * Get waitlist for center
   * GET /api/children/waitlist?centerId=uuid
   */
  static async getWaitlist(request: FastifyRequest, reply: FastifyReply) {
    try {
      const tenant = (request as any).tenant as TenantContext;
      const childService = getChildService();

      const { centerId } = request.query as { centerId?: string };

      if (!centerId) {
        return sendBadRequest(reply, 'centerId query parameter is required');
      }

      const children = await childService.getWaitlist(tenant.tenantId, centerId);

      return sendSuccess(reply, { children, count: children.length });
    } catch (error: any) {
      return sendServerError(reply, error.message);
    }
  }

  /**
   * Get pending applications for center
   * GET /api/children/pending?centerId=uuid
   */
  static async getPendingApplications(request: FastifyRequest, reply: FastifyReply) {
    try {
      const tenant = (request as any).tenant as TenantContext;
      const childService = getChildService();

      const { centerId } = request.query as { centerId?: string };

      if (!centerId) {
        return sendBadRequest(reply, 'centerId query parameter is required');
      }

      const children = await childService.getPendingApplications(tenant.tenantId, centerId);

      return sendSuccess(reply, { children, count: children.length });
    } catch (error: any) {
      return sendServerError(reply, error.message);
    }
  }

  /**
   * Bulk approve applications
   * POST /api/children/bulk-approve
   */
  static async bulkApproveApplications(request: FastifyRequest, reply: FastifyReply) {
    try {
      const tenant = (request as any).tenant as TenantContext;
      const childService = getChildService();

      const { childIds } = request.body as { childIds: string[] };

      if (!childIds || !Array.isArray(childIds) || childIds.length === 0) {
        return sendBadRequest(reply, 'Child IDs array is required');
      }

      const children = await childService.bulkApproveApplications(tenant.tenantId, childIds, tenant.userId);

      return sendSuccess(reply, { children, count: children.length }, 'Applications approved successfully');
    } catch (error: any) {
      return sendServerError(reply, error.message);
    }
  }

  /**
   * Bulk enroll children
   * POST /api/children/bulk-enroll
   */
  static async bulkEnrollChildren(request: FastifyRequest, reply: FastifyReply) {
    try {
      const tenant = (request as any).tenant as TenantContext;
      const childService = getChildService();

      const { enrollments } = request.body as {
        enrollments: Array<{ childId: string; classId: string }>;
      };

      if (!enrollments || !Array.isArray(enrollments) || enrollments.length === 0) {
        return sendBadRequest(reply, 'Enrollments array is required');
      }

      const children = await childService.bulkEnrollChildren(tenant.tenantId, enrollments);

      return sendSuccess(reply, { children, count: children.length }, 'Children enrolled successfully');
    } catch (error: any) {
      return sendServerError(reply, error.message);
    }
  }

  /**
   * Get enrollment statistics for center
   * GET /api/children/enrollment-stats?centerId=uuid
   */
  static async getEnrollmentStats(request: FastifyRequest, reply: FastifyReply) {
    try {
      const tenant = (request as any).tenant as TenantContext;
      const childService = getChildService();

      const { centerId } = request.query as { centerId?: string };

      if (!centerId) {
        return sendBadRequest(reply, 'centerId query parameter is required');
      }

      const stats = await childService.getEnrollmentStats(tenant.tenantId, centerId);

      return sendSuccess(reply, { stats });
    } catch (error: any) {
      return sendServerError(reply, error.message);
    }
  }

  /**
   * Generate QR code for child
   * POST /api/children/:childId/generate-qr
   */
  static async generateQRCode(request: FastifyRequest, reply: FastifyReply) {
    try {
      const tenant = (request as any).tenant as TenantContext;
      const childService = getChildService();

      const { childId } = request.params as { childId: string };

      const child = await childService.generateQRCode(tenant.tenantId, childId);

      return sendSuccess(reply, { child, qrCode: child.qrCode }, 'QR code generated successfully');
    } catch (error: any) {
      if (error.message.includes('not found')) {
        return sendNotFound(reply, error.message);
      }
      return sendServerError(reply, error.message);
    }
  }

  /**
   * Set child active status
   * PUT /api/children/:childId/active-status
   */
  static async setActiveStatus(request: FastifyRequest, reply: FastifyReply) {
    try {
      const tenant = (request as any).tenant as TenantContext;
      const childService = getChildService();

      const { childId } = request.params as { childId: string };
      const { isActive } = request.body as { isActive: boolean };

      if (typeof isActive !== 'boolean') {
        return sendBadRequest(reply, 'isActive must be a boolean');
      }

      const child = await childService.setChildActiveStatus(tenant.tenantId, childId, isActive);

      return sendSuccess(reply, { child }, `Child ${isActive ? 'activated' : 'deactivated'} successfully`);
    } catch (error: any) {
      if (error.message.includes('not found')) {
        return sendNotFound(reply, error.message);
      }
      return sendServerError(reply, error.message);
    }
  }

  /**
   * Bulk set active status for multiple children
   * PUT /api/children/bulk-active-status
   */
  static async bulkSetActiveStatus(request: FastifyRequest, reply: FastifyReply) {
    try {
      const tenant = (request as any).tenant as TenantContext;
      const childService = getChildService();

      const { childIds, isActive } = request.body as { childIds: string[]; isActive: boolean };

      if (!childIds || !Array.isArray(childIds) || childIds.length === 0) {
        return sendBadRequest(reply, 'childIds must be a non-empty array');
      }

      if (typeof isActive !== 'boolean') {
        return sendBadRequest(reply, 'isActive must be a boolean');
      }

      const result = await childService.bulkSetActiveStatus(tenant.tenantId, childIds, isActive);

      return sendSuccess(
        reply,
        result,
        `${result.updated} children ${isActive ? 'activated' : 'deactivated'} successfully`
      );
    } catch (error: any) {
      return sendServerError(reply, error.message);
    }
  }

  /**
   * Delete a child (soft delete)
   * DELETE /api/children/:id
   */
  static async deleteChild(request: FastifyRequest, reply: FastifyReply) {
    try {
      const tenant = (request as any).tenant as TenantContext;
      const childService = getChildService();
      const { id } = request.params as { id: string };

      await childService.deleteChild(tenant.tenantId, id);

      return sendSuccess(reply, null, 'Child deleted successfully');
    } catch (error: any) {
      if (error.message.includes('not found')) {
        return sendNotFound(reply, error.message);
      }
      return sendServerError(reply, error.message);
    }
  }

  /**
   * Promote child to a new class
   * POST /api/children/:childId/promote-to-class
   */
  static async promoteToClass(request: FastifyRequest, reply: FastifyReply) {
    try {
      const tenant = (request as any).tenant as TenantContext;
      const childService = getChildService();

      const { childId } = request.params as { childId: string };
      const { newClassId, reason, notes } = request.body as {
        newClassId: string;
        reason?: string;
        notes?: string;
      };

      if (!newClassId) {
        return sendBadRequest(reply, 'New class ID is required');
      }

      const result = await childService.promoteChild(
        tenant.tenantId,
        childId,
        newClassId,
        tenant.userId,
        reason as any,
        notes
      );

      return sendSuccess(reply, result, 'Child promoted successfully');
    } catch (error: any) {
      if (error.message.includes('not found')) {
        return sendNotFound(reply, error.message);
      }
      return sendServerError(reply, error.message);
    }
  }

  /**
   * Get eligible classes for child promotion
   * GET /api/children/:childId/eligible-classes
   */
  static async getEligibleClasses(request: FastifyRequest, reply: FastifyReply) {
    try {
      const tenant = (request as any).tenant as TenantContext;
      const childService = getChildService();

      const { childId } = request.params as { childId: string };

      const classes = await childService.getEligibleClassesForPromotion(
        tenant.tenantId,
        childId
      );

      return sendSuccess(reply, { classes });
    } catch (error: any) {
      if (error.message.includes('not found')) {
        return sendNotFound(reply, error.message);
      }
      return sendServerError(reply, error.message);
    }
  }

  /**
   * Get child's class history
   * GET /api/children/:childId/class-history
   */
  static async getClassHistory(request: FastifyRequest, reply: FastifyReply) {
    try {
      const tenant = (request as any).tenant as TenantContext;
      const childService = getChildService();

      const { childId } = request.params as { childId: string };

      const history = await childService.getChildClassHistory(
        tenant.tenantId,
        childId
      );

      return sendSuccess(reply, { history });
    } catch (error: any) {
      if (error.message.includes('not found')) {
        return sendNotFound(reply, error.message);
      }
      return sendServerError(reply, error.message);
    }
  }

  /**
   * Get child's full history (classes, attendance, activities, milestones)
   * GET /api/children/:childId/full-history
   */
  static async getFullHistory(request: FastifyRequest, reply: FastifyReply) {
    try {
      const tenant = (request as any).tenant as TenantContext;
      const childService = getChildService();

      const { childId } = request.params as { childId: string };

      const history = await childService.getChildFullHistory(
        tenant.tenantId,
        childId
      );

      return sendSuccess(reply, history);
    } catch (error: any) {
      if (error.message.includes('not found')) {
        return sendNotFound(reply, error.message);
      }
      return sendServerError(reply, error.message);
    }
  }
}
