// 🌐 D6 API Service - Hybrid Implementation with Sandbox Support
// Enhanced version with v1/v2 fallback + Mock Data Sandbox
import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { CacheService } from './cacheService.js';
import { logger } from '../utils/logger.js';
import { d6MockData, MockD6ClientIntegration, MockD6Learner, MockD6Staff, MockD6Parent, MockD6Mark } from './d6MockDataService.js';
import {
  D6ApiResponse,
  D6Learner,
  D6Staff,
  D6Parent,
  D6Mark
} from '../types/d6.js';

// Additional types for hybrid service
export interface D6ClientIntegration {
  school_login_id?: string;
  school_id?: number;
  school_name: string;
  admin_email_address: string;
  telephone_calling_code: string;
  telephone_number: string;
  api_type_id: number;
  api_type: string;
  activated_by_integrator: string;
}

export interface D6LookupItem {
  id: string;
  name: string;
}

export interface D6ApiServiceConfig {
  baseUrl: string;
  username: string;
  password: string;
  timeout?: number;
  retryAttempts?: number;
  retryDelay?: number;
  enableMockData?: boolean; // 🎭 New: Enable sandbox mode
  useMockDataFirst?: boolean; // 🎭 New: Use mock data before trying real API
}

export interface D6ApiClientInfo {
  v1Available: boolean;
  v2Available: boolean;
  mockDataEnabled: boolean;
  mode: 'production' | 'sandbox' | 'hybrid';
}

export interface D6ErrorResponse {
  error: string;
  error_description: string;
}

export class D6ApiServiceHybrid {
  private static instance: D6ApiServiceHybrid;
  private clientV1: AxiosInstance;
  private clientV2: AxiosInstance;
  private config: Required<D6ApiServiceConfig>;
  private cache?: CacheService;
  private v2Available: boolean = false;
  private clientInfo: D6ApiClientInfo;

  private constructor(config: D6ApiServiceConfig) {
    this.config = {
      timeout: 10000,
      retryAttempts: 3,
      retryDelay: 1000,
      enableMockData: process.env.NODE_ENV === 'development' || false,
      useMockDataFirst: process.env.D6_SANDBOX_MODE === 'true' || false,
      ...config
    };
    
    this.clientInfo = {
      v1Available: false,
      v2Available: false,
      mockDataEnabled: this.config.enableMockData,
      mode: this.config.useMockDataFirst ? 'sandbox' : 'hybrid'
    };

    // Create v1 client
    this.clientV1 = axios.create({
      baseURL: this.config.baseUrl.replace('/v2', '/v1'),
      timeout: this.config.timeout,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Espen-D6-MCP-Server/1.0.0',
        'HTTP-X-USERNAME': this.config.username,
        'HTTP-X-PASSWORD': this.config.password,
      },
    });

    // Create v2 client
    this.clientV2 = axios.create({
      baseURL: this.config.baseUrl,
      timeout: this.config.timeout,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Espen-D6-MCP-Server/1.0.0',
        'HTTP-X-USERNAME': this.config.username,
        'HTTP-X-PASSWORD': this.config.password,
      },
    });

    this.setupInterceptors();
    this.checkV2Availability();
  }

  public static getInstance(config?: D6ApiServiceConfig): D6ApiServiceHybrid {
    if (!D6ApiServiceHybrid.instance) {
      if (!config) {
        throw new Error('D6 API configuration required for first initialization');
      }
      D6ApiServiceHybrid.instance = new D6ApiServiceHybrid(config);
    }
    return D6ApiServiceHybrid.instance;
  }

  public setCache(cacheService: CacheService): void {
    this.cache = cacheService;
  }

  /**
   * Check if v2 API is available for our credentials
   */
  private async checkV2Availability(): Promise<void> {
    try {
      const response = await this.clientV2.get('settings/clients');
      this.v2Available = true;
      logger.info('D6 API v2 is available');
    } catch (error: any) {
      if (error.response?.status === 404) {
        this.v2Available = false;
        logger.warn('D6 API v2 not available, falling back to v1');
      }
    }
  }

  private setupInterceptors(): void {
    // Setup interceptors for both clients
    [this.clientV1, this.clientV2].forEach((client, index) => {
      const version = index === 0 ? 'v1' : 'v2';
      
      client.interceptors.request.use(
        (config) => {
          logger.debug(`D6 API ${version} Request`, {
            method: config.method?.toUpperCase(),
            url: config.url,
          });
          return config;
        },
        (error) => {
          logger.error(`D6 API ${version} Request Error`, { error: error.message });
          return Promise.reject(error);
        }
      );

      client.interceptors.response.use(
        (response) => {
          logger.debug(`D6 API ${version} Response`, {
            status: response.status,
            url: response.config.url,
          });
          return response;
        },
        async (error) => {
          logger.error(`D6 API ${version} Response Error`, {
            status: error.response?.status,
            url: error.config?.url,
            error: error.message,
            responseData: error.response?.data,
          });
          return Promise.reject(error);
        }
      );
    });
  }

  /**
   * 🎭 Determine whether to use mock data
   */
  private shouldUseMockData(): boolean {
    return this.config.enableMockData && (
      this.config.useMockDataFirst || 
      (!this.clientInfo.v1Available && !this.clientInfo.v2Available)
    );
  }

  /**
   * 🚀 Initialize and test API connectivity
   */
  public async initialize(): Promise<D6ApiClientInfo> {
    logger.info('Initializing D6 API connectivity tests...');

    if (this.config.useMockDataFirst) {
      logger.info('🎭 Sandbox mode enabled - using mock data first');
      this.clientInfo.mode = 'sandbox';
      return this.clientInfo;
    }

    // Test v2 API availability
    try {
      await this.clientV2.get('/adminplus/lookup/genders');
      this.clientInfo.v2Available = true;
      logger.info('✅ D6 v2 API is available');
    } catch (error: any) {
      if (error.response?.status === 404) {
        logger.info('❌ D6 v2 API not available (404 - route not found)');
      } else {
        logger.warn('❌ D6 v2 API test failed', { error: error.message });
      }
    }

    // Test v1 API availability
    try {
      await this.clientV1.get('/adminplus/lookup/genders');
      this.clientInfo.v1Available = true;
      logger.info('✅ D6 v1 API is available');
    } catch (error: any) {
      logger.warn('❌ D6 v1 API test failed', { error: error.message });
    }

    // Determine operation mode
    if (this.clientInfo.v2Available || this.clientInfo.v1Available) {
      this.clientInfo.mode = 'production';
    } else if (this.config.enableMockData) {
      this.clientInfo.mode = 'sandbox';
      logger.info('🎭 Falling back to sandbox mode - using mock data');
    } else {
      this.clientInfo.mode = 'hybrid';
      logger.error('❌ No D6 API access and mock data disabled');
    }

    logger.info('D6 API initialization complete', this.clientInfo);
    return this.clientInfo;
  }

  /**
   * 🔄 Hybrid request handler with v2 -> v1 -> Mock fallback
   */
  private async hybridRequest<T>(
    endpoint: string,
    config: AxiosRequestConfig = {},
    mockDataFallback?: () => T
  ): Promise<T> {
    const cacheKey = `d6:${endpoint}:${JSON.stringify(config.params || {})}`;
    
    // Try cache first
    const cached = await this.cache?.get<T>(cacheKey);
    if (cached) {
      logger.debug('Returning cached D6 data', { endpoint, cacheKey });
      return cached;
    }

    // If sandbox mode or should use mock data first
    if (this.shouldUseMockData() && mockDataFallback) {
      logger.info('🎭 Using mock data', { endpoint, reason: 'sandbox_mode' });
      const mockResult = mockDataFallback();
      await this.cache?.set(cacheKey, mockResult, 300); // Cache for 5 minutes
      return mockResult;
    }

    let lastError: any;

    // Try v2 API first (if available)
    if (this.clientInfo.v2Available) {
      try {
        const response = await this.clientV2.get<T>(endpoint, config);
        await this.cache?.set(cacheKey, response.data, 600); // Cache for 10 minutes
        return response.data;
      } catch (error: any) {
        lastError = error;
        if (error.response?.status === 404) {
          logger.info('D6 v2 endpoint not found, trying v1...', { endpoint });
        } else {
          logger.warn('D6 v2 request failed, trying v1...', { 
            endpoint, 
            error: error.message 
          });
        }
      }
    }

    // Try v1 API fallback
    if (this.clientInfo.v1Available) {
      try {
        const response = await this.clientV1.get<T>(endpoint, config);
        await this.cache?.set(cacheKey, response.data, 600); // Cache for 10 minutes
        return response.data;
      } catch (error: any) {
        lastError = error;
        logger.warn('D6 v1 request failed', { 
          endpoint, 
          error: error.message 
        });
      }
    }

    // Final fallback to mock data (if enabled)
    if (this.config.enableMockData && mockDataFallback) {
      logger.info('🎭 Using mock data as final fallback', { 
        endpoint, 
        reason: 'api_unavailable' 
      });
      const mockResult = mockDataFallback();
      await this.cache?.set(cacheKey, mockResult, 300); // Cache for 5 minutes
      return mockResult;
    }

    // If we get here, everything failed
    logger.error('All D6 API attempts failed', { 
      endpoint, 
      v1Available: this.clientInfo.v1Available,
      v2Available: this.clientInfo.v2Available,
      mockEnabled: this.config.enableMockData,
      lastError: lastError?.message 
    });
    
    throw new Error(`D6 API request failed: ${lastError?.message || 'Unknown error'}`);
  }

  // ====================
  // SETTINGS ENDPOINTS
  // ====================

  /**
   * 🏫 Get client integrations (authorized schools)
   */
  public async getClientIntegrations(): Promise<D6ClientIntegration[]> {
    return this.hybridRequest<D6ClientIntegration[]>(
      '/settings/clients',
      {},
      () => {
        const mockIntegrations = d6MockData.getClientIntegrations();
        return mockIntegrations.map(mock => ({
          school_login_id: mock.school_login_id,
          school_id: mock.school_id,
          school_name: mock.school_name,
          admin_email_address: mock.admin_email_address,
          telephone_calling_code: mock.telephone_calling_code,
          telephone_number: mock.telephone_number,
          api_type_id: mock.api_type_id,
          api_type: mock.api_type,
          activated_by_integrator: mock.activated_by_integrator
        }));
      }
    );
  }

  /**
   * 🎓 Get learners for a specific school (school_login_id in URL path)
   */
  public async getLearners(schoolId: number, options: { limit?: number; offset?: number } = {}): Promise<D6Learner[]> {
    const rawData = await this.hybridRequest<any[]>(
      `/adminplus/learners/${schoolId}`, // Correct format: /v1/adminplus/learners/1694
      { params: { ...options } }, // Query parameters for limit/offset only
      () => {
        const mockLearners = d6MockData.getLearners(schoolId, options);
        return mockLearners.map(mock => ({
          LearnerID: mock.learner_id.toString(),
          FirstName: mock.first_name,
          LastName: mock.last_name,
          Grade: parseInt(mock.grade),
          LanguageOfInstruction: mock.home_language || 'English',
          Class: `Grade ${mock.grade}`,
          EnrollmentDate: mock.date_of_birth || '2024-01-01',
          IsActive: true
        }));
      }
    );

    // Transform real API data to match our interface
    return rawData.map((learner: any) => ({
      LearnerID: learner.id?.toString() || learner.LearnerID,
      FirstName: learner.first_name || learner.FirstName,
      LastName: learner.last_name || learner.LastName,
      Grade: parseInt(learner.grade || learner.Grade || '0'),
      LanguageOfInstruction: learner.home_language || learner.tuition_language || 'English',
      Class: learner.register_class_name || `Grade ${learner.grade}`,
      EnrollmentDate: learner.date_of_birth || learner.EnrollmentDate || '2024-01-01',
      IsActive: true,
      // Additional fields from D6
      AdmissionNumber: learner.admission_number,
      Gender: learner.gender,
      DateOfBirth: learner.date_of_birth,
      HomeLanguage: learner.home_language,
      TuitionLanguage: learner.tuition_language,
      EthnicGroup: learner.ethnic_group,
      Nationality: learner.nationality
    }));
  }

  /**
   * 👨‍🏫 Get staff for a specific school (school_login_id in URL path)
   */
  public async getStaff(schoolId: number): Promise<D6Staff[]> {
    const rawData = await this.hybridRequest<any[]>(
      `/adminplus/staffmembers/${schoolId}`, // Correct format: /v1/adminplus/staffmembers/1694
      {},
      () => {
        const mockStaff = d6MockData.getStaff(schoolId);
        return mockStaff.map(mock => ({
          StaffID: mock.staff_id.toString(),
          FirstName: mock.first_name,
          LastName: mock.last_name,
          StaffNumber: `STAFF${mock.staff_id}`,
          Department: 'Academic',
          Position: mock.role,
          SubjectsTaught: mock.subjects || [],
          IsActive: true
        }));
      }
    );

    // Transform real API data to match our interface
    return rawData.map((staffMember: any) => ({
      StaffID: staffMember.id?.toString() || staffMember.StaffID,
      FirstName: staffMember.first_name || staffMember.FirstName,
      LastName: staffMember.last_name || staffMember.LastName,
      StaffNumber: staffMember.staff_number || staffMember.employee_number || `STAFF${staffMember.id}`,
      Department: staffMember.department || staffMember.Department || 'Academic',
      Position: staffMember.position || staffMember.job_title || staffMember.Position || 'Teacher',
      SubjectsTaught: staffMember.subjects_taught || staffMember.SubjectsTaught || [],
      IsActive: staffMember.is_active !== false, // Default to active unless explicitly false
      // Additional fields from D6
      Email: staffMember.email_address,
      Phone: staffMember.mobile_number,
      Gender: staffMember.gender,
      DateOfBirth: staffMember.date_of_birth,
      QualificationLevel: staffMember.qualification_level,
      YearsExperience: staffMember.years_experience
    }));
  }

  /**
   * 👪 Get parents for a specific school (school_login_id in URL path)
   */
  public async getParents(schoolId: number): Promise<D6Parent[]> {
    const rawData = await this.hybridRequest<any[]>(
      `/adminplus/parents/${schoolId}`, // Correct format: /v1/adminplus/parents/1694
      {},
      () => {
        const mockParents = d6MockData.getParents(schoolId);
        return mockParents.map(mock => ({
          ParentID: mock.parent_id.toString(),
          FirstName: mock.first_name,
          LastName: mock.last_name,
          RelationshipType: mock.relationship,
          PhoneNumber: mock.phone,
          Email: mock.email,
          Address: `Address for ${mock.first_name} ${mock.last_name}`,
          LearnerIDs: mock.learner_ids.map(id => id.toString()),
          IsPrimaryContact: true
        }));
      }
    );

    // Transform real API data to match our interface
    return rawData.map((parent: any) => ({
      ParentID: parent.id?.toString() || parent.ParentID,
      FirstName: parent.first_name || parent.FirstName,
      LastName: parent.last_name || parent.LastName,
      RelationshipType: parent.relationship_type || parent.relationship || parent.RelationshipType || 'Guardian',
      PhoneNumber: parent.mobile_number || parent.phone_number || parent.PhoneNumber || '',
      Email: parent.email_address || parent.email || parent.Email || '',
      Address: parent.address || parent.Address || `${parent.first_name} ${parent.last_name} Address`,
      LearnerIDs: parent.learner_ids || parent.LearnerIDs || [],
      IsPrimaryContact: parent.is_primary_contact !== false, // Default to primary unless explicitly false
      // Additional fields from D6
      IdNumber: parent.id_number,
      WorkPhone: parent.work_number,
      HomePhone: parent.home_number,
      Employer: parent.employer,
      Occupation: parent.occupation,
      Title: parent.title,
      Gender: parent.gender
    }));
  }

  /**
   * 📊 Get marks for a learner
   */
  public async getMarks(learnerId: number, options: { term?: number; year?: number } = {}): Promise<D6Mark[]> {
    return this.hybridRequest<D6Mark[]>(
      `v2/currplus/learnersubjects`,
      { params: { learner_id: learnerId, ...options } },
      () => {
        const mockMarks = d6MockData.getMarks(learnerId, options);
        return mockMarks.map(mock => ({
          LearnerID: mock.learner_id.toString(),
          SubjectID: mock.subject_code,
          Term: mock.term,
          AcademicYear: mock.year,
          MarkValue: mock.mark_value,
          TotalMarks: 100,
          MarkType: mock.mark_type,
          AssessmentDate: mock.assessment_date,
          RecordedDate: mock.assessment_date
        }));
      }
    );
  }

  /**
   * 📋 Get lookup data (genders, grades, languages, etc.)
   */
  public async getLookupData(type: string): Promise<D6LookupItem[]> {
    return this.hybridRequest<D6LookupItem[]>(
      `/adminplus/lookup/${type}`,
      {},
      () => {
        const mockLookup = d6MockData.getLookupData(type);
        return mockLookup.map(item => ({
          id: item.id,
          name: item.name
        }));
      }
    );
  }

  /**
   * 🏥 Health check with comprehensive API status
   */
  public async healthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    apis: D6ApiClientInfo;
    response_time_ms: number;
    timestamp: string;
    mock_data_available: boolean;
  }> {
    const startTime = Date.now();
    
    try {
      // Test with a simple lookup
      await this.getLookupData('genders');
      
      const responseTime = Date.now() - startTime;
      const hasApiAccess = this.clientInfo.v1Available || this.clientInfo.v2Available;
      
      return {
        status: hasApiAccess ? 'healthy' : (this.config.enableMockData ? 'degraded' : 'unhealthy'),
        apis: this.clientInfo,
        response_time_ms: responseTime,
        timestamp: new Date().toISOString(),
        mock_data_available: this.config.enableMockData
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      
      return {
        status: this.config.enableMockData ? 'degraded' : 'unhealthy',
        apis: this.clientInfo,
        response_time_ms: responseTime,
        timestamp: new Date().toISOString(),
        mock_data_available: this.config.enableMockData
      };
    }
  }

  /**
   * 🎯 Get client info and configuration
   */
  public getClientInfo(): D6ApiClientInfo & { 
    config: Omit<D6ApiServiceConfig, 'password'>;
    cache_stats?: any;
  } {
    return {
      ...this.clientInfo,
      config: {
        baseUrl: this.config.baseUrl,
        username: this.config.username,
        timeout: this.config.timeout,
        retryAttempts: this.config.retryAttempts,
        retryDelay: this.config.retryDelay,
        enableMockData: this.config.enableMockData,
        useMockDataFirst: this.config.useMockDataFirst
      }
    };
  }

  /**
   * 🎭 Enable/disable sandbox mode dynamically
   */
  public setSandboxMode(enabled: boolean): void {
    this.config.useMockDataFirst = enabled;
    this.clientInfo.mode = enabled ? 'sandbox' : 
      (this.clientInfo.v1Available || this.clientInfo.v2Available) ? 'production' : 'hybrid';
    
    logger.info('Sandbox mode updated', { 
      enabled, 
      mode: this.clientInfo.mode 
    });
  }

  /**
   * 🧹 Clear cache for fresh data
   */
  public async clearCache(): Promise<void> {
    await this.cache?.deletePattern('d6:*');
    logger.info('D6 API cache cleared');
  }
}

// Initialize and export
export const initializeD6ApiHybrid = (): D6ApiServiceHybrid => {
  const config: D6ApiServiceConfig = {
    baseUrl: process.env.D6_API_BASE_URL || 'https://integrate.d6plus.co.za/api/v2',
    username: process.env.D6_API_USERNAME || '',
    password: process.env.D6_API_PASSWORD || '',
    timeout: parseInt(process.env.D6_REQUEST_TIMEOUT || '30000'),
    retryAttempts: 3,
    retryDelay: 1000,
    enableMockData: process.env.NODE_ENV === 'development',
    useMockDataFirst: process.env.D6_SANDBOX_MODE === 'true',
  };

  if (!config.username || !config.password) {
    throw new Error('Missing required D6 API configuration');
  }

  return D6ApiServiceHybrid.getInstance(config);
};

export const d6ApiHybrid = D6ApiServiceHybrid; 