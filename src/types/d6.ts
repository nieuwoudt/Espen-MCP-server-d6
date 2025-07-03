// 🔗 D6 API Response Types
// Defines the structure of data received from D6 School Information System

export interface D6Learner {
  LearnerID: string;
  FirstName: string;
  LastName: string;
  Grade: number;
  LanguageOfInstruction: string;
  Class: string;
  EnrollmentDate: string;
  IsActive: boolean;
}

export interface D6Subject {
  SubjectID: string;
  SubjectName: string;
  SubjectCode: string;
  Grade: number;
  Department: string;
  CreditHours: number;
}

export interface D6SubjectEnrollment {
  LearnerID: string;
  SubjectID: string;
  Term: number;
  AcademicYear: number;
  TeacherName: string;
  EnrollmentDate: string;
}

export interface D6Mark {
  LearnerID: string;
  SubjectID: string;
  Term: number;
  AcademicYear: number;
  MarkValue: number;
  TotalMarks: number;
  MarkType: string; // 'Assignment', 'Test', 'Exam', 'Project'
  AssessmentDate: string;
  RecordedDate: string;
}

export interface D6Attendance {
  LearnerID: string;
  AttendanceDate: string;
  Status: 'Present' | 'Absent' | 'Late' | 'Excused';
  LateArrival?: string; // Time format
  EarlyDeparture?: string; // Time format
  AbsenceReason?: string;
  PeriodNumber?: number;
}

export interface D6Discipline {
  LearnerID: string;
  IncidentDate: string;
  IncidentType: string;
  SeverityLevel: 'Minor' | 'Moderate' | 'Major' | 'Severe';
  Description: string;
  ActionTaken: string;
  ReportedBy: string;
  HandledBy: string;
  ParentNotified: boolean;
  FollowUpRequired: boolean;
}

export interface D6StaffMember {
  StaffID: string;
  FirstName: string;
  LastName: string;
  StaffNumber: string;
  Department: string;
  Position: string;
  SubjectsTaught: string[];
  IsActive: boolean;
}

// Alias for consistency with service layer
export type D6Staff = D6StaffMember;

export interface D6Class {
  ClassID: string;
  ClassName: string;
  Grade: number;
  ClassTeacherID: string;
  Room: string;
  MaxCapacity: number;
  CurrentEnrollment: number;
}

export interface D6Parent {
  ParentID: string;
  FirstName: string;
  LastName: string;
  RelationshipType: string; // 'Mother', 'Father', 'Guardian', etc.
  PhoneNumber: string;
  Email: string;
  Address: string;
  LearnerIDs: string[]; // Array of associated learner IDs
  IsPrimaryContact: boolean;
}

// API Response wrappers
export interface D6ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp: string;
  totalRecords?: number;
  cached?: boolean;
}

export interface D6ErrorResponse {
  success: false;
  error: string;
  errorCode: string;
  timestamp: string;
}

// Request parameters
export interface D6ListParams {
  page?: number;
  pageSize?: number;
  fromDate?: string;
  toDate?: string;
  grade?: number;
  term?: number;
  academicYear?: number;
}

export interface D6LearnerParams extends D6ListParams {
  learnerID?: string;
  isActive?: boolean;
}

export interface D6MarkParams extends D6ListParams {
  learnerID?: string;
  subjectID?: string;
  markType?: string;
}

export interface D6AttendanceParams extends D6ListParams {
  learnerID?: string;
  status?: string;
}

// Utility types for API endpoints
export type D6Endpoint = 
  | 'learners'
  | 'learnersubjectsperterm'
  | 'learnersubjectmarks'
  | 'learnerabsentees'
  | 'learnerdiscipline'
  | 'staffmembers'
  | 'parents';

export interface D6RequestConfig {
  endpoint: D6Endpoint;
  params?: D6ListParams;
  timeout?: number;
  retries?: number;
}

// Additional types for service layer
export interface D6ApiConfig {
  baseUrl: string;
  apiKey: string;
  timeout: number;
}

export interface D6SyncOptions {
  grade?: number;
  class?: string;
  limit?: number;
  offset?: number;
  forceRefresh?: boolean;
} 