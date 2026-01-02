// Request context type - contains authenticated user and tenant information
export interface RequestContext {
  tenantId: string;
  userId: string;
  centerId: string;
  classId?: string; // Staff member's assigned class (from StaffProfile)
  role: UserRole;
  permissions: string[];
}

// Legacy alias for backwards compatibility
export type TenantContext = RequestContext;

// User roles in the system
export enum UserRole {
  SUPER_ADMIN = 'super_admin',
  CENTER_OWNER = 'center_owner',
  DIRECTOR = 'director',
  TEACHER = 'teacher',
  STAFF = 'staff',
  PARENT = 'parent',
}

// Child enrollment status
export enum EnrollmentStatus {
  PENDING = 'pending',           // Application submitted, awaiting review
  APPROVED = 'approved',         // Application approved, awaiting enrollment
  ENROLLED = 'enrolled',         // Currently enrolled
  WAITLIST = 'waitlist',         // On waitlist
  WITHDRAWN = 'withdrawn',       // Withdrawn from center
  REJECTED = 'rejected',         // Application rejected
  INACTIVE = 'inactive',         // Temporarily inactive (e.g., on leave)
}

// Attendance status
export enum AttendanceStatus {
  PRESENT = 'present',
  ABSENT = 'absent',
  LATE = 'late',
  EARLY_PICKUP = 'early_pickup',
  ON_LEAVE = 'on_leave',
}

// Activity meal status
export enum MealStatus {
  ALL = 'all',
  MOST = 'most',
  SOME = 'some',
  NONE = 'none',
}

// Message types
export enum MessageType {
  TEXT = 'text',
  VOICE = 'voice',
  IMAGE = 'image',
  FILE = 'file',
}

// Milestone categories
export enum MilestoneCategory {
  PHYSICAL = 'physical',           // Gross/fine motor skills
  COGNITIVE = 'cognitive',         // Problem solving, thinking
  SOCIAL = 'social',               // Interactions with others
  EMOTIONAL = 'emotional',         // Feelings, self-regulation
  LANGUAGE = 'language',           // Speech, communication
}

// Assessment types
export enum AssessmentType {
  DEVELOPMENTAL = 'developmental', // Overall development assessment
  BEHAVIORAL = 'behavioral',       // Behavior evaluation
  ACADEMIC = 'academic',           // Learning progress
  HEALTH = 'health',               // Health screening
}

// Staff positions
export enum StaffPosition {
  DIRECTOR = 'director',
  TEACHER = 'teacher',
  ASSISTANT_TEACHER = 'assistant_teacher',
  NURSE = 'nurse',
  COOK = 'cook',
  JANITOR = 'janitor',
  ADMINISTRATOR = 'administrator',
  SUPPORT_STAFF = 'support_staff',
}

// Employment types
export enum EmploymentType {
  FULL_TIME = 'full_time',
  PART_TIME = 'part_time',
  CONTRACT = 'contract',
  TEMPORARY = 'temporary',
}

// Salary frequency
export enum SalaryFrequency {
  HOURLY = 'hourly',
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
  ANNUAL = 'annual',
}

// Certification status
export enum CertificationStatus {
  ACTIVE = 'active',
  EXPIRED = 'expired',
  PENDING_RENEWAL = 'pending_renewal',
  SUSPENDED = 'suspended',
}

// Shift status
export enum ShiftStatus {
  SCHEDULED = 'scheduled',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  NO_SHOW = 'no_show',
}

// Staff attendance status
export enum StaffAttendanceStatus {
  PRESENT = 'present',
  ABSENT = 'absent',
  LATE = 'late',
  HALF_DAY = 'half_day',
  ON_LEAVE = 'on_leave',
  SICK_LEAVE = 'sick_leave',
}

// Fastify Request with authenticated user context
export interface FastifyRequestWithContext extends Request {
  tenant?: RequestContext; // Note: property is named 'tenant' for backwards compatibility
}

// Legacy alias
export type FastifyRequestWithTenant = FastifyRequestWithContext;

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp: string;
}

export interface PaginationParams {
  page: number;
  limit: number;
  offset: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Report types
export enum ReportType {
  ATTENDANCE = 'attendance',
  ENROLLMENT = 'enrollment',
  FINANCIAL = 'financial',
  STAFF = 'staff',
  CUSTOM = 'custom',
}

// Report formats
export enum ReportFormat {
  JSON = 'json',
  CSV = 'csv',
  PDF = 'pdf',
  EXCEL = 'excel',
}
