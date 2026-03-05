/**
 * Unit Tests: Logger Utilities
 * Phase: 19-03 Task 2
 * Target: src/lib/logger.ts
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Logger, logError, networkLogger } from '@/lib/logger';

describe('Logger class', () => {
  let consoleDebugSpy: ReturnType<typeof vi.spyOn>;
  let consoleInfoSpy: ReturnType<typeof vi.spyOn>;
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    consoleDebugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});
    consoleInfoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  describe('constructor', () => {
    it('creates instance with defaults', () => {
      const logger = new Logger();
      expect(logger).toBeInstanceOf(Logger);
    });

    it('accepts custom level and context', () => {
      const logger = new Logger({ level: 'warn', context: 'MyCtx' });
      expect(logger).toBeInstanceOf(Logger);
    });
  });

  describe('log level filtering', () => {
    it('debug logs when level is debug', () => {
      const logger = new Logger({ level: 'debug' });
      logger.debug('debug msg');
      expect(consoleDebugSpy).toHaveBeenCalledWith(expect.stringMatching(/\[DEBUG\] debug msg/));
    });

    it('debug does not log when level is above debug', () => {
      const logger = new Logger({ level: 'info' });
      logger.debug('should not log');
      expect(consoleDebugSpy).not.toHaveBeenCalled();
    });

    it('info logs when level is info or lower', () => {
      const logger = new Logger({ level: 'info' });
      logger.info('info msg');
      expect(consoleInfoSpy).toHaveBeenCalledWith(expect.stringMatching(/\[INFO\] info msg/));
    });

    it('info does not log when level is above info', () => {
      const logger = new Logger({ level: 'warn' });
      logger.info('should not log');
      expect(consoleInfoSpy).not.toHaveBeenCalled();
    });

    it('warn logs when level is warn or lower', () => {
      const logger = new Logger({ level: 'warn' });
      logger.warn('warn msg');
      expect(consoleWarnSpy).toHaveBeenCalledWith(expect.stringMatching(/\[WARN\] warn msg/));
    });

    it('warn does not log when level is above warn', () => {
      const logger = new Logger({ level: 'error' });
      logger.warn('should not log');
      expect(consoleWarnSpy).not.toHaveBeenCalled();
    });

    it('error logs when level is error or lower', () => {
      const logger = new Logger({ level: 'error' });
      logger.error('error msg');
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringMatching(/\[ERROR\] error msg/));
    });
  });

  describe('formatting', () => {
    it('formats message with timestamp, level, and message', () => {
      const logger = new Logger({ level: 'debug' });
      logger.debug('test message');
      const formatted = consoleDebugSpy.mock.calls[0][0];
      expect(formatted).toMatch(/^\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/); // starts with [timestamp]
      expect(formatted).toContain('[DEBUG]');
      expect(formatted).toContain('test message');
    });

    it('includes context when provided', () => {
      const logger = new Logger({ level: 'debug', context: 'Auth' });
      logger.info('something');
      const formatted = consoleInfoSpy.mock.calls[0][0];
      expect(formatted).toContain('[Auth]');
    });

    it('does not include context when not provided', () => {
      const logger = new Logger({ level: 'debug' });
      logger.warn('msg');
      const formatted = consoleWarnSpy.mock.calls[0][0];
      expect(formatted).toMatch(/^\[.*\] \[WARN\] msg$/);
    });
  });

  describe('additional args', () => {
    it('forwards extra args to console', () => {
      const logger = new Logger({ level: 'debug' });
      logger.info('msg', { data: 123 }, 456);
      const [firstArg, second, third] = consoleInfoSpy.mock.calls[0];
      expect(firstArg).toContain('msg');
      expect(second).toEqual({ data: 123 });
      expect(third).toBe(456);
    });
  });
});

describe('logError function', () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('logs Error instance with message, stack, and optional info', () => {
    const error = new Error('Oops');
    error.stack = 'Error:Oops\n    at fn';
    logError('Ctx', error, { userId: 'u' });
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringMatching(/^\[.*\] \[ERROR\] \[Ctx\] Oops/),
      expect.stringContaining('Error:Oops'),
      { userId: 'u' }
    );
  });

  it('logs non-Error values', () => {
    logError('Ctx', 'string error');
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringMatching(/^\[.*\] \[ERROR\] \[Ctx\]/),
      'string error',
      undefined
    );
  });

  it('logs non-Error objects', () => {
    const obj = { code: 500, message: 'Fail' };
    logError('Ctx', obj);
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringMatching(/^\[.*\] \[ERROR\] \[Ctx\]/),
      obj,
      undefined
    );
  });

  it('handles Error without stack', () => {
    const error = new Error('NoStack');
    Object.defineProperty(error, 'stack', { value: undefined });
    logError('Ctx', error);
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.any(String),
      undefined,
      undefined
    );
  });
});

describe('networkLogger', () => {
  it('has all methods', () => {
    expect(typeof networkLogger.debug).toBe('function');
    expect(typeof networkLogger.info).toBe('function');
    expect(typeof networkLogger.warn).toBe('function');
    expect(typeof networkLogger.error).toBe('function');
  });

  it('methods can be called without throwing', () => {
    expect(() => networkLogger.debug('test')).not.toThrow();
    expect(() => networkLogger.info('test')).not.toThrow();
    expect(() => networkLogger.warn('test')).not.toThrow();
    expect(() => networkLogger.error('test')).not.toThrow();
  });
});
