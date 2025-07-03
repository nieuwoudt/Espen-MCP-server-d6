// 🏫 D6 API Service v2 - Based on Official D6 Integration Documentation
import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { logger } from '../utils/logger.js';
import { CacheService } from './cacheService.js';

export interface D6ApiServiceConfig {
  baseUrl: string;
  username: string;
  password: string;
  timeout: number;
  retryAttempts: number;
  retryDelay: number;
}

export interface D6ClientIntegration {
  school_login_id: string;
  school_name: string;
  admin_email_address: string;
  telephone_calling_code: string;
  telephone_number: string;
  api_type_id: string;
  api_type: string;
  activated_by_integrator: string;
}

export interface D6Learner {
  learner_id: number;
  first_name: string;
  last_name: string;
  gender: string;
  grade: string;
  debtor_code: string;
  parent1_id: number;
  parent2_id: number;
  accountable_person_id: number;
}

export interface D6PaginatedResponse<T> {
  data: T[];
  meta: {
    limit: number;
    max_allowed_limit: number;
    next_cursor?: string;
  };
}

export interface D6ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  timestamp: string;
  cached?: boolean;
}

export interface D6ErrorResponse {
  success: false;
  message: string;
  validation_errors?: Record<string, string>;
}

export class D6ApiServiceV2 {
  private static instance: D6ApiServiceV2;
  private client: AxiosInstance;
  private config: D6ApiServiceConfig;
  private cache?: CacheService;

  private constructor(config: D6ApiServiceConfig) {
    this.config = config;
    
    // Create axios client with correct D6 base URL
    this.client = axios.create({
      baseURL: config.baseUrl,
      timeout: config.timeout,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Espen-D6-MCP-Server/1.0.0',
        // D6 Authentication Headers
        'HTTP-X-USERNAME': config.username,
        'HTTP-X-PASSWORD': config.password,
      },
    });

    // Setup interceptors
    this.setupInterceptors();
  }

  public static getInstance(config?: D6ApiServiceConfig): D6ApiServiceV2 {
    if (!D6ApiServiceV2.instance) {
      if (!config) {
        throw new Error('D6 API configuration required for first initialization');
      }
      D6ApiServiceV2.instance = new D6ApiServiceV2(config);
    }
    return D6ApiServiceV2.instance;
  }

  /**
   * Set cache service for caching API responses
   */
  public setCache(cacheService: CacheService): void {
    this.cache = cacheService;
  }

  /**
   * Setup axios interceptors for error handling and logging
   */
  private setupInterceptors(): void {
    // Request interceptor for logging
    this.client.interceptors.request.use(
      (config) => {
        logger.debug('D6 API Request', {
          method: config.method?.toUpperCase(),
          url: config.url,
          headers: {
            ...config.headers,
            'HTTP-X-PASSWORD': '[HIDDEN]' // Hide password in logs
          },
        });
        return config;
      },
      (error) => {
        logger.error('D6 API Request Error', {
          error: error.message,
        });
        return Promise.reject(error);
      }
    );

    // Response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => {
        logger.debug('D6 API Response', {
          status: response.status,
          url: response.config.url,
          dataSize: JSON.stringify(response.data).length,
        });
        return response;
      },
      async (error) => {
        logger.error('D6 API Response Error', {
          status: error.response?.status,
          statusText: error.response?.statusText,
          url: error.config?.url,
          error: error.message,
          responseData: error.response?.data,
        });

        return Promise.reject(error);
      }
    );
  }

  /**
   * Make authenticated API request with caching
   */
  private async makeRequest<T>(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH',
    endpoint: string,
    data?: any,
    options: {
      cache?: boolean;
      cacheTTL?: number;
      cacheKey?: string;
      params?: Record<string, any>;
      schoolId?: number;
    } = {}
  ): Promise<D6ApiResponse<T>> {
    const { cache = true, cacheTTL = 300, cacheKey, params, schoolId } = options;
    
    // Check cache first for GET requests
    if (method === 'GET' && cache && this.cache) {
      const key = cacheKey || CacheService.keys.d6Data(
        endpoint, 
        schoolId?.toString() || 'default', 
        params ? JSON.stringify(params) : undefined
      );
      
      const cached = await this.cache.get<D6ApiResponse<T>>(key);
      if (cached) {
        logger.debug('D6 API cache hit', { endpoint, cacheKey: key });
        return { ...cached, cached: true };
      }
    }

    try {
      const config: AxiosRequestConfig = {
        method,
        url: endpoint,
        params,
        headers: schoolId ? { 'HTTP-X-SCHOOLID': schoolId.toString() } : {},
      };

      if (data) {
        config.data = data;
      }

      const response: AxiosResponse = await this.client.request(config);
      
      const result: D6ApiResponse<T> = {
        success: true,
        data: response.data,
        timestamp: new Date().toISOString(),
        cached: false,
      };

      // Cache successful GET responses
      if (method === 'GET' && cache && this.cache) {
        const key = cacheKey || CacheService.keys.d6Data(
          endpoint, 
          schoolId?.toString() || 'default', 
          params ? JSON.stringify(params) : undefined
        );
        
        await this.cache.set(key, result, cacheTTL);
        logger.debug('D6 API response cached', { endpoint, cacheKey: key, ttl: cacheTTL });
      }

      return result;
    } catch (error: any) {
      logger.error('D6 API request failed', {
        method,
        endpoint,
        error: error.message,
        status: error.response?.status,
        responseData: error.response?.data,
      });

      // Handle D6-specific error format
      if (error.response?.data) {
        const d6Error = error.response.data as D6ErrorResponse;
        return {
          success: false,
          error: d6Error.message || error.message,
          message: d6Error.message,
          timestamp: new Date().toISOString(),
          cached: false,
        };
      }

      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString(),
        cached: false,
      };
    }
  }

  // ====================
  // SETTINGS ENDPOINTS
  // ====================

  /**
   * Get client integrations (schools that have authorized our integration)
   */
  async getClientIntegrations(schoolId?: number): Promise<D6ApiResponse<D6ClientIntegration[]>> {
    const params = schoolId ? { school_id: schoolId } : {};
    
    return this.makeRequest<D6ClientIntegration[]>('GET', 'settings/clients', undefined, {
      params,
      cacheTTL: 3600, // 1 hour - this changes infrequently
    });
  }

  /**
   * Activate/deactivate integration for a specific school
   */
  async updateClientIntegrationState(
    schoolLoginId: string, 
    apiTypeId: string, 
    state: boolean
  ): Promise<D6ApiResponse<D6ClientIntegration>> {
    const data = {
      school_login_id: schoolLoginId,
      api_type_id: apiTypeId,
      state: state ? 1 : 0,
    };

    return this.makeRequest<D6ClientIntegration>('POST', 'settings/clients', data, {
      cache: false, // Don't cache state changes
    });
  }

  // ====================
  // LEARNER ENDPOINTS
  // ====================

  /**
   * Get all learners for a school (paginated)
   */
  async getLearners(
    schoolId: number,
    options: {
      cursor?: string;
      limit?: number;
      reverse_order?: boolean;
    } = {}
  ): Promise<D6ApiResponse<D6PaginatedResponse<D6Learner>>> {
    return this.makeRequest<D6PaginatedResponse<D6Learner>>('GET', 'learners', undefined, {
      params: options,
      schoolId,
      cacheTTL: 1800, // 30 minutes
    });
  }

  /**
   * Get specific learner by ID
   */
  async getLearnerById(schoolId: number, learnerId: number): Promise<D6ApiResponse<D6Learner>> {
    return this.makeRequest<D6Learner>('GET', `learners/${learnerId}`, undefined, {
      schoolId,
      cacheTTL: 900, // 15 minutes
    });
  }

  // ====================
  // FINANCE+ ENDPOINTS
  // ====================

  /**
   * Get learner financial information (debt management)
   */
  async getFinancialLearners(
    schoolId: number,
    options: {
      cursor?: string;
      limit?: number;
      reverse_order?: boolean;
    } = {}
  ): Promise<D6ApiResponse<D6PaginatedResponse<any>>> {
    return this.makeRequest<D6PaginatedResponse<any>>('GET', 'finplus/debtmanagement/learners', undefined, {
      params: options,
      schoolId,
      cacheTTL: 1800, // 30 minutes
    });
  }

  /**
   * Get specific learner financial information
   */
  async getFinancialLearnerById(schoolId: number, learnerId: number): Promise<D6ApiResponse<any>> {
    return this.makeRequest<any>('GET', `finplus/debtmanagement/learners/${learnerId}`, undefined, {
      schoolId,
      cacheTTL: 900, // 15 minutes
    });
  }

  /**
   * Get accountable persons (school debtors)
   */
  async getAccountablePersons(
    schoolId: number,
    options: {
      cursor?: string;
      limit?: number;
      reverse_order?: boolean;
    } = {}
  ): Promise<D6ApiResponse<D6PaginatedResponse<any>>> {
    return this.makeRequest<D6PaginatedResponse<any>>('GET', 'finplus/debtmanagement/accountablepersons', undefined, {
      params: options,
      schoolId,
      cacheTTL: 1800, // 30 minutes
    });
  }

  // ====================
  // HEALTH & DIAGNOSTICS
  // ====================

  /**
   * Test D6 API connectivity by getting client integrations
   */
  async testConnection(): Promise<{
    connected: boolean;
    responseTime: number;
    authenticatedSchools?: number;
    error?: string;
  }> {
    const startTime = Date.now();
    
    try {
      const response = await this.getClientIntegrations();

      return {
        connected: response.success,
        responseTime: Date.now() - startTime,
        authenticatedSchools: Array.isArray(response.data) ? response.data.length : 0,
        error: response.error,
      };
    } catch (error: any) {
      return {
        connected: false,
        responseTime: Date.now() - startTime,
        error: error.message,
      };
    }
  }

  /**
   * Get API health and authentication status
   */
  async getHealthInfo(): Promise<{
    connected: boolean;
    responseTime: number;
    authenticated: boolean;
    authorizedSchools: number;
    lastError?: string;
  }> {
    const startTime = Date.now();
    
    try {
      const connectionTest = await this.testConnection();

      return {
        connected: connectionTest.connected,
        responseTime: Date.now() - startTime,
        authenticated: connectionTest.connected, // If we can get client integrations, we're authenticated
        authorizedSchools: connectionTest.authenticatedSchools || 0,
        lastError: connectionTest.error,
      };
    } catch (error: any) {
      return {
        connected: false,
        responseTime: Date.now() - startTime,
        authenticated: false,
        authorizedSchools: 0,
        lastError: error.message,
      };
    }
  }
}

// Initialize and export D6 API service
export const initializeD6ApiV2 = (): D6ApiServiceV2 => {
  const config: D6ApiServiceConfig = {
    baseUrl: process.env.D6_API_BASE_URL || 'https://integrate.d6plus.co.za/api/v2',
    username: process.env.D6_API_USERNAME || '',
    password: process.env.D6_API_PASSWORD || '',
    timeout: parseInt(process.env.D6_REQUEST_TIMEOUT || '30000'),
    retryAttempts: 3,
    retryDelay: 1000,
  };

  if (!config.username || !config.password) {
    throw new Error('Missing required D6 API configuration. Please check D6_API_USERNAME and D6_API_PASSWORD environment variables.');
  }

  return D6ApiServiceV2.getInstance(config);
};

// Export the D6 API instance
export const d6ApiV2 = D6ApiServiceV2; 