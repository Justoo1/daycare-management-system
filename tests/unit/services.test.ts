/**
 * Service Unit Tests
 *
 * Unit tests for service layer methods using mocked repositories
 */

import { ActivityLogService } from '../../src/services/ActivityLogService';
import { MilestoneService } from '../../src/services/MilestoneService';
import { CenterService } from '../../src/services/CenterService';
import { NotificationService } from '../../src/services/NotificationService';
import { ClassService } from '../../src/services/ClassService';
import { AppDataSource } from '../../src/config/database';

// Mock the database
jest.mock('../../src/config/database', () => ({
  AppDataSource: {
    getRepository: jest.fn(),
  },
}));

describe('ActivityLogService', () => {
  let service: ActivityLogService;
  let mockRepository: any;

  beforeEach(() => {
    mockRepository = {
      create: jest.fn((data) => ({ id: 'test-id', ...data })),
      save: jest.fn((data) => Promise.resolve(data)),
      find: jest.fn(() => Promise.resolve([])),
      findOne: jest.fn(() => Promise.resolve(null)),
      delete: jest.fn(() => Promise.resolve({ affected: 1 })),
    };

    (AppDataSource.getRepository as jest.Mock).mockReturnValue(mockRepository);
    service = new ActivityLogService();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('logMeal', () => {
    it('should create and save meal activity log', async () => {
      const mealData = {
        date: new Date('2023-06-15'),
        time: '12:00',
        mealType: 'lunch',
        mealStatus: 'all' as const,
        foodItems: ['Rice', 'Chicken'],
        recordedByUserId: 'staff-123',
        notes: 'Child enjoyed the meal',
      };

      const result = await service.logMeal('tenant-1', 'center-1', 'child-1', mealData);

      expect(mockRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId: 'tenant-1',
          centerId: 'center-1',
          childId: 'child-1',
          activityType: 'meal',
          mealType: 'lunch',
          mealStatus: 'all',
          isVisibleToParents: true,
        })
      );
      expect(mockRepository.save).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('should handle meal log without optional fields', async () => {
      const mealData = {
        date: new Date('2023-06-15'),
        time: '12:00',
        mealType: 'lunch',
        mealStatus: 'half' as const,
      };

      await service.logMeal('tenant-1', 'center-1', 'child-1', mealData);

      expect(mockRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          activityType: 'meal',
          mealType: 'lunch',
        })
      );
      expect(mockRepository.save).toHaveBeenCalled();
    });
  });

  describe('logNap', () => {
    it('should create and save nap activity log', async () => {
      const napData = {
        date: new Date('2023-06-15'),
        time: '14:00',
        napDurationMinutes: 90,
        napQuality: 'good',
        recordedByUserId: 'staff-123',
        notes: 'Slept well',
      };

      const result = await service.logNap('tenant-1', 'center-1', 'child-1', napData);

      expect(mockRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          activityType: 'nap',
          napDurationMinutes: 90,
          napQuality: 'good',
          isVisibleToParents: true,
        })
      );
      expect(mockRepository.save).toHaveBeenCalled();
      expect(result).toBeDefined();
    });
  });

  it('should instantiate without errors', () => {
    expect(service).toBeInstanceOf(ActivityLogService);
  });
});

describe('MilestoneService', () => {
  let service: MilestoneService;
  let mockRepository: any;

  beforeEach(() => {
    mockRepository = {
      create: jest.fn((data) => ({ id: 'milestone-id', ...data })),
      save: jest.fn((data) => Promise.resolve(data)),
      find: jest.fn(() => Promise.resolve([])),
      findOne: jest.fn(() => Promise.resolve(null)),
      update: jest.fn(() => Promise.resolve({ affected: 1 })),
      delete: jest.fn(() => Promise.resolve({ affected: 1 })),
    };

    (AppDataSource.getRepository as jest.Mock).mockReturnValue(mockRepository);
    service = new MilestoneService();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createMilestone', () => {
    it('should create milestone with all fields', async () => {
      const milestoneData = {
        category: 'physical' as const,
        title: 'First steps',
        description: 'Child took first steps',
        ageExpected: 12,
        dateAchieved: new Date('2023-06-15'),
        notes: 'Great progress!',
        photoUrls: ['photo1.jpg', 'photo2.jpg'],
      };

      const result = await service.createMilestone(
        'tenant-1',
        'child-1',
        'staff-1',
        milestoneData
      );

      expect(mockRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId: 'tenant-1',
          childId: 'child-1',
          recordedBy: 'staff-1',
          category: 'physical',
          title: 'First steps',
          isAchieved: true,
          isActive: true,
        })
      );
      expect(mockRepository.save).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('should mark milestone as not achieved when no dateAchieved', async () => {
      const milestoneData = {
        category: 'cognitive' as const,
        title: 'Count to 10',
        description: 'Expected to count to 10',
        ageExpected: 36,
      };

      await service.createMilestone('tenant-1', 'child-1', 'staff-1', milestoneData);

      expect(mockRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          isAchieved: false,
        })
      );
    });

    it('should use empty array for photoUrls if not provided', async () => {
      const milestoneData = {
        category: 'social' as const,
        title: 'Plays with others',
        description: 'Interacts with peers',
        ageExpected: 24,
      };

      await service.createMilestone('tenant-1', 'child-1', 'staff-1', milestoneData);

      expect(mockRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          photoUrls: [],
        })
      );
    });
  });

  describe('getMilestonesByChild', () => {
    it('should fetch milestones for a child', async () => {
      const mockMilestones = [
        { id: '1', title: 'Milestone 1' },
        { id: '2', title: 'Milestone 2' },
      ];
      mockRepository.find.mockResolvedValue(mockMilestones);

      const result = await service.getMilestonesByChild('tenant-1', 'child-1');

      expect(mockRepository.find).toHaveBeenCalledWith({
        where: { tenantId: 'tenant-1', childId: 'child-1', isActive: true },
        relations: ['child', 'recorder'],
        order: { dateAchieved: 'DESC', ageExpected: 'ASC' },
      });
      expect(result).toEqual(mockMilestones);
    });
  });

  describe('getMilestonesByCategory', () => {
    it('should fetch milestones by category', async () => {
      await service.getMilestonesByCategory('tenant-1', 'child-1', 'physical');

      expect(mockRepository.find).toHaveBeenCalledWith({
        where: { tenantId: 'tenant-1', childId: 'child-1', category: 'physical', isActive: true },
        relations: ['child', 'recorder'],
        order: { dateAchieved: 'DESC', ageExpected: 'ASC' },
      });
    });
  });

  describe('getMilestoneById', () => {
    it('should fetch milestone by id', async () => {
      const mockMilestone = { id: 'milestone-1', title: 'Test' };
      mockRepository.findOne.mockResolvedValue(mockMilestone);

      const result = await service.getMilestoneById('tenant-1', 'milestone-1');

      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'milestone-1', tenantId: 'tenant-1' },
        relations: ['child', 'recorder'],
      });
      expect(result).toEqual(mockMilestone);
    });
  });

  it('should instantiate without errors', () => {
    expect(service).toBeInstanceOf(MilestoneService);
  });
});

describe('CenterService', () => {
  let service: CenterService;
  let mockRepository: any;

  beforeEach(() => {
    mockRepository = {
      create: jest.fn((data) => ({ id: 'center-id', ...data })),
      save: jest.fn((data) => Promise.resolve(data)),
      find: jest.fn(() => Promise.resolve([])),
      findOne: jest.fn(() => Promise.resolve(null)),
      update: jest.fn(() => Promise.resolve({ affected: 1 })),
      delete: jest.fn(() => Promise.resolve({ affected: 1 })),
    };

    (AppDataSource.getRepository as jest.Mock).mockReturnValue(mockRepository);
    service = new CenterService();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createCenter', () => {
    it('should create center with all fields', async () => {
      mockRepository.findOne.mockResolvedValue(null); // No existing center

      const centerData = {
        name: 'Little Stars Daycare',
        address: '123 Main St',
        city: 'Accra',
        region: 'Greater Accra',
        phoneNumber: '0201234567',
        email: 'contact@littlestars.com',
        licenseNumber: 'LIC-12345',
        capacity: 50,
        openingTime: '07:00',
        closingTime: '18:00',
        monthlyTuition: 500,
        mealFee: 100,
        activityFee: 50,
        lateFeePerHour: 20,
        infantStaffRatio: '1:4',
        toddlerStaffRatio: '1:6',
        preschoolStaffRatio: '1:10',
      };

      const result = await service.createCenter('tenant-1', centerData);

      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { tenantId: 'tenant-1', name: 'Little Stars Daycare' },
      });
      expect(mockRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId: 'tenant-1',
          name: 'Little Stars Daycare',
          isActive: true,
        })
      );
      expect(mockRepository.save).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('should throw error if center with same name exists', async () => {
      mockRepository.findOne.mockResolvedValue({ id: 'existing', name: 'Existing Center' });

      const centerData = {
        name: 'Existing Center',
        address: '123 Main St',
        city: 'Accra',
        region: 'Greater Accra',
        phoneNumber: '0201234567',
        email: 'contact@center.com',
      };

      await expect(service.createCenter('tenant-1', centerData)).rejects.toThrow(
        'Center with this name already exists'
      );
      expect(mockRepository.save).not.toHaveBeenCalled();
    });

    it('should create center with only required fields', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      const centerData = {
        name: 'Simple Center',
        address: '123 Main St',
        city: 'Kumasi',
        region: 'Ashanti',
        phoneNumber: '0241234567',
        email: 'simple@center.com',
      };

      await service.createCenter('tenant-1', centerData);

      expect(mockRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Simple Center',
          city: 'Kumasi',
        })
      );
    });
  });

  describe('getCenters', () => {
    it('should fetch all centers for tenant', async () => {
      const mockCenters = [
        { id: '1', name: 'Center 1' },
        { id: '2', name: 'Center 2' },
      ];
      mockRepository.find.mockResolvedValue(mockCenters);

      const result = await service.getCenters('tenant-1');

      expect(mockRepository.find).toHaveBeenCalledWith({
        where: { tenantId: 'tenant-1' },
        order: { createdAt: 'DESC' },
      });
      expect(result).toEqual(mockCenters);
    });
  });

  describe('getActiveCenters', () => {
    it('should fetch only active centers', async () => {
      await service.getActiveCenters('tenant-1');

      expect(mockRepository.find).toHaveBeenCalledWith({
        where: { tenantId: 'tenant-1', isActive: true },
        order: { name: 'ASC' },
      });
    });
  });

  describe('getCenterById', () => {
    it('should fetch center by id', async () => {
      const mockCenter = { id: 'center-1', name: 'Test Center' };
      mockRepository.findOne.mockResolvedValue(mockCenter);

      const result = await service.getCenterById('tenant-1', 'center-1');

      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'center-1', tenantId: 'tenant-1' },
      });
      expect(result).toEqual(mockCenter);
    });
  });

  it('should instantiate without errors', () => {
    expect(service).toBeInstanceOf(CenterService);
  });
});

describe('NotificationService', () => {
  let service: NotificationService;
  let mockRepository: any;

  beforeEach(() => {
    mockRepository = {
      create: jest.fn((data) => ({ id: 'notification-id', ...data })),
      save: jest.fn((data) => Promise.resolve(data)),
      find: jest.fn(() => Promise.resolve([])),
      findOne: jest.fn(() => Promise.resolve(null)),
      update: jest.fn(() => Promise.resolve({ affected: 1 })),
      count: jest.fn(() => Promise.resolve(0)),
    };

    (AppDataSource.getRepository as jest.Mock).mockReturnValue(mockRepository);
    service = new NotificationService();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should instantiate without errors', () => {
    expect(service).toBeInstanceOf(NotificationService);
  });

  it('should have a repository', () => {
    expect(AppDataSource.getRepository).toHaveBeenCalled();
  });
});

describe('ClassService', () => {
  let service: ClassService;
  let mockRepository: any;

  beforeEach(() => {
    mockRepository = {
      create: jest.fn((data) => ({ id: 'class-id', ...data })),
      save: jest.fn((data) => Promise.resolve(data)),
      find: jest.fn(() => Promise.resolve([])),
      findOne: jest.fn(() => Promise.resolve(null)),
      update: jest.fn(() => Promise.resolve({ affected: 1 })),
      delete: jest.fn(() => Promise.resolve({ affected: 1 })),
    };

    (AppDataSource.getRepository as jest.Mock).mockReturnValue(mockRepository);
    service = new ClassService();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should instantiate without errors', () => {
    expect(service).toBeInstanceOf(ClassService);
  });

  it('should have a repository', () => {
    expect(AppDataSource.getRepository).toHaveBeenCalled();
  });
});

describe('Service Layer Architecture', () => {
  it('should use consistent repository pattern', () => {
    const services = [
      ActivityLogService,
      MilestoneService,
      CenterService,
      NotificationService,
      ClassService,
    ];

    services.forEach(ServiceClass => {
      const service = new ServiceClass();
      expect(service).toBeDefined();
      expect(AppDataSource.getRepository).toHaveBeenCalled();
    });
  });

  it('should create service instances independently', () => {
    const service1 = new ActivityLogService();
    const service2 = new MilestoneService();
    const service3 = new CenterService();

    expect(service1).toBeInstanceOf(ActivityLogService);
    expect(service2).toBeInstanceOf(MilestoneService);
    expect(service3).toBeInstanceOf(CenterService);
  });
});
