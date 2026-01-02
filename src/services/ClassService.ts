import { AppDataSource } from '@config/database';
import { Class } from '@models/Class';
import { Repository } from 'typeorm';

export class ClassService {
  private classRepository: Repository<Class>;

  constructor() {
    this.classRepository = AppDataSource.getRepository(Class);
  }

  /**
   * Create a new class
   */
  async createClass(
    tenantId: string,
    centerId: string,
    data: {
      name: string;
      ageGroupMin: number;
      ageGroupMax: number;
      capacity: number;
      room?: string;
      schedule?: string;
    }
  ): Promise<Class> {
    // Check if class with same name already exists in center
    const existing = await this.classRepository.findOne({
      where: { tenantId, centerId, name: data.name },
    });

    if (existing) {
      throw new Error('Class with this name already exists in this center');
    }

    const classEntity = this.classRepository.create({
      tenantId,
      centerId,
      name: data.name,
      ageGroupMin: data.ageGroupMin,
      ageGroupMax: data.ageGroupMax,
      capacity: data.capacity,
      room: data.room,
      schedule: data.schedule,
      isActive: true,
    });

    return this.classRepository.save(classEntity);
  }

  /**
   * Get all classes for a center
   */
  async getClasses(tenantId: string, centerId: string): Promise<Class[]> {
    return this.classRepository.find({
      where: { tenantId, centerId },
      order: { name: 'ASC' },
    });
  }

  /**
   * Get active classes only
   */
  async getActiveClasses(tenantId: string, centerId: string): Promise<Class[]> {
    return this.classRepository.find({
      where: { tenantId, centerId, isActive: true },
      order: { name: 'ASC' },
    });
  }

  /**
   * Get all classes for all centers in tenant
   */
  async getAllClasses(tenantId: string): Promise<Class[]> {
    return this.classRepository.find({
      where: { tenantId },
      order: { name: 'ASC' },
    });
  }

  /**
   * Get all active classes for all centers in tenant
   */
  async getAllActiveClasses(tenantId: string): Promise<Class[]> {
    return this.classRepository.find({
      where: { tenantId, isActive: true },
      order: { name: 'ASC' },
    });
  }

  /**
   * Get class by ID
   */
  async getClassById(tenantId: string, classId: string): Promise<Class | null> {
    return this.classRepository.findOne({
      where: { id: classId, tenantId },
    });
  }

  /**
   * Update class
   */
  async updateClass(
    tenantId: string,
    classId: string,
    data: Partial<Class>
  ): Promise<Class> {
    const classEntity = await this.getClassById(tenantId, classId);

    if (!classEntity) {
      throw new Error('Class not found');
    }

    // Don't allow updating these fields
    const { tenantId: _, id: __, centerId, createdAt, updatedAt, ...updateData } = data as any;

    Object.assign(classEntity, updateData);

    return this.classRepository.save(classEntity);
  }

  /**
   * Deactivate class
   */
  async deactivateClass(tenantId: string, classId: string): Promise<void> {
    const classEntity = await this.getClassById(tenantId, classId);

    if (!classEntity) {
      throw new Error('Class not found');
    }

    classEntity.isActive = false;
    await this.classRepository.save(classEntity);
  }

  /**
   * Activate class
   */
  async activateClass(tenantId: string, classId: string): Promise<void> {
    const classEntity = await this.getClassById(tenantId, classId);

    if (!classEntity) {
      throw new Error('Class not found');
    }

    classEntity.isActive = true;
    await this.classRepository.save(classEntity);
  }

  /**
   * Delete class
   */
  async deleteClass(tenantId: string, classId: string): Promise<void> {
    const classEntity = await this.getClassById(tenantId, classId);

    if (!classEntity) {
      throw new Error('Class not found');
    }

    await this.classRepository.remove(classEntity);
  }

  /**
   * Add teacher to class
   * Note: This works with the teachers Many-to-Many relationship
   */
  async addTeacher(tenantId: string, classId: string, teacherId: string): Promise<Class> {
    const classEntity = await this.classRepository.findOne({
      where: { id: classId, tenantId },
      relations: ['teachers'],
    });

    if (!classEntity) {
      throw new Error('Class not found');
    }

    // Check if teacher already assigned
    const isAssigned = classEntity.teachers?.some((t: any) => t.id === teacherId);
    if (isAssigned) {
      throw new Error('Teacher already assigned to this class');
    }

    // Note: In production, you'd want to verify the teacher exists and belongs to tenant
    // For now, we'll add the teacher ID to the relationship
    // The actual relationship is handled by TypeORM's Many-to-Many
    if (!classEntity.teachers) {
      classEntity.teachers = [];
    }

    // You would load the actual User entity and add it
    // classEntity.teachers.push(teacherEntity);
    // For now, return the class - actual implementation needs User repository

    return this.classRepository.save(classEntity);
  }

  /**
   * Remove teacher from class
   */
  async removeTeacher(tenantId: string, classId: string, teacherId: string): Promise<Class> {
    const classEntity = await this.classRepository.findOne({
      where: { id: classId, tenantId },
      relations: ['teachers'],
    });

    if (!classEntity) {
      throw new Error('Class not found');
    }

    // Filter out the teacher
    if (classEntity.teachers) {
      classEntity.teachers = classEntity.teachers.filter((t: any) => t.id !== teacherId);
    }

    return this.classRepository.save(classEntity);
  }

  /**
   * Get class capacity info
   * Uses the Class model's built-in methods that calculate from children relationship
   */
  async getCapacityInfo(tenantId: string, classId: string): Promise<{
    capacity: number;
    enrollmentCount: number;
    availableCapacity: number;
    isFull: boolean;
    utilizationRate: number;
  }> {
    const classEntity = await this.classRepository.findOne({
      where: { id: classId, tenantId },
      relations: ['children'],
    });

    if (!classEntity) {
      throw new Error('Class not found');
    }

    const enrollmentCount = classEntity.getEnrollmentCount();
    const availableCapacity = classEntity.getAvailableCapacity();
    const isFull = classEntity.isFull();
    const utilizationRate = classEntity.capacity > 0
      ? (enrollmentCount / classEntity.capacity) * 100
      : 0;

    return {
      capacity: classEntity.capacity,
      enrollmentCount,
      availableCapacity,
      isFull,
      utilizationRate,
    };
  }
}

// Singleton instance
let classServiceInstance: ClassService | null = null;

export function getClassService(): ClassService {
  if (!classServiceInstance) {
    classServiceInstance = new ClassService();
  }
  return classServiceInstance;
}
