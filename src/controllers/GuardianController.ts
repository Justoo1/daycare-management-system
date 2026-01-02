import { FastifyRequest, FastifyReply } from 'fastify';
import { getGuardianService } from '@services/GuardianService';
import { sendSuccess, sendError } from '@utils/response';

export class GuardianController {
  /**
   * Create guardian with user account
   * POST /api/guardians/create-with-user
   */
  static async createGuardianWithUser(request: FastifyRequest, reply: FastifyReply) {
    try {
      const tenant = (request as any).tenant;

      const {
        firstName,
        lastName,
        email,
        phoneNumber,
        relationship,
        occupation,
        company,
        workAddress,
        workPhoneNumber,
        residentialAddress,
        city,
        region,
        postalCode,
        isPrimaryGuardian,
        isAuthorizedPickup,
        priority,
        childIds,
        centerId,
        sendInvitation = true,
      } = request.body as any;

      // Validate required fields
      if (!firstName || !lastName || !email || !phoneNumber || !relationship || !childIds || childIds.length === 0) {
        return sendError(reply, 'First name, last name, email, phone number, relationship, and at least one child ID are required', 400);
      }

      if (!centerId) {
        return sendError(reply, 'Center ID is required', 400);
      }

      const guardianService = getGuardianService();

      const result = await guardianService.createGuardianWithUser(
        tenant.tenantId,
        centerId,
        {
          firstName,
          lastName,
          email,
          phoneNumber,
          relationship,
          occupation,
          company,
          workAddress,
          workPhoneNumber,
          residentialAddress,
          city,
          region,
          postalCode,
          isPrimaryGuardian,
          isAuthorizedPickup,
          priority,
          childIds,
        },
        sendInvitation
      );

      return sendSuccess(reply, {
        user: result.user,
        guardians: result.guardians,
        message: `Guardian account created successfully for ${childIds.length} child(ren)`,
      }, 201);
    } catch (error: any) {
      console.error('Error creating guardian with user:', error);
      return sendError(reply, error.message || 'Failed to create guardian with user', 500);
    }
  }

  /**
   * Get all guardians
   * GET /api/guardians
   */
  static async getAllGuardians(request: FastifyRequest, reply: FastifyReply) {
    try {
      const tenant = (request as any).tenant;
      const query = request.query as any;

      const filters = {
        centerId: query.centerId,
        childId: query.childId,
        isPrimaryGuardian: query.isPrimaryGuardian ? query.isPrimaryGuardian === 'true' : undefined,
        isActive: query.isActive ? query.isActive === 'true' : undefined,
      };

      const guardianService = getGuardianService();
      const guardians = await guardianService.getAllGuardians(tenant.tenantId, filters);

      return sendSuccess(reply, { guardians, count: guardians.length });
    } catch (error: any) {
      console.error('Error fetching guardians:', error);
      return sendError(reply, error.message || 'Failed to fetch guardians', 500);
    }
  }

  /**
   * Get guardian by ID
   * GET /api/guardians/:id
   */
  static async getGuardianById(request: FastifyRequest, reply: FastifyReply) {
    try {
      const tenant = (request as any).tenant;
      const { id } = request.params as { id: string };

      const guardianService = getGuardianService();
      const guardian = await guardianService.getGuardianById(tenant.tenantId, id);

      if (!guardian) {
        return sendError(reply, 'Guardian not found', 404);
      }

      return sendSuccess(reply, { guardian });
    } catch (error: any) {
      console.error('Error fetching guardian:', error);
      return sendError(reply, error.message || 'Failed to fetch guardian', 500);
    }
  }

  /**
   * Get guardians by user ID
   * GET /api/guardians/user/:userId
   */
  static async getGuardiansByUserId(request: FastifyRequest, reply: FastifyReply) {
    try {
      const tenant = (request as any).tenant;
      const { userId } = request.params as { userId: string };

      const guardianService = getGuardianService();
      const guardians = await guardianService.getGuardianByUserId(tenant.tenantId, userId);

      return sendSuccess(reply, { guardians, count: guardians.length });
    } catch (error: any) {
      console.error('Error fetching guardians by user:', error);
      return sendError(reply, error.message || 'Failed to fetch guardians', 500);
    }
  }

  /**
   * Get guardians by child ID
   * GET /api/guardians/children/:childId
   */
  static async getGuardiansByChild(request: FastifyRequest, reply: FastifyReply) {
    try {
      const tenant = (request as any).tenant;
      const { childId } = request.params as { childId: string };

      const guardianService = getGuardianService();
      const guardians = await guardianService.getGuardiansByChild(tenant.tenantId, childId);

      return sendSuccess(reply, { guardians, count: guardians.length });
    } catch (error: any) {
      console.error('Error fetching guardians by child:', error);
      return sendError(reply, error.message || 'Failed to fetch guardians', 500);
    }
  }

  /**
   * Update guardian
   * PUT /api/guardians/:id
   */
  static async updateGuardian(request: FastifyRequest, reply: FastifyReply) {
    try {
      const tenant = (request as any).tenant;
      const { id } = request.params as { id: string };
      const updateData = request.body as any;

      const guardianService = getGuardianService();
      const guardian = await guardianService.updateGuardian(tenant.tenantId, id, updateData);

      return sendSuccess(reply, { guardian, message: 'Guardian updated successfully' });
    } catch (error: any) {
      console.error('Error updating guardian:', error);
      return sendError(reply, error.message || 'Failed to update guardian', 500);
    }
  }

  /**
   * Link guardian to child
   * POST /api/guardians/:userId/link-child
   */
  static async linkToChild(request: FastifyRequest, reply: FastifyReply) {
    try {
      const tenant = (request as any).tenant;
      const { userId } = request.params as { userId: string };
      const { childId, ...guardianData } = request.body as any;

      if (!childId) {
        return sendError(reply, 'Child ID is required', 400);
      }

      const guardianService = getGuardianService();
      const guardian = await guardianService.linkToChild(
        tenant.tenantId,
        userId,
        childId,
        guardianData
      );

      return sendSuccess(reply, { guardian, message: 'Guardian linked to child successfully' }, 201);
    } catch (error: any) {
      console.error('Error linking guardian to child:', error);
      return sendError(reply, error.message || 'Failed to link guardian to child', 500);
    }
  }

  /**
   * Unlink guardian from child
   * DELETE /api/guardians/:id/unlink
   */
  static async unlinkFromChild(request: FastifyRequest, reply: FastifyReply) {
    try {
      const tenant = (request as any).tenant;
      const { id } = request.params as { id: string };

      const guardianService = getGuardianService();
      await guardianService.unlinkFromChild(tenant.tenantId, id);

      return sendSuccess(reply, { message: 'Guardian unlinked from child successfully' });
    } catch (error: any) {
      console.error('Error unlinking guardian from child:', error);
      return sendError(reply, error.message || 'Failed to unlink guardian from child', 500);
    }
  }

  /**
   * Delete guardian
   * DELETE /api/guardians/:id
   */
  static async deleteGuardian(request: FastifyRequest, reply: FastifyReply) {
    try {
      const tenant = (request as any).tenant;
      const { id } = request.params as { id: string };

      const guardianService = getGuardianService();
      await guardianService.deleteGuardian(tenant.tenantId, id);

      return sendSuccess(reply, { message: 'Guardian deleted successfully' });
    } catch (error: any) {
      console.error('Error deleting guardian:', error);
      return sendError(reply, error.message || 'Failed to delete guardian', 500);
    }
  }

  /**
   * Get children for parent (for parent dashboard)
   * GET /api/guardians/my-children
   */
  static async getMyChildren(request: FastifyRequest, reply: FastifyReply) {
    try {
      const tenant = (request as any).tenant;

      // User ID is stored in tenant.userId by the authenticateRoute middleware
      const userId = tenant.userId;

      const guardianService = getGuardianService();
      const children = await guardianService.getChildrenForParent(tenant.tenantId, userId);

      return sendSuccess(reply, { children, count: children.length });
    } catch (error: any) {
      console.error('Error fetching children for parent:', error);
      return sendError(reply, error.message || 'Failed to fetch children', 500);
    }
  }

  /**
   * Resend login credentials (OTP) to parent
   * POST /api/guardians/user/:userId/resend-credentials
   */
  static async resendCredentials(request: FastifyRequest, reply: FastifyReply) {
    try {
      const tenant = (request as any).tenant;
      const { userId } = request.params as { userId: string };

      const guardianService = getGuardianService();
      const result = await guardianService.resendLoginCredentials(tenant.tenantId, userId);

      return sendSuccess(reply, {
        message: `Login credentials sent successfully to ${result.phoneNumber}`,
      });
    } catch (error: any) {
      console.error('Error resending credentials:', error);
      return sendError(reply, error.message || 'Failed to resend credentials', 500);
    }
  }

  /**
   * Create user account for legacy guardian
   * POST /api/guardians/:guardianId/create-user-account
   */
  static async createUserAccountForLegacyGuardian(request: FastifyRequest, reply: FastifyReply) {
    try {
      const tenant = (request as any).tenant;
      const user = (request as any).user;
      const { guardianId } = request.params as { guardianId: string };
      const { sendInvitation = true } = request.body as any;

      const guardianService = getGuardianService();
      const result = await guardianService.createUserForLegacyGuardian(
        tenant.tenantId,
        guardianId,
        user.centerId || tenant.centerId,
        sendInvitation
      );

      return sendSuccess(reply, {
        user: result.user,
        message: `User account created successfully for guardian`,
      }, 201);
    } catch (error: any) {
      console.error('Error creating user account for legacy guardian:', error);
      return sendError(reply, error.message || 'Failed to create user account', 500);
    }
  }
}
