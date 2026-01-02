import { FastifyRequest, FastifyReply } from 'fastify';
import { getCertificationService } from '@services/CertificationService';
import { sendSuccess, sendCreated, sendBadRequest, sendNotFound, sendServerError } from '@utils/response';
import { TenantContext, CertificationStatus } from '@shared';

export class CertificationController {
  /**
   * Create a new certification
   * POST /api/certifications
   */
  static async createCertification(request: FastifyRequest, reply: FastifyReply) {
    try {
      const tenant = (request as any).tenant as TenantContext;
      const certificationService = getCertificationService();

      const {
        staffId,
        certificationType,
        certificateNumber,
        issuingOrganization,
        issueDate,
        expiryDate,
        documentUrl,
        notes,
      } = request.body as any;

      if (!staffId || !certificationType || !issuingOrganization || !issueDate) {
        return sendBadRequest(
          reply,
          'Missing required fields: staffId, certificationType, issuingOrganization, issueDate'
        );
      }

      const certification = await certificationService.createCertification(tenant.tenantId, staffId, {
        certificationType,
        certificateNumber,
        issuingOrganization,
        issueDate: new Date(issueDate),
        expiryDate: expiryDate ? new Date(expiryDate) : undefined,
        documentUrl,
        notes,
      });

      return sendCreated(reply, { certification }, 'Certification created successfully');
    } catch (error: any) {
      return sendServerError(reply, error.message);
    }
  }

  /**
   * Get certifications for a staff member
   * GET /api/certifications/staff/:staffId
   */
  static async getCertificationsByStaff(request: FastifyRequest, reply: FastifyReply) {
    try {
      const tenant = (request as any).tenant as TenantContext;
      const certificationService = getCertificationService();
      const { staffId } = request.params as { staffId: string };

      const certifications = await certificationService.getCertificationsByStaff(tenant.tenantId, staffId);

      return sendSuccess(reply, { certifications, count: certifications.length });
    } catch (error: any) {
      return sendServerError(reply, error.message);
    }
  }

  /**
   * Get certification by ID
   * GET /api/certifications/:id
   */
  static async getCertificationById(request: FastifyRequest, reply: FastifyReply) {
    try {
      const tenant = (request as any).tenant as TenantContext;
      const certificationService = getCertificationService();
      const { id } = request.params as { id: string };

      const certification = await certificationService.getCertificationById(tenant.tenantId, id);

      if (!certification) {
        return sendNotFound(reply, 'Certification not found');
      }

      return sendSuccess(reply, { certification });
    } catch (error: any) {
      return sendServerError(reply, error.message);
    }
  }

  /**
   * Get certifications by type
   * GET /api/certifications/type/:type
   */
  static async getCertificationsByType(request: FastifyRequest, reply: FastifyReply) {
    try {
      const tenant = (request as any).tenant as TenantContext;
      const certificationService = getCertificationService();
      const { type } = request.params as { type: string };

      const certifications = await certificationService.getCertificationsByType(tenant.tenantId, type);

      return sendSuccess(reply, { certifications, count: certifications.length });
    } catch (error: any) {
      return sendServerError(reply, error.message);
    }
  }

  /**
   * Get certifications by status
   * GET /api/certifications/status/:status
   */
  static async getCertificationsByStatus(request: FastifyRequest, reply: FastifyReply) {
    try {
      const tenant = (request as any).tenant as TenantContext;
      const certificationService = getCertificationService();
      const { status } = request.params as { status: CertificationStatus };

      const certifications = await certificationService.getCertificationsByStatus(tenant.tenantId, status);

      return sendSuccess(reply, { certifications, count: certifications.length });
    } catch (error: any) {
      return sendServerError(reply, error.message);
    }
  }

  /**
   * Update certification
   * PUT /api/certifications/:id
   */
  static async updateCertification(request: FastifyRequest, reply: FastifyReply) {
    try {
      const tenant = (request as any).tenant as TenantContext;
      const certificationService = getCertificationService();
      const { id } = request.params as { id: string };
      const updateData = request.body as any;

      const certification = await certificationService.updateCertification(tenant.tenantId, id, updateData);

      return sendSuccess(reply, { certification }, 'Certification updated successfully');
    } catch (error: any) {
      if (error.message === 'Certification not found') {
        return sendNotFound(reply, error.message);
      }
      return sendServerError(reply, error.message);
    }
  }

  /**
   * Renew certification
   * POST /api/certifications/:id/renew
   */
  static async renewCertification(request: FastifyRequest, reply: FastifyReply) {
    try {
      const tenant = (request as any).tenant as TenantContext;
      const certificationService = getCertificationService();
      const { id } = request.params as { id: string };
      const { issueDate, expiryDate, certificateNumber } = request.body as {
        issueDate: string;
        expiryDate: string;
        certificateNumber?: string;
      };

      if (!issueDate || !expiryDate) {
        return sendBadRequest(reply, 'issueDate and expiryDate are required');
      }

      const certification = await certificationService.renewCertification(
        tenant.tenantId,
        id,
        new Date(issueDate),
        new Date(expiryDate),
        certificateNumber
      );

      return sendSuccess(reply, { certification }, 'Certification renewed successfully');
    } catch (error: any) {
      if (error.message === 'Certification not found') {
        return sendNotFound(reply, error.message);
      }
      return sendServerError(reply, error.message);
    }
  }

  /**
   * Delete certification
   * DELETE /api/certifications/:id
   */
  static async deleteCertification(request: FastifyRequest, reply: FastifyReply) {
    try {
      const tenant = (request as any).tenant as TenantContext;
      const certificationService = getCertificationService();
      const { id } = request.params as { id: string };

      await certificationService.deleteCertification(tenant.tenantId, id);

      return sendSuccess(reply, {}, 'Certification deleted successfully');
    } catch (error: any) {
      if (error.message === 'Certification not found') {
        return sendNotFound(reply, error.message);
      }
      return sendServerError(reply, error.message);
    }
  }

  /**
   * Get expiring certifications
   * GET /api/certifications/expiring
   */
  static async getExpiringCertifications(request: FastifyRequest, reply: FastifyReply) {
    try {
      const tenant = (request as any).tenant as TenantContext;
      const certificationService = getCertificationService();
      const query = request.query as any;
      const daysThreshold = query.days ? parseInt(query.days) : 30;

      const certifications = await certificationService.getExpiringCertifications(
        tenant.tenantId,
        daysThreshold
      );

      return sendSuccess(reply, { certifications, count: certifications.length });
    } catch (error: any) {
      return sendServerError(reply, error.message);
    }
  }

  /**
   * Get expired certifications
   * GET /api/certifications/expired
   */
  static async getExpiredCertifications(request: FastifyRequest, reply: FastifyReply) {
    try {
      const tenant = (request as any).tenant as TenantContext;
      const certificationService = getCertificationService();

      const certifications = await certificationService.getExpiredCertifications(tenant.tenantId);

      return sendSuccess(reply, { certifications, count: certifications.length });
    } catch (error: any) {
      return sendServerError(reply, error.message);
    }
  }

  /**
   * Get certification summary for staff
   * GET /api/certifications/staff/:staffId/summary
   */
  static async getCertificationSummary(request: FastifyRequest, reply: FastifyReply) {
    try {
      const tenant = (request as any).tenant as TenantContext;
      const certificationService = getCertificationService();
      const { staffId } = request.params as { staffId: string };

      const summary = await certificationService.getCertificationSummary(tenant.tenantId, staffId);

      return sendSuccess(reply, { summary });
    } catch (error: any) {
      return sendServerError(reply, error.message);
    }
  }

  /**
   * Get certification statistics
   * GET /api/certifications/statistics
   */
  static async getCertificationStatistics(request: FastifyRequest, reply: FastifyReply) {
    try {
      const tenant = (request as any).tenant as TenantContext;
      const certificationService = getCertificationService();

      const statistics = await certificationService.getCertificationStatistics(tenant.tenantId);

      return sendSuccess(reply, { statistics });
    } catch (error: any) {
      return sendServerError(reply, error.message);
    }
  }

  /**
   * Update all certification statuses
   * POST /api/certifications/update-statuses
   */
  static async updateAllStatuses(request: FastifyRequest, reply: FastifyReply) {
    try {
      const tenant = (request as any).tenant as TenantContext;
      const certificationService = getCertificationService();

      const updatedCount = await certificationService.updateAllCertificationStatuses(tenant.tenantId);

      return sendSuccess(reply, { updatedCount }, `Updated ${updatedCount} certification statuses`);
    } catch (error: any) {
      return sendServerError(reply, error.message);
    }
  }
}
