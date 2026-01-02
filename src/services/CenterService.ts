import { AppDataSource } from '@config/database';
import { Center } from '@models/Center';
import { Repository } from 'typeorm';

export class CenterService {
  private centerRepository: Repository<Center>;

  constructor() {
    this.centerRepository = AppDataSource.getRepository(Center);
  }

  /**
   * Create a new center
   */
  async createCenter(
    tenantId: string,
    data: {
      name: string;
      address: string;
      city: string;
      region: string;
      phoneNumber: string;
      email: string;
      registrationNumber?: string;
      capacity?: number;
      operatingHoursStart: string;
      operatingHoursEnd: string;
      monthlyTuition?: number;
      mealFee?: number;
      activityFee?: number;
      lateFeePerHour?: number;
      infantStaffRatio?: string;
      toddlerStaffRatio?: string;
      preschoolStaffRatio?: string;
    }
  ): Promise<Center> {
    // Check if center with same name already exists for tenant
    const existing = await this.centerRepository.findOne({
      where: { tenantId, name: data.name },
    });

    if (existing) {
      throw new Error('Center with this name already exists');
    }

    const center = this.centerRepository.create({
      tenantId,
      ...data,
      isActive: true,
    });

    return this.centerRepository.save(center);
  }

  /**
   * Get all centers for a tenant
   */
  async getCenters(tenantId: string): Promise<any[]> {
    const centers = await this.centerRepository.find({
      where: { tenantId },
      order: { createdAt: 'DESC' },
    });

    console.log('Fetched centers from DB:', JSON.stringify(centers, null, 2));

    // Explicitly build plain objects to avoid TypeORM serialization issues
    const plainCenters = centers.map(center => ({
      id: center.id,
      tenantId: center.tenantId,
      name: center.name,
      description: center.description,
      registrationNumber: center.registrationNumber,
      phoneNumber: center.phoneNumber,
      email: center.email,
      address: center.address,
      city: center.city,
      region: center.region,
      district: center.district,
      gpLocation: center.gpLocation,
      operatingHoursStart: center.operatingHoursStart,
      operatingHoursEnd: center.operatingHoursEnd,
      monthlyTuition: center.monthlyTuition,
      mealFee: center.mealFee,
      activityFee: center.activityFee,
      currency: center.currency,
      lateFeePerDay: center.lateFeePerDay,
      lateFeeMaxDays: center.lateFeeMaxDays,
      infantRatio: center.infantRatio,
      toddlerRatio: center.toddlerRatio,
      preschoolRatio: center.preschoolRatio,
      isActive: center.isActive,
      requiresQRCodeCheckIn: center.requiresQRCodeCheckIn,
      requiresNFCCheckIn: center.requiresNFCCheckIn,
      logoUrl: center.logoUrl,
      capacity: center.capacity,
      createdAt: center.createdAt,
      updatedAt: center.updatedAt,
      deletedAt: center.deletedAt,
    }));

    console.log('Plain centers after transformation:', JSON.stringify(plainCenters, null, 2));

    return plainCenters;
  }

  /**
   * Get active centers only
   */
  async getActiveCenters(tenantId: string): Promise<any[]> {
    const centers = await this.centerRepository.find({
      where: { tenantId, isActive: true },
      order: { name: 'ASC' },
    });

    // Explicitly build plain objects to avoid TypeORM serialization issues
    return centers.map(center => ({
      id: center.id,
      tenantId: center.tenantId,
      name: center.name,
      description: center.description,
      registrationNumber: center.registrationNumber,
      phoneNumber: center.phoneNumber,
      email: center.email,
      address: center.address,
      city: center.city,
      region: center.region,
      district: center.district,
      gpLocation: center.gpLocation,
      operatingHoursStart: center.operatingHoursStart,
      operatingHoursEnd: center.operatingHoursEnd,
      monthlyTuition: center.monthlyTuition,
      mealFee: center.mealFee,
      activityFee: center.activityFee,
      currency: center.currency,
      lateFeePerDay: center.lateFeePerDay,
      lateFeeMaxDays: center.lateFeeMaxDays,
      infantRatio: center.infantRatio,
      toddlerRatio: center.toddlerRatio,
      preschoolRatio: center.preschoolRatio,
      isActive: center.isActive,
      requiresQRCodeCheckIn: center.requiresQRCodeCheckIn,
      requiresNFCCheckIn: center.requiresNFCCheckIn,
      logoUrl: center.logoUrl,
      capacity: center.capacity,
      createdAt: center.createdAt,
      updatedAt: center.updatedAt,
      deletedAt: center.deletedAt,
    }));
  }

  /**
   * Get center by ID
   */
  async getCenterById(tenantId: string, centerId: string): Promise<Center | null> {
    return this.centerRepository.findOne({
      where: { id: centerId, tenantId },
    });
  }

  /**
   * Update center
   */
  async updateCenter(
    tenantId: string,
    centerId: string,
    data: Partial<Center>
  ): Promise<Center> {
    const center = await this.getCenterById(tenantId, centerId);

    if (!center) {
      throw new Error('Center not found');
    }

    // Don't allow updating these fields
    const { tenantId: _, id: __, createdAt, updatedAt, ...updateData } = data as any;

    Object.assign(center, updateData);

    return this.centerRepository.save(center);
  }

  /**
   * Deactivate center (soft delete)
   */
  async deactivateCenter(tenantId: string, centerId: string): Promise<void> {
    const center = await this.getCenterById(tenantId, centerId);

    if (!center) {
      throw new Error('Center not found');
    }

    center.isActive = false;
    await this.centerRepository.save(center);
  }

  /**
   * Activate center
   */
  async activateCenter(tenantId: string, centerId: string): Promise<void> {
    const center = await this.getCenterById(tenantId, centerId);

    if (!center) {
      throw new Error('Center not found');
    }

    center.isActive = true;
    await this.centerRepository.save(center);
  }

  /**
   * Delete center permanently
   */
  async deleteCenter(tenantId: string, centerId: string): Promise<void> {
    const center = await this.getCenterById(tenantId, centerId);

    if (!center) {
      throw new Error('Center not found');
    }

    await this.centerRepository.remove(center);
  }

  /**
   * Get center statistics
   */
  async getCenterStats(tenantId: string, centerId: string): Promise<{
    totalChildren: number;
    totalStaff: number;
    totalClasses: number;
  }> {
    const center = await this.getCenterById(tenantId, centerId);

    if (!center) {
      throw new Error('Center not found');
    }

    // TODO: Implement actual counting from related entities
    // For now, return placeholder data
    const totalChildren = 0;
    const totalStaff = 0;
    const totalClasses = 0;

    return {
      totalChildren,
      totalStaff,
      totalClasses,
    };
  }
}

// Singleton instance
let centerServiceInstance: CenterService | null = null;

export function getCenterService(): CenterService {
  if (!centerServiceInstance) {
    centerServiceInstance = new CenterService();
  }
  return centerServiceInstance;
}
