// utils/logger.js
import fs from 'fs';
import path from 'path';
import { format } from 'date-fns';

class Logger {
  constructor() {
    this.isProduction = process.env.NODE_ENV === 'production';
  }

  formatMessage(level, message, data = null) {
    const timestamp = new Date().toISOString();
    const logObject = {
      timestamp,
      level,
      message,
      data: data || {},
    };

    return JSON.stringify(logObject);
  }

  async writeLog(level, message, data = null) {
    const logMessage = this.formatMessage(level, message, data);

    if (this.isProduction) {
      // In production (Vercel), just use console methods
      // These will be captured by Vercel's logging system
      switch (level) {
        case 'ERROR':
          console.error(logMessage);
          break;
        case 'WARNING':
          console.warn(logMessage);
          break;
        default:
          console.log(logMessage);
      }
    } else {
      // In development, you can still use console or implement file-based logging
      console.log(logMessage);
    }
  }

  async info(message, data = null) {
    await this.writeLog('INFO', message, data);
  }

  async error(message, data = null) {
    await this.writeLog('ERROR', message, data);
  }

  async warning(message, data = null) {
    await this.writeLog('WARNING', message, data);
  }

  async transaction(message, data = null) {
    await this.writeLog('TRANSACTION', message, data);
  }
}

export const logger = new Logger();
