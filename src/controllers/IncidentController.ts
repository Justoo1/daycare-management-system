import { FastifyRequest, FastifyReply } from 'fastify';
import { getIncidentService } from '@services/IncidentService';
import { IncidentType } from '@models/IncidentReport';
import { sendSuccess, sendCreated, sendBadRequest, sendNotFound, sendServerError } from '@utils/response';
import { TenantContext } from '@shared';

export class IncidentController {
  /**
   * Log a new incident
   * POST /api/incidents
   */
  static async createIncident(request: FastifyRequest, reply: FastifyReply) {
    try {
      const tenant = (request as any).tenant as TenantContext;
      const { childId, type, description, bodyPart, actionTaken } = request.body as any;

      if (!childId || !type || !description || !actionTaken) {
        return sendBadRequest(reply, 'childId, type, description, and actionTaken are required');
      }

      const validTypes = Object.values(IncidentType);
      if (!validTypes.includes(type)) {
        return sendBadRequest(reply, `type must be one of: ${validTypes.join(', ')}`);
      }

      const incident = await getIncidentService().createIncident(tenant.tenantId, {
        childId,
        type,
        description,
        bodyPart,
        actionTaken,
        loggedBy: tenant.userId,
      });

      return sendCreated(reply, { incident }, 'Incident logged and parents notified');
    } catch (error: any) {
      return sendServerError(reply, error.message);
    }
  }

  /**
   * List incidents (optionally filtered by childId and/or date)
   * GET /api/incidents?childId=&date=
   */
  static async listIncidents(request: FastifyRequest, reply: FastifyReply) {
    try {
      const tenant = (request as any).tenant as TenantContext;
      const { childId, date } = request.query as { childId?: string; date?: string };

      const incidents = await getIncidentService().listIncidents(tenant.tenantId, {
        childId,
        date: date ? new Date(date) : undefined,
      });

      return sendSuccess(reply, { incidents });
    } catch (error: any) {
      return sendServerError(reply, error.message);
    }
  }

  /**
   * Get a single incident by ID
   * GET /api/incidents/:id
   */
  static async getIncident(request: FastifyRequest, reply: FastifyReply) {
    try {
      const tenant = (request as any).tenant as TenantContext;
      const { id } = request.params as { id: string };

      const incident = await getIncidentService().getIncidentById(tenant.tenantId, id);
      if (!incident) {
        return sendNotFound(reply, 'Incident not found');
      }

      return sendSuccess(reply, { incident });
    } catch (error: any) {
      return sendServerError(reply, error.message);
    }
  }
}
