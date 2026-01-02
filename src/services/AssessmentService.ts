import { AppDataSource } from '@config/database';
import { Assessment } from '@models/Assessment';
import { AssessmentType } from '@shared';
import { Repository } from 'typeorm';

export class AssessmentService {
  private assessmentRepository: Repository<Assessment>;

  constructor() {
    this.assessmentRepository = AppDataSource.getRepository(Assessment);
  }

  /**
   * Create a new assessment
   */
  async createAssessment(
    tenantId: string,
    childId: string,
    assessor: string,
    data: {
      assessmentType: AssessmentType;
      assessmentDate: Date;
      overallScore?: number;
      ratings?: Record<string, number>;
      strengths?: string;
      areasForImprovement?: string;
      recommendations?: string;
      notes?: string;
      nextAssessmentDate?: Date;
      attachmentUrls?: string[];
    }
  ): Promise<Assessment> {
    const assessment = this.assessmentRepository.create({
      tenantId,
      childId,
      assessor,
      assessmentType: data.assessmentType,
      assessmentDate: data.assessmentDate,
      overallScore: data.overallScore,
      ratings: data.ratings || {},
      strengths: data.strengths,
      areasForImprovement: data.areasForImprovement,
      recommendations: data.recommendations,
      notes: data.notes,
      nextAssessmentDate: data.nextAssessmentDate,
      attachmentUrls: data.attachmentUrls || [],
      isActive: true,
    });

    return this.assessmentRepository.save(assessment);
  }

  /**
   * Get all assessments for a child
   */
  async getAssessmentsByChild(tenantId: string, childId: string): Promise<Assessment[]> {
    return this.assessmentRepository.find({
      where: { tenantId, childId, isActive: true },
      relations: ['child', 'assessorUser'],
      order: { assessmentDate: 'DESC' },
    });
  }

  /**
   * Get assessments by type
   */
  async getAssessmentsByType(
    tenantId: string,
    childId: string,
    assessmentType: AssessmentType
  ): Promise<Assessment[]> {
    return this.assessmentRepository.find({
      where: { tenantId, childId, assessmentType, isActive: true },
      relations: ['child', 'assessorUser'],
      order: { assessmentDate: 'DESC' },
    });
  }

  /**
   * Get assessment by ID
   */
  async getAssessmentById(tenantId: string, assessmentId: string): Promise<Assessment | null> {
    return this.assessmentRepository.findOne({
      where: { id: assessmentId, tenantId },
      relations: ['child', 'assessorUser'],
    });
  }

  /**
   * Update assessment
   */
  async updateAssessment(
    tenantId: string,
    assessmentId: string,
    data: Partial<Assessment>
  ): Promise<Assessment> {
    const assessment = await this.getAssessmentById(tenantId, assessmentId);

    if (!assessment) {
      throw new Error('Assessment not found');
    }

    // Don't allow updating these fields
    const { tenantId: _, id: __, childId, assessor, ...updateData } = data as any;

    Object.assign(assessment, updateData);

    return this.assessmentRepository.save(assessment);
  }

  /**
   * Delete assessment
   */
  async deleteAssessment(tenantId: string, assessmentId: string): Promise<void> {
    const assessment = await this.getAssessmentById(tenantId, assessmentId);

    if (!assessment) {
      throw new Error('Assessment not found');
    }

    assessment.isActive = false;
    await this.assessmentRepository.save(assessment);
  }

  /**
   * Get assessment summary for a child
   */
  async getAssessmentSummary(tenantId: string, childId: string): Promise<{
    totalAssessments: number;
    averageScore: number;
    latestAssessment: Assessment | null;
    byType: Record<AssessmentType, { count: number; averageScore: number }>;
    dueForFollowUp: number;
  }> {
    const assessments = await this.getAssessmentsByChild(tenantId, childId);

    const summary = {
      totalAssessments: assessments.length,
      averageScore: 0,
      latestAssessment: assessments[0] || null,
      byType: {} as Record<AssessmentType, { count: number; averageScore: number }>,
      dueForFollowUp: 0,
    };

    // Initialize types
    Object.values(AssessmentType).forEach((type) => {
      summary.byType[type] = { count: 0, averageScore: 0 };
    });

    let totalScore = 0;
    let scoredAssessments = 0;

    assessments.forEach((assessment) => {
      // Calculate average score
      if (assessment.overallScore) {
        totalScore += assessment.overallScore;
        scoredAssessments++;
      }

      // Count by type
      summary.byType[assessment.assessmentType].count++;
      if (assessment.overallScore) {
        summary.byType[assessment.assessmentType].averageScore += assessment.overallScore;
      }

      // Check if due for follow-up
      if (assessment.isDueForFollowUp()) {
        summary.dueForFollowUp++;
      }
    });

    // Calculate averages
    summary.averageScore = scoredAssessments > 0 ? totalScore / scoredAssessments : 0;

    Object.values(AssessmentType).forEach((type) => {
      const typeData = summary.byType[type];
      if (typeData.count > 0) {
        typeData.averageScore = typeData.averageScore / typeData.count;
      }
    });

    return summary;
  }

  /**
   * Get assessments due for follow-up
   */
  async getAssessmentsDueForFollowUp(tenantId: string, childId: string): Promise<Assessment[]> {
    const assessments = await this.getAssessmentsByChild(tenantId, childId);
    return assessments.filter((a) => a.isDueForFollowUp());
  }

  /**
   * Get assessment progress (compare scores over time)
   */
  async getAssessmentProgress(
    tenantId: string,
    childId: string,
    assessmentType: AssessmentType
  ): Promise<{
    assessments: Assessment[];
    improvement: number; // Percentage improvement from first to last
    trend: 'improving' | 'stable' | 'declining' | 'insufficient_data';
  }> {
    const assessments = await this.getAssessmentsByType(tenantId, childId, assessmentType);

    if (assessments.length < 2) {
      return {
        assessments,
        improvement: 0,
        trend: 'insufficient_data',
      };
    }

    // Sort by date (oldest first)
    const sorted = assessments.sort(
      (a, b) => a.assessmentDate.getTime() - b.assessmentDate.getTime()
    );

    const firstScore = sorted[0].overallScore || 0;
    const lastScore = sorted[sorted.length - 1].overallScore || 0;

    const improvement = firstScore > 0 ? ((lastScore - firstScore) / firstScore) * 100 : 0;

    let trend: 'improving' | 'stable' | 'declining' | 'insufficient_data' = 'stable';
    if (improvement > 5) trend = 'improving';
    else if (improvement < -5) trend = 'declining';

    return {
      assessments: sorted,
      improvement,
      trend,
    };
  }
}

// Singleton instance
let assessmentServiceInstance: AssessmentService | null = null;

export function getAssessmentService(): AssessmentService {
  if (!assessmentServiceInstance) {
    assessmentServiceInstance = new AssessmentService();
  }
  return assessmentServiceInstance;
}
