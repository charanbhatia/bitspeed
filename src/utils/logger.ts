type LogLevel = 'info' | 'warn' | 'error' | 'debug';

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  meta?: unknown;
}

class Logger {
  private formatEntry(level: LogLevel, message: string, meta?: unknown): LogEntry {
    return {
      level,
      message,
      timestamp: new Date().toISOString(),
      ...(meta !== undefined && { meta }),
    };
  }

  private write(entry: LogEntry): void {
    const output = JSON.stringify(entry);
    if (entry.level === 'error') {
      process.stderr.write(output + '\n');
    } else {
      process.stdout.write(output + '\n');
    }
  }

  info(message: string, meta?: unknown): void {
    this.write(this.formatEntry('info', message, meta));
  }

  warn(message: string, meta?: unknown): void {
    this.write(this.formatEntry('warn', message, meta));
  }

  error(message: string, meta?: unknown): void {
    this.write(this.formatEntry('error', message, meta));
  }

  debug(message: string, meta?: unknown): void {
    if (process.env['NODE_ENV'] === 'development') {
      this.write(this.formatEntry('debug', message, meta));
    }
  }
}

export const logger = new Logger();
