/**
 * Centralized Logger Service
 * 
 * Provides structured logging with level hierarchy and environment-based configuration.
 * Production mode: suppresses debug logs, outputs structured JSON
 * Development mode: all logs, readable console format
 */

/**
 * Log levels in hierarchical order
 */
export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error'
}

/**
 * Structured log entry format
 */
export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: Record<string, any>;
}

/**
 * Logger configuration
 */
interface LoggerConfig {
  minLevel: LogLevel;
  isProduction: boolean;
}

/**
 * Centralized logger class
 * 
 * Implements structured logging with:
 * - Log level hierarchy (debug < info < warn < error)
 * - Environment-based configuration
 * - Structured JSON output in production
 * - Readable console output in development
 * - Context enrichment support
 */
class Logger {
  private config: LoggerConfig;
  private readonly levelOrder: LogLevel[] = [
    LogLevel.DEBUG,
    LogLevel.INFO,
    LogLevel.WARN,
    LogLevel.ERROR
  ];

  constructor() {
    const isProduction = process.env.NODE_ENV === 'production';
    
    this.config = {
      minLevel: isProduction ? LogLevel.INFO : LogLevel.DEBUG,
      isProduction
    };
  }

  /**
   * Check if a log level should be output based on minimum level
   */
  private shouldLog(level: LogLevel): boolean {
    const minIndex = this.levelOrder.indexOf(this.config.minLevel);
    const currentIndex = this.levelOrder.indexOf(level);
    
    return currentIndex >= minIndex;
  }

  /**
   * Format log entry with timestamp, level, message, and optional context
   */
  private formatLog(level: LogLevel, message: string, context?: Record<string, any>): LogEntry {
    return {
      timestamp: new Date().toISOString(),
      level,
      message,
      ...(context && { context })
    };
  }

  /**
   * Output log entry to console
   * Production: structured JSON for log aggregation
   * Development: readable format for debugging
   */
  private output(entry: LogEntry): void {
    if (this.config.isProduction) {
      // Production: structured JSON
      console.log(JSON.stringify(entry));
    } else {
      // Development: readable format
      const contextStr = entry.context ? ` ${JSON.stringify(entry.context)}` : '';
      console.log(`[${entry.timestamp}] ${entry.level.toUpperCase()}: ${entry.message}${contextStr}`);
    }
  }

  /**
   * Log debug message (development only)
   * 
   * @param message - Log message
   * @param context - Optional context object with additional metadata
   */
  debug(message: string, context?: Record<string, any>): void {
    if (this.shouldLog(LogLevel.DEBUG)) {
      this.output(this.formatLog(LogLevel.DEBUG, message, context));
    }
  }

  /**
   * Log info message
   * 
   * @param message - Log message
   * @param context - Optional context object with additional metadata
   */
  info(message: string, context?: Record<string, any>): void {
    if (this.shouldLog(LogLevel.INFO)) {
      this.output(this.formatLog(LogLevel.INFO, message, context));
    }
  }

  /**
   * Log warning message
   * 
   * @param message - Log message
   * @param context - Optional context object with additional metadata
   */
  warn(message: string, context?: Record<string, any>): void {
    if (this.shouldLog(LogLevel.WARN)) {
      this.output(this.formatLog(LogLevel.WARN, message, context));
    }
  }

  /**
   * Log error message
   * 
   * @param message - Log message
   * @param context - Optional context object with additional metadata (can include error, stack, etc.)
   */
  error(message: string, context?: Record<string, any>): void {
    if (this.shouldLog(LogLevel.ERROR)) {
      this.output(this.formatLog(LogLevel.ERROR, message, context));
    }
  }
}

/**
 * Singleton logger instance for application-wide use
 */
export const logger = new Logger();
