import { AppDataSource } from '@config/database';
import { Certification } from '@models/Certification';
import { CertificationStatus } from '@shared';
import { Repository } from 'typeorm';

export class CertificationService {
  private certificationRepository: Repository<Certification>;

  constructor() {
    this.certificationRepository = AppDataSource.getRepository(Certification);
  }

  /**
   * Create a new certification
   */
  async createCertification(
    tenantId: string,
    staffId: string,
    data: {
      certificationType: string;
      certificateNumber?: string;
      issuingOrganization: string;
      issueDate: Date;
      expiryDate?: Date;
      documentUrl?: string;
      notes?: string;
    }
  ): Promise<Certification> {
    const certification = this.certificationRepository.create({
      tenantId,
      staffId,
      certificationType: data.certificationType,
      certificateNumber: data.certificateNumber,
      issuingOrganization: data.issuingOrganization,
      issueDate: data.issueDate,
      expiryDate: data.expiryDate,
      status: CertificationStatus.ACTIVE,
      documentUrl: data.documentUrl,
      notes: data.notes,
      isActive: true,
    });

    // Auto-update status based on expiry
    certification.updateStatus();

    return this.certificationRepository.save(certification);
  }

  /**
   * Get all certifications for a staff member
   */
  async getCertificationsByStaff(tenantId: string, staffId: string): Promise<Certification[]> {
    return this.certificationRepository.find({
      where: { tenantId, staffId, isActive: true },
      relations: ['staff'],
      order: { issueDate: 'DESC' },
    });
  }

  /**
   * Get certification by ID
   */
  async getCertificationById(tenantId: string, certificationId: string): Promise<Certification | null> {
    return this.certificationRepository.findOne({
      where: { id: certificationId, tenantId },
      relations: ['staff'],
    });
  }

  /**
   * Get certifications by type
   */
  async getCertificationsByType(
    tenantId: string,
    certificationType: string
  ): Promise<Certification[]> {
    return this.certificationRepository.find({
      where: { tenantId, certificationType, isActive: true },
      relations: ['staff'],
      order: { expiryDate: 'ASC' },
    });
  }

  /**
   * Get certifications by status
   */
  async getCertificationsByStatus(
    tenantId: string,
    status: CertificationStatus
  ): Promise<Certification[]> {
    return this.certificationRepository.find({
      where: { tenantId, status, isActive: true },
      relations: ['staff'],
      order: { expiryDate: 'ASC' },
    });
  }

  /**
   * Update certification
   */
  async updateCertification(
    tenantId: string,
    certificationId: string,
    data: Partial<Certification>
  ): Promise<Certification> {
    const certification = await this.getCertificationById(tenantId, certificationId);

    if (!certification) {
      throw new Error('Certification not found');
    }

    // Don't allow updating these fields
    const { tenantId: _, id: __, staffId, ...updateData } = data as any;

    Object.assign(certification, updateData);

    // Auto-update status after changes
    certification.updateStatus();

    return this.certificationRepository.save(certification);
  }

  /**
   * Renew certification
   */
  async renewCertification(
    tenantId: string,
    certificationId: string,
    newIssueDate: Date,
    newExpiryDate: Date,
    certificateNumber?: string
  ): Promise<Certification> {
    const certification = await this.getCertificationById(tenantId, certificationId);

    if (!certification) {
      throw new Error('Certification not found');
    }

    certification.issueDate = newIssueDate;
    certification.expiryDate = newExpiryDate;
    if (certificateNumber) {
      certification.certificateNumber = certificateNumber;
    }

    certification.updateStatus();

    return this.certificationRepository.save(certification);
  }

  /**
   * Delete certification (soft delete)
   */
  async deleteCertification(tenantId: string, certificationId: string): Promise<void> {
    const certification = await this.getCertificationById(tenantId, certificationId);

    if (!certification) {
      throw new Error('Certification not found');
    }

    certification.isActive = false;
    await this.certificationRepository.save(certification);
  }

  /**
   * Get expiring certifications (within threshold days)
   */
  async getExpiringCertifications(
    tenantId: string,
    daysThreshold: number = 30
  ): Promise<Certification[]> {
    const allCertifications = await this.certificationRepository.find({
      where: { tenantId, isActive: true },
      relations: ['staff'],
    });

    return allCertifications.filter((cert) => cert.isExpiringSoon(daysThreshold));
  }

  /**
   * Get expired certifications
   */
  async getExpiredCertifications(tenantId: string): Promise<Certification[]> {
    const allCertifications = await this.certificationRepository.find({
      where: { tenantId, isActive: true },
      relations: ['staff'],
    });

    return allCertifications.filter((cert) => cert.isExpired());
  }

  /**
   * Get certification summary for a staff member
   */
  async getCertificationSummary(tenantId: string, staffId: string): Promise<{
    totalCertifications: number;
    activeCertifications: number;
    expiredCertifications: number;
    expiringSoon: number;
    byType: Record<string, number>;
    byStatus: Record<CertificationStatus, number>;
  }> {
    const certifications = await this.getCertificationsByStaff(tenantId, staffId);

    const summary = {
      totalCertifications: certifications.length,
      activeCertifications: 0,
      expiredCertifications: 0,
      expiringSoon: 0,
      byType: {} as Record<string, number>,
      byStatus: {} as Record<CertificationStatus, number>,
    };

    // Initialize status counts
    Object.values(CertificationStatus).forEach((status) => {
      summary.byStatus[status] = 0;
    });

    certifications.forEach((cert) => {
      // Count by status
      summary.byStatus[cert.status]++;

      if (cert.status === CertificationStatus.ACTIVE) {
        summary.activeCertifications++;
      }

      if (cert.isExpired()) {
        summary.expiredCertifications++;
      }

      if (cert.isExpiringSoon(30)) {
        summary.expiringSoon++;
      }

      // Count by type
      if (!summary.byType[cert.certificationType]) {
        summary.byType[cert.certificationType] = 0;
      }
      summary.byType[cert.certificationType]++;
    });

    return summary;
  }

  /**
   * Get certification statistics for tenant
   */
  async getCertificationStatistics(tenantId: string): Promise<{
    totalCertifications: number;
    expiredCount: number;
    expiringSoonCount: number;
    byType: Record<string, number>;
    staffWithExpiredCerts: number;
    staffWithExpiringSoonCerts: number;
  }> {
    const allCertifications = await this.certificationRepository.find({
      where: { tenantId, isActive: true },
      relations: ['staff'],
    });

    const statistics = {
      totalCertifications: allCertifications.length,
      expiredCount: 0,
      expiringSoonCount: 0,
      byType: {} as Record<string, number>,
      staffWithExpiredCerts: 0,
      staffWithExpiringSoonCerts: 0,
    };

    const staffWithExpired = new Set<string>();
    const staffWithExpiringSoon = new Set<string>();

    allCertifications.forEach((cert) => {
      // Count by type
      if (!statistics.byType[cert.certificationType]) {
        statistics.byType[cert.certificationType] = 0;
      }
      statistics.byType[cert.certificationType]++;

      // Count expired
      if (cert.isExpired()) {
        statistics.expiredCount++;
        staffWithExpired.add(cert.staffId);
      }

      // Count expiring soon
      if (cert.isExpiringSoon(30)) {
        statistics.expiringSoonCount++;
        staffWithExpiringSoon.add(cert.staffId);
      }
    });

    statistics.staffWithExpiredCerts = staffWithExpired.size;
    statistics.staffWithExpiringSoonCerts = staffWithExpiringSoon.size;

    return statistics;
  }

  /**
   * Update all certification statuses (run periodically)
   */
  async updateAllCertificationStatuses(tenantId: string): Promise<number> {
    const certifications = await this.certificationRepository.find({
      where: { tenantId, isActive: true },
    });

    let updatedCount = 0;

    for (const cert of certifications) {
      const oldStatus = cert.status;
      cert.updateStatus();

      if (oldStatus !== cert.status) {
        await this.certificationRepository.save(cert);
        updatedCount++;
      }
    }

    return updatedCount;
  }
}

// Singleton instance
let certificationServiceInstance: CertificationService | null = null;

export function getCertificationService(): CertificationService {
  if (!certificationServiceInstance) {
    certificationServiceInstance = new CertificationService();
  }
  return certificationServiceInstance;
}
