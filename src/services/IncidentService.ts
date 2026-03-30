import { AppDataSource } from '@config/database';
import { IncidentReport, IncidentType } from '@models/IncidentReport';
import { Child } from '@models/Child';
import { Guardian } from '@models/Guardian';
import { Repository, IsNull } from 'typeorm';
import { getNotificationService } from './NotificationService';
import { getPushNotificationService } from './PushNotificationService';

export class IncidentService {
  private incidentRepository: Repository<IncidentReport>;
  private childRepository: Repository<Child>;
  private guardianRepository: Repository<Guardian>;

  constructor() {
    this.incidentRepository = AppDataSource.getRepository(IncidentReport);
    this.childRepository = AppDataSource.getRepository(Child);
    this.guardianRepository = AppDataSource.getRepository(Guardian);
  }

  async createIncident(
    tenantId: string,
    data: {
      childId: string;
      type: IncidentType;
      description: string;
      bodyPart?: string;
      actionTaken: string;
      loggedBy: string;
    }
  ): Promise<IncidentReport> {
    const incident = this.incidentRepository.create({
      tenantId,
      childId: data.childId,
      type: data.type,
      description: data.description,
      bodyPart: data.bodyPart ?? null,
      actionTaken: data.actionTaken,
      loggedBy: data.loggedBy,
      loggedAt: new Date(),
      parentNotified: false,
    });

    const saved = await this.incidentRepository.save(incident);

    // Notify parents — fire and forget
    this.notifyGuardians(tenantId, data.childId, saved).catch((err) =>
      console.error('[IncidentService] Failed to notify guardians:', err)
    );

    return saved;
  }

  private async notifyGuardians(tenantId: string, childId: string, incident: IncidentReport): Promise<void> {
    const child = await this.childRepository.findOne({
      where: { id: childId, tenantId, deletedAt: IsNull() },
    });
    if (!child) return;

    const guardians = await this.guardianRepository.find({
      where: { childId, tenantId, isActive: true },
    });

    const childName = `${child.firstName} ${child.lastName}`;
    const typeLabel = incident.type === IncidentType.INJURY ? 'injury'
      : incident.type === IncidentType.SICKNESS ? 'illness' : 'incident';
    const smsBody = `Nkabom Alert: ${childName} had a ${typeLabel} at the daycare. Action taken: ${incident.actionTaken}. Please contact us for details.`;
    const pushTitle = `Incident Report — ${childName}`;
    const pushBody = `${childName} had a ${typeLabel}. Action taken: ${incident.actionTaken}.`;

    const notificationService = getNotificationService();
    const pushService = getPushNotificationService();
    const guardianUserIds: string[] = [];

    for (const guardian of guardians) {
      if (guardian.phoneNumber) {
        await notificationService.sendSMS({ recipient: guardian.phoneNumber, message: smsBody }).catch(() => {});
      }
      if (guardian.userId && guardian.canReceivePushNotifications) {
        guardianUserIds.push(guardian.userId);
      }
    }

    if (guardianUserIds.length) {
      await pushService.sendToUserIds(guardianUserIds, pushTitle, pushBody, {
        type: 'incident',
        incidentId: incident.id,
        childId,
      }).catch(() => {});
    }

    await this.incidentRepository.update(incident.id, { parentNotified: true });
  }

  async listIncidents(
    tenantId: string,
    filters: { childId?: string; date?: Date }
  ): Promise<IncidentReport[]> {
    const qb = this.incidentRepository
      .createQueryBuilder('i')
      .where('i.tenantId = :tenantId', { tenantId })
      .orderBy('i.loggedAt', 'DESC');

    if (filters.childId) {
      qb.andWhere('i.childId = :childId', { childId: filters.childId });
    }

    if (filters.date) {
      const start = new Date(filters.date);
      start.setHours(0, 0, 0, 0);
      const end = new Date(filters.date);
      end.setHours(23, 59, 59, 999);
      qb.andWhere('i.loggedAt BETWEEN :start AND :end', { start, end });
    }

    return qb.getMany();
  }

  async getIncidentById(tenantId: string, id: string): Promise<IncidentReport | null> {
    return this.incidentRepository.findOne({ where: { id, tenantId } });
  }
}

let incidentServiceInstance: IncidentService | null = null;

export function getIncidentService(): IncidentService {
  if (!incidentServiceInstance) {
    incidentServiceInstance = new IncidentService();
  }
  return incidentServiceInstance;
}
