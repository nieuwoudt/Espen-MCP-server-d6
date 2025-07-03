// 📝 Logging Utility with Winston
import winston from 'winston';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Ensure logs directory exists
const logsDir = join(process.cwd(), 'logs');
if (!existsSync(logsDir)) {
  mkdirSync(logsDir, { recursive: true });
}

// Custom log format
const logFormat = winston.format.combine(
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss.SSS',
  }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    return JSON.stringify({
      timestamp,
      level: level.toUpperCase(),
      message,
      ...meta,
    });
  })
);

// Create logger instance
export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  defaultMeta: {
    service: 'espen-d6-mcp-server',
    version: '1.0.0',
  },
  transports: [
    // Console transport to stderr only (MCP requires stdout for JSON-RPC)
    new winston.transports.Console({
      stderrLevels: ['error', 'warn', 'info', 'debug'],
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(({ timestamp, level, message, ...meta }) => {
          const metaStr = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '';
          return `${timestamp} [${level}]: ${message} ${metaStr}`;
        })
      ),
    }),
    
    // File transport for all logs
    new winston.transports.File({
      filename: join(logsDir, 'combined.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    
    // Separate file for errors
    new winston.transports.File({
      filename: join(logsDir, 'error.log'),
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
  ],
});

// Add request ID to all logs in production
if (process.env.NODE_ENV === 'production') {
  logger.add(new winston.transports.File({
    filename: join(logsDir, 'app.log'),
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.json()
    ),
  }));
}

// Performance logging helper
export const performanceLogger = {
  start: (operation: string) => {
    const startTime = Date.now();
    return {
      end: (additional?: Record<string, any>) => {
        const duration = Date.now() - startTime;
        logger.info(`Performance: ${operation}`, {
          operation,
          duration_ms: duration,
          ...additional,
        });
        return duration;
      },
    };
  },
};

// Request logging helper
export const requestLogger = {
  logRequest: (method: string, url: string, statusCode: number, duration: number, meta?: Record<string, any>) => {
    const level = statusCode >= 400 ? 'error' : statusCode >= 300 ? 'warn' : 'info';
    logger[level]('HTTP Request', {
      method,
      url,
      statusCode,
      duration_ms: duration,
      ...meta,
    });
  },
};

// Error logging helper
export const errorLogger = {
  logError: (error: Error, context?: Record<string, any>) => {
    logger.error('Application Error', {
      error: error.message,
      stack: error.stack,
      ...context,
    });
  },
  
  logValidationError: (field: string, value: any, message: string) => {
    logger.warn('Validation Error', {
      type: 'validation',
      field,
      value,
      message,
    });
  },
  
  logDatabaseError: (operation: string, error: Error, query?: string) => {
    logger.error('Database Error', {
      type: 'database',
      operation,
      error: error.message,
      query: query?.substring(0, 200), // Truncate long queries
    });
  },
};

// D6 API logging helper
export const d6Logger = {
  logRequest: (endpoint: string, params?: Record<string, any>) => {
    logger.info('D6 API Request', {
      type: 'd6_request',
      endpoint,
      params,
    });
  },
  
  logResponse: (endpoint: string, statusCode: number, recordCount?: number, duration?: number) => {
    const level = statusCode >= 400 ? 'error' : 'info';
    logger[level]('D6 API Response', {
      type: 'd6_response',
      endpoint,
      statusCode,
      recordCount,
      duration_ms: duration,
    });
  },
  
  logSyncStart: (syncType: string, endpoint: string) => {
    logger.info('D6 Sync Started', {
      type: 'd6_sync',
      syncType,
      endpoint,
      status: 'started',
    });
  },
  
  logSyncComplete: (syncType: string, endpoint: string, stats: {
    processed: number;
    created: number;
    updated: number;
    failed: number;
    duration: number;
  }) => {
    logger.info('D6 Sync Completed', {
      type: 'd6_sync',
      syncType,
      endpoint,
      status: 'completed',
      ...stats,
    });
  },
  
  logSyncError: (syncType: string, endpoint: string, error: Error) => {
    logger.error('D6 Sync Failed', {
      type: 'd6_sync',
      syncType,
      endpoint,
      status: 'failed',
      error: error.message,
      stack: error.stack,
    });
  },
};

// Export logger as default
export default logger; 