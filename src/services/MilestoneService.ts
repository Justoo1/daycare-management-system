import { AppDataSource } from '@config/database';
import { Milestone } from '@models/Milestone';
import { MilestoneCategory } from '@shared';
import { Repository } from 'typeorm';

export class MilestoneService {
  private milestoneRepository: Repository<Milestone>;

  constructor() {
    this.milestoneRepository = AppDataSource.getRepository(Milestone);
  }

  /**
   * Create a new milestone
   */
  async createMilestone(
    tenantId: string,
    childId: string,
    recordedBy: string,
    data: {
      category: MilestoneCategory;
      title: string;
      description: string;
      ageExpected: number;
      dateAchieved?: Date;
      notes?: string;
      photoUrls?: string[];
    }
  ): Promise<Milestone> {
    const milestone = this.milestoneRepository.create({
      tenantId,
      childId,
      recordedBy,
      category: data.category,
      title: data.title,
      description: data.description,
      ageExpected: data.ageExpected,
      dateAchieved: data.dateAchieved,
      notes: data.notes,
      photoUrls: data.photoUrls || [],
      isAchieved: !!data.dateAchieved,
      isActive: true,
    });

    return this.milestoneRepository.save(milestone);
  }

  /**
   * Get all milestones for a child
   */
  async getMilestonesByChild(tenantId: string, childId: string): Promise<Milestone[]> {
    return this.milestoneRepository.find({
      where: { tenantId, childId, isActive: true },
      relations: ['child', 'recorder'],
      order: { dateAchieved: 'DESC', ageExpected: 'ASC' },
    });
  }

  /**
   * Get milestones by category
   */
  async getMilestonesByCategory(
    tenantId: string,
    childId: string,
    category: MilestoneCategory
  ): Promise<Milestone[]> {
    return this.milestoneRepository.find({
      where: { tenantId, childId, category, isActive: true },
      relations: ['child', 'recorder'],
      order: { dateAchieved: 'DESC', ageExpected: 'ASC' },
    });
  }

  /**
   * Get milestone by ID
   */
  async getMilestoneById(tenantId: string, milestoneId: string): Promise<Milestone | null> {
    return this.milestoneRepository.findOne({
      where: { id: milestoneId, tenantId },
      relations: ['child', 'recorder'],
    });
  }

  /**
   * Update milestone
   */
  async updateMilestone(
    tenantId: string,
    milestoneId: string,
    data: Partial<Milestone>
  ): Promise<Milestone> {
    const milestone = await this.getMilestoneById(tenantId, milestoneId);

    if (!milestone) {
      throw new Error('Milestone not found');
    }

    // Don't allow updating these fields
    const { tenantId: _, id: __, childId, recordedBy, ...updateData } = data as any;

    // If dateAchieved is being set, mark as achieved
    if (updateData.dateAchieved && !milestone.isAchieved) {
      updateData.isAchieved = true;
    }

    Object.assign(milestone, updateData);

    return this.milestoneRepository.save(milestone);
  }

  /**
   * Mark milestone as achieved
   */
  async markAsAchieved(
    tenantId: string,
    milestoneId: string,
    dateAchieved: Date,
    notes?: string
  ): Promise<Milestone> {
    const milestone = await this.getMilestoneById(tenantId, milestoneId);

    if (!milestone) {
      throw new Error('Milestone not found');
    }

    milestone.isAchieved = true;
    milestone.dateAchieved = dateAchieved;
    if (notes) {
      milestone.notes = notes;
    }

    return this.milestoneRepository.save(milestone);
  }

  /**
   * Delete milestone
   */
  async deleteMilestone(tenantId: string, milestoneId: string): Promise<void> {
    const milestone = await this.getMilestoneById(tenantId, milestoneId);

    if (!milestone) {
      throw new Error('Milestone not found');
    }

    milestone.isActive = false;
    await this.milestoneRepository.save(milestone);
  }

  /**
   * Get milestone summary for a child
   */
  async getMilestoneSummary(tenantId: string, childId: string): Promise<{
    totalMilestones: number;
    achieved: number;
    upcoming: number;
    delayed: number;
    byCategory: Record<MilestoneCategory, { total: number; achieved: number }>;
  }> {
    const milestones = await this.getMilestonesByChild(tenantId, childId);

    // Get child's current age (we'll need to load the child)
    const child = milestones[0]?.child;
    const currentAge = child?.getAgeInMonths() || 0;

    const summary = {
      totalMilestones: milestones.length,
      achieved: 0,
      upcoming: 0,
      delayed: 0,
      byCategory: {} as Record<MilestoneCategory, { total: number; achieved: number }>,
    };

    // Initialize categories
    Object.values(MilestoneCategory).forEach((category) => {
      summary.byCategory[category] = { total: 0, achieved: 0 };
    });

    milestones.forEach((milestone) => {
      // Count by status
      if (milestone.isAchieved) {
        summary.achieved++;
      } else if (milestone.isDelayed(currentAge)) {
        summary.delayed++;
      } else {
        summary.upcoming++;
      }

      // Count by category
      summary.byCategory[milestone.category].total++;
      if (milestone.isAchieved) {
        summary.byCategory[milestone.category].achieved++;
      }
    });

    return summary;
  }

  /**
   * Get delayed milestones
   */
  async getDelayedMilestones(tenantId: string, childId: string): Promise<Milestone[]> {
    const milestones = await this.getMilestonesByChild(tenantId, childId);
    const child = milestones[0]?.child;
    const currentAge = child?.getAgeInMonths() || 0;

    return milestones.filter((m) => m.isDelayed(currentAge));
  }
}

// Singleton instance
let milestoneServiceInstance: MilestoneService | null = null;

export function getMilestoneService(): MilestoneService {
  if (!milestoneServiceInstance) {
    milestoneServiceInstance = new MilestoneService();
  }
  return milestoneServiceInstance;
}
