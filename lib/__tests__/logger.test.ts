/**
 * Unit tests for centralized logger service
 */

import { logger, LogLevel, LogEntry } from '../logger';

describe('Logger Service', () => {
  let consoleSpy: jest.SpyInstance;
  let originalEnv: string | undefined;

  beforeEach(() => {
    consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    originalEnv = process.env.NODE_ENV;
  });

  afterEach(() => {
    consoleSpy.mockRestore();
    process.env.NODE_ENV = originalEnv;
  });

  describe('Log level filtering', () => {
    test('should output debug logs in development mode', () => {
      process.env.NODE_ENV = 'development';
      // Need to re-import to get new instance with updated env
      jest.resetModules();
      const { logger: devLogger } = require('../logger');
      
      devLogger.debug('test debug message');
      
      expect(consoleSpy).toHaveBeenCalled();
      const output = consoleSpy.mock.calls[0][0];
      expect(output).toContain('DEBUG');
      expect(output).toContain('test debug message');
    });

    test('should NOT output debug logs in production mode', () => {
      process.env.NODE_ENV = 'production';
      jest.resetModules();
      const { logger: prodLogger } = require('../logger');
      
      prodLogger.debug('test debug message');
      
      expect(consoleSpy).not.toHaveBeenCalled();
    });

    test('should output info logs in production mode', () => {
      process.env.NODE_ENV = 'production';
      jest.resetModules();
      const { logger: prodLogger } = require('../logger');
      
      prodLogger.info('test info message');
      
      expect(consoleSpy).toHaveBeenCalled();
    });

    test('should output warn logs in production mode', () => {
      process.env.NODE_ENV = 'production';
      jest.resetModules();
      const { logger: prodLogger } = require('../logger');
      
      prodLogger.warn('test warning message');
      
      expect(consoleSpy).toHaveBeenCalled();
    });

    test('should output error logs in production mode', () => {
      process.env.NODE_ENV = 'production';
      jest.resetModules();
      const { logger: prodLogger } = require('../logger');
      
      prodLogger.error('test error message');
      
      expect(consoleSpy).toHaveBeenCalled();
    });
  });

  describe('Structured log format', () => {
    test('should output structured JSON in production mode', () => {
      process.env.NODE_ENV = 'production';
      jest.resetModules();
      const { logger: prodLogger } = require('../logger');
      
      prodLogger.info('test message', { userId: '123' });
      
      expect(consoleSpy).toHaveBeenCalled();
      const output = consoleSpy.mock.calls[0][0];
      
      // Should be valid JSON
      const parsed = JSON.parse(output);
      expect(parsed).toHaveProperty('timestamp');
      expect(parsed).toHaveProperty('level', 'info');
      expect(parsed).toHaveProperty('message', 'test message');
      expect(parsed).toHaveProperty('context');
      expect(parsed.context).toEqual({ userId: '123' });
    });

    test('should include ISO 8601 timestamp', () => {
      process.env.NODE_ENV = 'production';
      jest.resetModules();
      const { logger: prodLogger } = require('../logger');
      
      prodLogger.info('test message');
      
      const output = consoleSpy.mock.calls[0][0];
      const parsed = JSON.parse(output);
      
      // ISO 8601 format validation
      expect(parsed.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });

    test('should output readable format in development mode', () => {
      process.env.NODE_ENV = 'development';
      jest.resetModules();
      const { logger: devLogger } = require('../logger');
      
      devLogger.info('test message', { key: 'value' });
      
      expect(consoleSpy).toHaveBeenCalled();
      const output = consoleSpy.mock.calls[0][0];
      
      // Should be readable string format
      expect(output).toContain('INFO');
      expect(output).toContain('test message');
      expect(output).toContain('{"key":"value"}');
    });
  });

  describe('Context enrichment', () => {
    test('should include context object in logs', () => {
      process.env.NODE_ENV = 'production';
      jest.resetModules();
      const { logger: prodLogger } = require('../logger');
      
      const context = {
        userId: '123',
        action: 'login',
        ip: '192.168.1.1'
      };
      
      prodLogger.info('User action', context);
      
      const output = consoleSpy.mock.calls[0][0];
      const parsed = JSON.parse(output);
      
      expect(parsed.context).toEqual(context);
    });

    test('should handle logs without context', () => {
      process.env.NODE_ENV = 'production';
      jest.resetModules();
      const { logger: prodLogger } = require('../logger');
      
      prodLogger.info('Simple message');
      
      const output = consoleSpy.mock.calls[0][0];
      const parsed = JSON.parse(output);
      
      expect(parsed).not.toHaveProperty('context');
    });

    test('should serialize complex context objects', () => {
      process.env.NODE_ENV = 'production';
      jest.resetModules();
      const { logger: prodLogger } = require('../logger');
      
      const context = {
        error: { name: 'Error', message: 'Test error' },
        nested: { deep: { value: 42 } },
        array: [1, 2, 3]
      };
      
      prodLogger.error('Complex context', context);
      
      const output = consoleSpy.mock.calls[0][0];
      const parsed = JSON.parse(output);
      
      expect(parsed.context).toEqual(context);
    });
  });

  describe('Log level hierarchy', () => {
    test('should respect log level hierarchy (debug < info < warn < error)', () => {
      process.env.NODE_ENV = 'production'; // min level = INFO
      jest.resetModules();
      const { logger: prodLogger } = require('../logger');
      
      prodLogger.debug('debug message');
      expect(consoleSpy).not.toHaveBeenCalled();
      
      prodLogger.info('info message');
      expect(consoleSpy).toHaveBeenCalledTimes(1);
      
      prodLogger.warn('warn message');
      expect(consoleSpy).toHaveBeenCalledTimes(2);
      
      prodLogger.error('error message');
      expect(consoleSpy).toHaveBeenCalledTimes(3);
    });
  });

  describe('All log methods', () => {
    test('debug method should work correctly', () => {
      process.env.NODE_ENV = 'development';
      jest.resetModules();
      const { logger: devLogger } = require('../logger');
      
      devLogger.debug('debug test');
      
      expect(consoleSpy).toHaveBeenCalled();
      const output = consoleSpy.mock.calls[0][0];
      expect(output).toContain('DEBUG');
    });

    test('info method should work correctly', () => {
      logger.info('info test');
      
      expect(consoleSpy).toHaveBeenCalled();
      const output = consoleSpy.mock.calls[0][0];
      expect(output).toContain('INFO');
    });

    test('warn method should work correctly', () => {
      logger.warn('warn test');
      
      expect(consoleSpy).toHaveBeenCalled();
      const output = consoleSpy.mock.calls[0][0];
      expect(output).toContain('WARN');
    });

    test('error method should work correctly', () => {
      logger.error('error test');
      
      expect(consoleSpy).toHaveBeenCalled();
      const output = consoleSpy.mock.calls[0][0];
      expect(output).toContain('ERROR');
    });
  });
});
