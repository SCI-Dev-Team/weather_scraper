/**
 * Simple logging utility
 */

const LogLevel = {
  ERROR: 'ERROR',
  WARN: 'WARN',
  INFO: 'INFO',
  DEBUG: 'DEBUG',
};

class Logger {
  constructor(context = '') {
    this.context = context;
  }

  _log(level, message, ...args) {
    const timestamp = new Date().toISOString();
    const prefix = this.context ? `[${this.context}]` : '';
    console.log(`${timestamp} ${level} ${prefix}`, message, ...args);
  }

  error(message, ...args) {
    this._log(LogLevel.ERROR, `❌ ${message}`, ...args);
  }

  warn(message, ...args) {
    this._log(LogLevel.WARN, `⚠️  ${message}`, ...args);
  }

  info(message, ...args) {
    this._log(LogLevel.INFO, `ℹ️  ${message}`, ...args);
  }

  success(message, ...args) {
    this._log(LogLevel.INFO, `✅ ${message}`, ...args);
  }

  debug(message, ...args) {
    if (process.env.NODE_ENV === 'development') {
      this._log(LogLevel.DEBUG, `🐛 ${message}`, ...args);
    }
  }
}

export const createLogger = context => new Logger(context);
export const logger = new Logger();
