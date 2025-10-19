/**
 * Centralized logging service for the extension
 * Provides consistent logging with levels and context
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  level: LogLevel;
  message: string;
  context?: string;
  timestamp: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data?: any;
}

class Logger {
  private readonly enabledLevels: Set<LogLevel>;
  private readonly logHistory: LogEntry[] = [];
  private readonly maxHistorySize = 100;

  constructor(enabledLevels: LogLevel[] = ['info', 'warn', 'error']) {
    this.enabledLevels = new Set(enabledLevels);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private log(level: LogLevel, message: string, context?: string, data?: any): void {
    if (!this.enabledLevels.has(level)) {
      return;
    }

    const entry: LogEntry = {
      level,
      message,
      context,
      timestamp: Date.now(),
      data,
    };

    // Add to history
    this.logHistory.push(entry);
    if (this.logHistory.length > this.maxHistorySize) {
      this.logHistory.shift();
    }

    // Format message with context
    const prefix = context ? `[${context}]` : '';
    const formattedMessage = `${prefix} ${message}`;

    // Log to console with appropriate method
    switch (level) {
      case 'debug':
        console.log(`[DEBUG] ${formattedMessage}`, data || '');
        break;
      case 'info':
        console.info(`[INFO] ${formattedMessage}`, data || '');
        break;
      case 'warn':
        console.warn(`[WARN] ${formattedMessage}`, data || '');
        break;
      case 'error':
        console.error(`[ERROR] ${formattedMessage}`, data || '');
        break;
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  debug(message: string, context?: string, data?: any): void {
    this.log('debug', message, context, data);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  info(message: string, context?: string, data?: any): void {
    this.log('info', message, context, data);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  warn(message: string, context?: string, data?: any): void {
    this.log('warn', message, context, data);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  error(message: string, context?: string, data?: any): void {
    this.log('error', message, context, data);
  }

  /**
   * Get recent log history
   */
  getHistory(level?: LogLevel, limit: number = 50): LogEntry[] {
    let history = this.logHistory;

    if (level) {
      history = history.filter((entry) => entry.level === level);
    }

    return history.slice(-limit);
  }

  /**
   * Clear log history
   */
  clearHistory(): void {
    this.logHistory.length = 0;
  }

  /**
   * Enable additional log levels
   */
  enableLevel(level: LogLevel): void {
    this.enabledLevels.add(level);
  }

  /**
   * Disable log levels
   */
  disableLevel(level: LogLevel): void {
    this.enabledLevels.delete(level);
  }
}

// Export singleton instance
// In development, include debug logs
const isDevelopment = process.env.NODE_ENV === 'development';
const enabledLevels: LogLevel[] = isDevelopment
  ? ['debug', 'info', 'warn', 'error']
  : ['info', 'warn', 'error'];

export const logger = new Logger(enabledLevels);
