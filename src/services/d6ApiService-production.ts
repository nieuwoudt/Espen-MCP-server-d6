// 🏫 D6 API Service - Production Implementation
// Using the working D6 API endpoints we discovered
import axios, { AxiosInstance } from 'axios';
import { CacheService } from './cacheService.js';

export interface D6School {
  school_login_id: string;
  school_name: string;
  admin_email_address: string;
  telephone_calling_code: string;
  telephone_number: string;
  api_type_id: string;
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
}

export class D6ApiServiceProduction {
  private static instance: D6ApiServiceProduction;
  private client: AxiosInstance;
  private config: Required<D6ApiServiceConfig>;
  private cache?: CacheService;

  private constructor(config: D6ApiServiceConfig) {
    this.config = {
      timeout: 10000,
      ...config
    };

    this.client = axios.create({
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
  }

  public static getInstance(config?: D6ApiServiceConfig): D6ApiServiceProduction {
    if (!D6ApiServiceProduction.instance) {
      if (!config) {
        throw new Error('D6 API configuration required for first initialization');
      }
      D6ApiServiceProduction.instance = new D6ApiServiceProduction(config);
    }
    return D6ApiServiceProduction.instance;
  }

  public setCache(cacheService: CacheService): void {
    this.cache = cacheService;
  }

  private setupInterceptors(): void {
    this.client.interceptors.request.use(
      (config) => {
        // Log to stderr to avoid interfering with MCP JSON responses
        process.stderr.write(`[D6] API Request: ${config.method?.toUpperCase()} ${config.url}\n`);
        return config;
      },
      (error) => {
        process.stderr.write(`[D6] Request Error: ${error.message}\n`);
        return Promise.reject(error);
      }
    );

    this.client.interceptors.response.use(
      (response) => {
        process.stderr.write(`[D6] API Response: ${response.status} ${response.config.url}\n`);
        return response;
      },
      (error) => {
        process.stderr.write(`[D6] Response Error: ${error.response?.status} ${error.config?.url} - ${error.message}\n`);
        return Promise.reject(error);
      }
    );
  }

  /**
   * Get school/client information
   * Working endpoint: settings/clients
   */
  public async getSchools(): Promise<D6School[]> {
    const cacheKey = 'schools';
    
    // Check cache first
    if (this.cache) {
      const cached = await this.cache.get(cacheKey);
      if (cached) {
        return cached;
      }
    }

    try {
      const response = await this.client.get('settings/clients');
      const schools = response.data as D6School[];
      
      // Cache the result
      if (this.cache) {
        await this.cache.set(cacheKey, schools, 300); // 5 minutes
      }
      
      return schools;
    } catch (error: any) {
      throw new Error(`Failed to get schools: ${error.message}`);
    }
  }

  /**
   * Get lookup data for genders
   * Working endpoint: adminplus/lookup/genders
   */
  public async getLookupData(type: string = 'genders'): Promise<D6LookupItem[]> {
    const cacheKey = `lookup_${type}`;
    
    // Check cache first
    if (this.cache) {
      const cached = await this.cache.get(cacheKey);
      if (cached) {
        return cached;
      }
    }

    try {
      // Only genders is confirmed to work
      if (type !== 'genders') {
        throw new Error(`Lookup type '${type}' not available in current D6 integration`);
      }

      const response = await this.client.get(`adminplus/lookup/${type}`);
      const lookupData = response.data as D6LookupItem[];
      
      // Cache the result
      if (this.cache) {
        await this.cache.set(cacheKey, lookupData, 3600); // 1 hour
      }
      
      return lookupData;
    } catch (error: any) {
      throw new Error(`Failed to get lookup data for ${type}: ${error.message}`);
    }
  }

  /**
   * Get learners - Currently not available in D6 integration
   * Returns empty array with informative message
   */
  public async getLearners(schoolId?: string): Promise<any[]> {
    // Since learner endpoints are not available, return empty array
    // In a real implementation, we would try various endpoints or contact D6 support
    process.stderr.write('[D6] Learners endpoint not available in current integration\n');
    return [];
  }

  /**
   * Get staff - Currently not available in D6 integration
   * Returns empty array with informative message
   */
  public async getStaff(schoolId?: string): Promise<any[]> {
    // Since staff endpoints are not available, return empty array
    process.stderr.write('[D6] Staff endpoint not available in current integration\n');
    return [];
  }

  /**
   * Get parents - Currently not available in D6 integration
   * Returns empty array with informative message
   */
  public async getParents(schoolId?: string): Promise<any[]> {
    // Since parent endpoints are not available, return empty array
    process.stderr.write('[D6] Parents endpoint not available in current integration\n');
    return [];
  }

  /**
   * Get marks - Currently not available in D6 integration
   * Returns empty array with informative message
   */
  public async getMarks(learnerId: string): Promise<any[]> {
    // Since marks endpoints are not available, return empty array
    process.stderr.write('[D6] Marks endpoint not available in current integration\n');
    return [];
  }

  /**
   * Health check for the D6 API
   */
  public async healthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    response_time_ms: number;
    timestamp: string;
    available_endpoints: string[];
    school_info?: D6School;
  }> {
    const startTime = Date.now();
    
    try {
      // Test the working endpoint
      const schools = await this.getSchools();
      const responseTime = Date.now() - startTime;
      
      return {
        status: 'healthy',
        response_time_ms: responseTime,
        timestamp: new Date().toISOString(),
        available_endpoints: ['settings/clients', 'adminplus/lookup/genders'],
        school_info: schools[0]
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      
      return {
        status: 'unhealthy',
        response_time_ms: responseTime,
        timestamp: new Date().toISOString(),
        available_endpoints: []
      };
    }
  }

  /**
   * Get integration information
   */
  public getIntegrationInfo(): {
    school_name: string;
    integration_id: string;
    api_type: string;
    activated: boolean;
    available_data: string[];
    limitations: string[];
  } {
    return {
      school_name: "d6 Integrate API Test School",
      integration_id: "1694",
      api_type: "d6 Integrate API",
      activated: false, // "activated_by_integrator": "No"
      available_data: ["school_info", "gender_lookup"],
      limitations: [
        "Learner data not available in current integration",
        "Staff data not available in current integration", 
        "Parent data not available in current integration",
        "Marks data not available in current integration",
        "Demo dataset may be limited - contact D6 support for full data access"
      ]
    };
  }
}

export const initializeD6ApiProduction = (): D6ApiServiceProduction => {
  const config = {
    baseUrl: process.env.D6_API_BASE_URL || 'https://integrate.d6plus.co.za/api/v1',
    username: process.env.D6_API_USERNAME || 'espenaitestapi',
    password: process.env.D6_API_PASSWORD || 'qUz3mPcRsfSWxKR9qEnm',
    timeout: parseInt(process.env.D6_REQUEST_TIMEOUT || '10000', 10),
  };

  return D6ApiServiceProduction.getInstance(config);
}; 