// 🏫 D6 API Service
import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { logger } from '../utils/logger.js';
import { CacheService } from './cacheService.js';
import { 
  D6Learner, 
  D6Mark, 
  D6Attendance, 
  D6Staff, 
  D6Subject, 
  D6Class,
  D6ApiResponse,
  D6ApiConfig,
  D6SyncOptions 
} from '../types/d6.js';

export interface D6ApiServiceConfig {
  baseUrl: string;
  username: string;
  password: string;
  timeout: number;
  retryAttempts: number;
  retryDelay: number;
}

export class D6ApiService {
  private static instance: D6ApiService;
  private client: AxiosInstance;
  private config: D6ApiServiceConfig;
  private cache?: CacheService;
  private authToken?: string;
  private tokenExpiry?: Date;

  private constructor(config: D6ApiServiceConfig) {
    this.config = config;
    
    // Create axios client
    this.client = axios.create({
      baseURL: config.baseUrl,
      timeout: config.timeout,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Espen-D6-MCP-Server/1.0.0',
      },
    });

    // Setup interceptors
    this.setupInterceptors();
  }

  public static getInstance(config?: D6ApiServiceConfig): D6ApiService {
    if (!D6ApiService.instance) {
      if (!config) {
        throw new Error('D6 API configuration required for first initialization');
      }
      D6ApiService.instance = new D6ApiService(config);
    }
    return D6ApiService.instance;
  }

  /**
   * Set cache service for caching API responses
   */
  public setCache(cacheService: CacheService): void {
    this.cache = cacheService;
  }

  /**
   * Setup axios interceptors for authentication and error handling
   */
  private setupInterceptors(): void {
    // Request interceptor for authentication
    this.client.interceptors.request.use(
      async (config) => {
        // Ensure we have a valid auth token
        await this.ensureAuthenticated();
        
        if (this.authToken) {
          config.headers.Authorization = `Bearer ${this.authToken}`;
        }

        logger.debug('D6 API Request', {
          method: config.method?.toUpperCase(),
          url: config.url,
          params: config.params,
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
        });

        // Handle 401 errors by refreshing token
        if (error.response?.status === 401) {
          logger.info('D6 API token expired, refreshing...');
          this.authToken = undefined;
          this.tokenExpiry = undefined;
          
          // Retry the request once with new token
          if (!error.config._retry) {
            error.config._retry = true;
            await this.ensureAuthenticated();
            return this.client.request(error.config);
          }
        }

        return Promise.reject(error);
      }
    );
  }

  /**
   * Authenticate with D6 API and get access token
   */
  private async authenticate(): Promise<void> {
    try {
      logger.info('Authenticating with D6 API...');
      
      const response = await axios.post(`${this.config.baseUrl}/auth/login`, {
        username: this.config.username,
        password: this.config.password,
      }, {
        timeout: this.config.timeout,
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.data.success && response.data.token) {
        this.authToken = response.data.token;
        // Token typically expires in 24 hours
        this.tokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);
        
        logger.info('D6 API authentication successful', {
          expiresAt: this.tokenExpiry.toISOString(),
        });
      } else {
        throw new Error('Authentication failed: Invalid response format');
      }
    } catch (error: any) {
      logger.error('D6 API authentication failed', {
        error: error.message,
        status: error.response?.status,
      });
      throw new Error(`D6 API authentication failed: ${error.message}`);
    }
  }

  /**
   * Ensure we have a valid authentication token
   */
  private async ensureAuthenticated(): Promise<void> {
    if (!this.authToken || !this.tokenExpiry || new Date() >= this.tokenExpiry) {
      await this.authenticate();
    }
  }

  /**
   * Make authenticated API request with caching
   */
  private async makeRequest<T>(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    endpoint: string,
    data?: any,
    options: {
      cache?: boolean;
      cacheTTL?: number;
      cacheKey?: string;
      params?: Record<string, any>;
    } = {}
  ): Promise<D6ApiResponse<T>> {
    const { cache = true, cacheTTL = 300, cacheKey, params } = options;
    
    // Check cache first for GET requests
    if (method === 'GET' && cache && this.cache) {
      const key = cacheKey || CacheService.keys.d6Data(
        endpoint, 
        'default', 
        params ? JSON.stringify(params) : undefined
      );
      
      const cached = await this.cache.get<D6ApiResponse<T>>(key);
      if (cached) {
        logger.debug('D6 API cache hit', { endpoint, cacheKey: key });
        return cached;
      }
    }

    try {
      const config: AxiosRequestConfig = {
        method,
        url: endpoint,
        params,
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
          'default', 
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
      });

      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString(),
        cached: false,
      };
    }
  }

  // ====================
  // LEARNER ENDPOINTS
  // ====================

  /**
   * Get all learners
   */
  async getLearners(options: D6SyncOptions = {}): Promise<D6ApiResponse<D6Learner[]>> {
    const params: Record<string, any> = {};
    
    if (options.grade) params.grade = options.grade;
    if (options.class) params.class = options.class;
    if (options.limit) params.limit = options.limit;
    if (options.offset) params.offset = options.offset;

    return this.makeRequest<D6Learner[]>('GET', '/learners', undefined, {
      params,
      cacheTTL: 1800, // 30 minutes
    });
  }

  /**
   * Get learner by ID
   */
  async getLearnerById(learnerId: string): Promise<D6ApiResponse<D6Learner>> {
    return this.makeRequest<D6Learner>('GET', `/learners/${learnerId}`, undefined, {
      cacheTTL: 900, // 15 minutes
    });
  }

  /**
   * Get learner marks
   */
  async getLearnerMarks(
    learnerId: string, 
    options: { term?: number; subject?: string } = {}
  ): Promise<D6ApiResponse<D6Mark[]>> {
    const params: Record<string, any> = {};
    if (options.term) params.term = options.term;
    if (options.subject) params.subject = options.subject;

    return this.makeRequest<D6Mark[]>('GET', `/learners/${learnerId}/marks`, undefined, {
      params,
      cacheTTL: 600, // 10 minutes
    });
  }

  /**
   * Get learner attendance
   */
  async getLearnerAttendance(
    learnerId: string,
    options: { startDate?: string; endDate?: string } = {}
  ): Promise<D6ApiResponse<D6Attendance[]>> {
    const params: Record<string, any> = {};
    if (options.startDate) params.start_date = options.startDate;
    if (options.endDate) params.end_date = options.endDate;

    return this.makeRequest<D6Attendance[]>('GET', `/learners/${learnerId}/attendance`, undefined, {
      params,
      cacheTTL: 300, // 5 minutes
    });
  }

  // ====================
  // STAFF ENDPOINTS
  // ====================

  /**
   * Get all staff members
   */
  async getStaff(options: { department?: string } = {}): Promise<D6ApiResponse<D6Staff[]>> {
    const params: Record<string, any> = {};
    if (options.department) params.department = options.department;

    return this.makeRequest<D6Staff[]>('GET', '/staff', undefined, {
      params,
      cacheTTL: 3600, // 1 hour
    });
  }

  /**
   * Get staff member by ID
   */
  async getStaffById(staffId: string): Promise<D6ApiResponse<D6Staff>> {
    return this.makeRequest<D6Staff>('GET', `/staff/${staffId}`, undefined, {
      cacheTTL: 1800, // 30 minutes
    });
  }

  // ====================
  // SUBJECT & CLASS ENDPOINTS
  // ====================

  /**
   * Get all subjects
   */
  async getSubjects(): Promise<D6ApiResponse<D6Subject[]>> {
    return this.makeRequest<D6Subject[]>('GET', '/subjects', undefined, {
      cacheTTL: 7200, // 2 hours
    });
  }

  /**
   * Get all classes
   */
  async getClasses(options: { grade?: number } = {}): Promise<D6ApiResponse<D6Class[]>> {
    const params: Record<string, any> = {};
    if (options.grade) params.grade = options.grade;

    return this.makeRequest<D6Class[]>('GET', '/classes', undefined, {
      params,
      cacheTTL: 3600, // 1 hour
    });
  }

  // ====================
  // HEALTH & DIAGNOSTICS
  // ====================

  /**
   * Test D6 API connectivity
   */
  async testConnection(): Promise<{
    connected: boolean;
    responseTime: number;
    version?: string;
    error?: string;
  }> {
    const startTime = Date.now();
    
    try {
      const response = await this.makeRequest<{ version: string }>('GET', '/health', undefined, {
        cache: false,
      });

      return {
        connected: response.success,
        responseTime: Date.now() - startTime,
        version: response.data?.version,
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
   * Get API health and statistics
   */
  async getHealthInfo(): Promise<{
    connected: boolean;
    responseTime: number;
    authenticated: boolean;
    tokenExpiry?: string;
    lastError?: string;
  }> {
    const startTime = Date.now();
    
    try {
      await this.ensureAuthenticated();
      const connectionTest = await this.testConnection();

      return {
        connected: connectionTest.connected,
        responseTime: Date.now() - startTime,
        authenticated: !!this.authToken,
        tokenExpiry: this.tokenExpiry?.toISOString(),
      };
    } catch (error: any) {
      return {
        connected: false,
        responseTime: Date.now() - startTime,
        authenticated: false,
        lastError: error.message,
      };
    }
  }
}

// Initialize and export D6 API service
export const initializeD6Api = (): D6ApiService => {
  const config: D6ApiServiceConfig = {
    baseUrl: process.env.D6_API_BASE_URL || '',
    username: process.env.D6_API_USERNAME || '',
    password: process.env.D6_API_PASSWORD || '',
    timeout: parseInt(process.env.D6_REQUEST_TIMEOUT || '30000'),
    retryAttempts: 3,
    retryDelay: 1000,
  };

  if (!config.baseUrl || !config.username || !config.password) {
    throw new Error('Missing required D6 API configuration. Please check your environment variables.');
  }

  return D6ApiService.getInstance(config);
};

// Export the D6 API instance
export const d6Api = D6ApiService; 