import { FastifyRequest, FastifyReply } from 'fastify';
import { getTenantService } from '@services/TenantService';
import { sendSuccess, sendCreated, sendBadRequest, sendServerError, sendNotFound } from '@utils/response';

export class TenantController {
  /**
   * Register a new tenant (daycare organization)
   * POST /api/tenants/register
   *
   * This is the first step for setting up a new daycare center.
   * It creates:
   * 1. A new tenant (organization)
   * 2. An owner account with CENTER_OWNER role
   * 3. Optionally, an initial center
   */
  static async register(request: FastifyRequest, reply: FastifyReply) {
    try {
      const tenantService = getTenantService();

      const {
        organizationName,
        country,
        timezone,
        currency,
        ownerFirstName,
        ownerLastName,
        ownerEmail,
        ownerPhone,
        ownerPassword,
        centerName,
        centerAddress,
        centerPhone,
        centerEmail,
      } = request.body as any;

      // Validate required fields
      if (!organizationName || !country || !ownerFirstName || !ownerLastName || !ownerEmail || !ownerPassword) {
        return sendBadRequest(
          reply,
          'Missing required fields: organizationName, country, ownerFirstName, ownerLastName, ownerEmail, ownerPassword'
        );
      }

      // Validate password strength
      if (ownerPassword.length < 8) {
        return sendBadRequest(reply, 'Password must be at least 8 characters long');
      }

      const result = await tenantService.registerTenant({
        organizationName,
        country,
        timezone,
        currency,
        ownerFirstName,
        ownerLastName,
        ownerEmail,
        ownerPhone,
        ownerPassword,
        centerName,
        centerAddress,
        centerPhone,
        centerEmail,
      });

      return sendCreated(
        reply,
        {
          tenant: result.tenant,
          owner: result.owner,
          center: result.center,
          message: 'Organization registered successfully. You can now login with your credentials.',
        },
        'Tenant registration successful'
      );
    } catch (error: any) {
      if (error.message.includes('already exists') || error.message.includes('already registered')) {
        return sendBadRequest(reply, error.message);
      }
      return sendServerError(reply, error.message);
    }
  }

  /**
   * Get tenant details by ID
   * GET /api/tenants/:id
   */
  static async getTenantById(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = request.params as { id: string };
      const tenantService = getTenantService();

      const tenant = await tenantService.getTenantById(id);

      if (!tenant) {
        return sendNotFound(reply, 'Tenant not found');
      }

      return sendSuccess(reply, { tenant }, 'Tenant retrieved successfully');
    } catch (error: any) {
      return sendServerError(reply, error.message);
    }
  }

  /**
   * Get tenant details by slug
   * GET /api/tenants/slug/:slug
   */
  static async getTenantBySlug(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { slug } = request.params as { slug: string };
      const tenantService = getTenantService();

      const tenant = await tenantService.getTenantBySlug(slug);

      if (!tenant) {
        return sendNotFound(reply, 'Tenant not found');
      }

      return sendSuccess(reply, { tenant }, 'Tenant retrieved successfully');
    } catch (error: any) {
      return sendServerError(reply, error.message);
    }
  }
}
