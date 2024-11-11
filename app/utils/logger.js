// utils/logger.js
import fs from 'fs';
import path from 'path';
import { format } from 'date-fns';

class Logger {
  constructor() {
    this.logDir = path.join(process.cwd(), 'logs');
    this.paymentLogFile = 'payment.log';
    this.ensureLogDirectoryExists();
  }

  ensureLogDirectoryExists() {
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir);
    }
  }

  formatMessage(level, message, data = null) {
    const timestamp = format(new Date(), 'yyyy-MM-dd HH:mm:ss');
    let logMessage = `[${timestamp}] [${level}] ${message}`;
    
    if (data) {
      logMessage += `\nData: ${JSON.stringify(data, null, 2)}`;
    }
    
    return logMessage + '\n' + '-'.repeat(80) + '\n';
  }

  async writeLog(level, message, data = null) {
    try {
      const logFile = path.join(this.logDir, this.paymentLogFile);
      const logMessage = this.formatMessage(level, message, data);
      
      await fs.promises.appendFile(logFile, logMessage, 'utf8');
    } catch (error) {
      console.error('Error writing to log file:', error);
    }
  }

  async info(message, data = null) {
    await this.writeLog('INFO', message, data);
    console.log(message, data); // Keep console.log for development
  }

  async error(message, data = null) {
    await this.writeLog('ERROR', message, data);
    console.error(message, data); // Keep console.error for development
  }

  async transaction(message, data = null) {
    await this.writeLog('TRANSACTION', message, data);
    console.log(message, data); // Keep console.log for development
  }
}

export const logger = new Logger();