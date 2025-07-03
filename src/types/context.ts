// 🎯 MCP Context Types
// Defines the standardized context structure for EspenTutor, EspenTeacher, and EspenParent

export interface LearnerContext {
  // 👤 Basic Information
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  grade: number;
  class: string;
  languageOfInstruction: string;
  enrollmentDate: string;
  
  // 📊 Academic Performance
  academic: {
    overallAverage: number;
    termAverage: number;
    subjectsCount: number;
    subjects: SubjectPerformance[];
    recentMarks: RecentMark[];
    trends: PerformanceTrend;
  };
  
  // 📅 Attendance
  attendance: {
    percentage: number;
    totalDays: number;
    presentDays: number;
    absentDays: number;
    lateDays: number;
    excusedDays: number;
    recentAttendance: AttendanceRecord[];
    patterns: AttendancePattern;
  };
  
  // ⚠️ Discipline
  discipline: {
    incidentsCount: number;
    recentIncidents: DisciplineIncident[];
    severityBreakdown: SeverityBreakdown;
    trends: DisciplineTrend;
  };
  
  // 👨‍👩‍👧‍👦 Family
  family: {
    parents: ParentInfo[];
    primaryContact: ParentInfo;
    emergencyContacts: ParentInfo[];
  };
  
  // 🎯 Personalization Context
  insights: {
    strengths: string[];
    challengeAreas: string[];
    recommendations: string[];
    riskFactors: string[];
    supportNeeds: string[];
  };
  
  // 📊 Metadata
  metadata: {
    lastUpdated: string;
    tenantId: string;
    cacheKey: string;
    version: number;
  };
}

export interface SubjectPerformance {
  subjectId: string;
  subjectName: string;
  subjectCode: string;
  category: string;
  learningArea: string;
  teacher: string;
  
  // Performance metrics
  currentAverage: number;
  termAverage: number;
  classAverage: number;
  gradeAverage: number;
  
  // Rankings
  classRank?: number;
  gradeRank?: number;
  
  // Progress tracking
  trend: 'improving' | 'declining' | 'stable';
  trendPercentage: number;
  
  // Recent assessments
  recentMarks: {
    value: number;
    total: number;
    percentage: number;
    type: string;
    date: string;
  }[];
}

export interface RecentMark {
  subjectName: string;
  subjectCode: string;
  value: number;
  total: number;
  percentage: number;
  type: string;
  assessmentDate: string;
  term: number;
  isImprovement: boolean;
  classAverage?: number;
}

export interface PerformanceTrend {
  direction: 'improving' | 'declining' | 'stable';
  percentage: number;
  period: string; // e.g., "last 30 days"
  subjectsTrending: {
    improving: string[];
    declining: string[];
    stable: string[];
  };
}

export interface AttendanceRecord {
  date: string;
  status: 'present' | 'absent' | 'late' | 'excused' | 'early_departure';
  lateArrivalTime?: string;
  earlyDepartureTime?: string;
  reason?: string;
  period?: number;
}

export interface AttendancePattern {
  weekdayAttendance: number; // Monday-Friday average
  weekendEvents: number; // Saturday activities if applicable
  monthlyTrend: {
    month: string;
    percentage: number;
  }[];
  commonAbsenceReasons: {
    reason: string;
    count: number;
  }[];
}

export interface DisciplineIncident {
  date: string;
  type: string;
  severity: 'minor' | 'moderate' | 'major' | 'severe';
  description: string;
  actionTaken: string;
  reportedBy: string;
  handledBy: string;
  parentNotified: boolean;
  followUpRequired: boolean;
  followUpDate?: string;
}

export interface SeverityBreakdown {
  minor: number;
  moderate: number;
  major: number;
  severe: number;
}

export interface DisciplineTrend {
  direction: 'improving' | 'declining' | 'stable';
  period: string;
  incidentTypes: {
    type: string;
    count: number;
    trend: 'increasing' | 'decreasing' | 'stable';
  }[];
}

export interface ParentInfo {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  relationshipType: string;
  phoneNumber?: string;
  email?: string;
  address?: string;
  isPrimaryContact: boolean;
}

// Teacher-specific context
export interface TeacherContext {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  staffNumber: string;
  department: string;
  position: string;
  
  // Teaching assignments
  subjects: {
    subjectId: string;
    subjectName: string;
    grade: number;
    classCount: number;
    learnerCount: number;
  }[];
  
  // Class performance overview
  classes: {
    className: string;
    grade: number;
    learnerCount: number;
    averagePerformance: number;
    attendanceRate: number;
    disciplineIncidents: number;
    
    // Performance insights
    topPerformers: LearnerSummary[];
    atRiskLearners: LearnerSummary[];
    improvingLearners: LearnerSummary[];
  }[];
  
  metadata: {
    lastUpdated: string;
    tenantId: string;
    cacheKey: string;
    version: number;
  };
}

// Parent-specific context
export interface ParentContext {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  relationshipType: string;
  
  // Children information
  children: LearnerSummary[];
  
  // Aggregated family insights
  familyInsights: {
    overallPerformance: number;
    attendanceRate: number;
    disciplineStatus: 'good' | 'concerning' | 'critical';
    recentUpdates: FamilyUpdate[];
    upcomingEvents: SchoolEvent[];
  };
  
  metadata: {
    lastUpdated: string;
    tenantId: string;
    cacheKey: string;
    version: number;
  };
}

export interface LearnerSummary {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  grade: number;
  class: string;
  overallAverage: number;
  attendancePercentage: number;
  disciplineIncidents: number;
  trend: 'improving' | 'declining' | 'stable';
}

export interface FamilyUpdate {
  type: 'academic' | 'attendance' | 'discipline' | 'event';
  learnerName: string;
  message: string;
  date: string;
  priority: 'low' | 'medium' | 'high';
}

export interface SchoolEvent {
  title: string;
  description: string;
  date: string;
  type: 'assessment' | 'meeting' | 'event' | 'deadline';
  affectedLearners: string[];
}

// Utility types
export type UserRole = 'learner' | 'teacher' | 'parent' | 'admin';
export type ContextType = 'learner' | 'teacher' | 'parent';

export interface ContextRequest {
  userId: string;
  role: UserRole;
  tenantId: string;
  includeCache?: boolean;
  forceRefresh?: boolean;
}

export interface ContextResponse<T = LearnerContext | TeacherContext | ParentContext> {
  success: boolean;
  data: T;
  cached: boolean;
  generatedAt: string;
  expiresAt: string;
  version: number;
} 