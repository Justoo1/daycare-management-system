import { Repository } from 'typeorm';
import { AppDataSource } from '@config/database';
import { Tenant } from '@models/Tenant';
import { User } from '@models/User';
import { Center } from '@models/Center';
import { UserRole } from '@shared';
import bcrypt from 'bcrypt';
import { subscriptionService } from './subscription.service';

export class TenantService {
  private tenantRepository: Repository<Tenant>;
  private userRepository: Repository<User>;
  private centerRepository: Repository<Center>;

  constructor() {
    this.tenantRepository = AppDataSource.getRepository(Tenant);
    this.userRepository = AppDataSource.getRepository(User);
    this.centerRepository = AppDataSource.getRepository(Center);
  }

  /**
   * Register a new tenant (daycare organization) with owner account
   */
  async registerTenant(data: {
    // Tenant info
    organizationName: string;
    country: string;
    timezone?: string;
    currency?: string;

    // Owner info
    ownerFirstName: string;
    ownerLastName: string;
    ownerEmail: string;
    ownerPhone?: string;
    ownerPassword: string;

    // Initial center info (optional)
    centerName?: string;
    centerAddress?: string;
    centerPhone?: string;
    centerEmail?: string;
  }) {
    // Check if organization name or email already exists
    const existingTenant = await this.tenantRepository.findOne({
      where: [
        { name: data.organizationName },
        { slug: this.generateSlug(data.organizationName) },
      ],
    });

    if (existingTenant) {
      throw new Error('Organization name already exists');
    }

    const existingUser = await this.userRepository.findOne({
      where: { email: data.ownerEmail },
    });

    if (existingUser) {
      throw new Error('Email already registered');
    }

    // Create tenant
    const tenant = this.tenantRepository.create({
      name: data.organizationName,
      slug: this.generateSlug(data.organizationName),
      country: data.country,
      timezone: data.timezone || 'Africa/Accra',
      currency: data.currency || 'GHS',
      contactEmail: data.ownerEmail,
      contactPhone: data.ownerPhone,
      subscriptionStatus: 'trial',
      subscriptionPlan: 'free',
      isActive: true,
    });

    await this.tenantRepository.save(tenant);

    // Hash password
    const hashedPassword = await bcrypt.hash(data.ownerPassword, 10);

    // Create owner user
    const owner = this.userRepository.create({
      tenantId: tenant.id,
      firstName: data.ownerFirstName,
      lastName: data.ownerLastName,
      email: data.ownerEmail,
      phoneNumber: data.ownerPhone,
      passwordHash: hashedPassword,
      role: UserRole.CENTER_OWNER,
      isActive: true,
      emailVerified: false,
    });

    await this.userRepository.save(owner);

    // Create 30-day free trial subscription
    try {
      await subscriptionService.createTrialSubscription(tenant.id);
      console.log(`Created trial subscription for tenant: ${tenant.id}`);
    } catch (error) {
      console.error('Failed to create trial subscription:', error);
      // Don't fail the entire registration if subscription creation fails
    }

    // Create initial center if provided
    let center = null;
    if (data.centerName) {
      center = this.centerRepository.create({
        tenantId: tenant.id,
        name: data.centerName,
        address: data.centerAddress || '',
        phoneNumber: data.centerPhone || data.ownerPhone || '',
        email: data.centerEmail || data.ownerEmail,
        registrationNumber: this.generateRegistrationNumber(),
        operatingHoursStart: '07:00:00',
        operatingHoursEnd: '18:00:00',
        monthlyTuition: 0,
        currency: tenant.currency,
        isActive: true,
      });

      await this.centerRepository.save(center);

      // Update user's centerId
      owner.centerId = center.id;
      await this.userRepository.save(owner);
    }

    return {
      tenant: {
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
        subscriptionPlan: tenant.subscriptionPlan,
      },
      owner: {
        id: owner.id,
        firstName: owner.firstName,
        lastName: owner.lastName,
        email: owner.email,
        role: owner.role,
      },
      center: center ? {
        id: center.id,
        name: center.name,
      } : null,
    };
  }

  /**
   * Get tenant by ID
   */
  async getTenantById(tenantId: string): Promise<Tenant | null> {
    return await this.tenantRepository.findOne({
      where: { id: tenantId, isActive: true },
    });
  }

  /**
   * Get tenant by slug
   */
  async getTenantBySlug(slug: string): Promise<Tenant | null> {
    return await this.tenantRepository.findOne({
      where: { slug, isActive: true },
    });
  }

  /**
   * Generate URL-friendly slug from organization name
   */
  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }

  /**
   * Generate unique registration number for center
   */
  private generateRegistrationNumber(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 7);
    return `DC-${timestamp}-${random}`.toUpperCase();
  }
}

let tenantServiceInstance: TenantService | null = null;

export function getTenantService(): TenantService {
  if (!tenantServiceInstance) {
    tenantServiceInstance = new TenantService();
  }
  return tenantServiceInstance;
}
