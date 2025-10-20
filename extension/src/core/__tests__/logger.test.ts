import { describe, it, expect, vi, beforeEach } from 'vitest';
import { logger } from '../logger';

describe('Logger', () => {
  let consoleSpy: {
    log: ReturnType<typeof vi.spyOn>;
    info: ReturnType<typeof vi.spyOn>;
    warn: ReturnType<typeof vi.spyOn>;
    error: ReturnType<typeof vi.spyOn>;
  };

  beforeEach(() => {
    logger.clearHistory();
    consoleSpy = {
      log: vi.spyOn(console, 'log').mockImplementation(() => {}),
      info: vi.spyOn(console, 'info').mockImplementation(() => {}),
      warn: vi.spyOn(console, 'warn').mockImplementation(() => {}),
      error: vi.spyOn(console, 'error').mockImplementation(() => {}),
    };
  });

  describe('info()', () => {
    it('logs info messages', () => {
      logger.info('Test message');
      expect(consoleSpy.info).toHaveBeenCalled();
    });

    it('adds to history', () => {
      logger.info('Test message');
      const history = logger.getHistory();
      expect(history.length).toBeGreaterThan(0);
      expect(history[history.length - 1].level).toBe('info');
    });
  });

  describe('warn()', () => {
    it('logs warn messages', () => {
      logger.warn('Warning');
      expect(consoleSpy.warn).toHaveBeenCalled();
    });
  });

  describe('error()', () => {
    it('logs error messages', () => {
      logger.error('Error');
      expect(consoleSpy.error).toHaveBeenCalled();
    });
  });

  describe('debug()', () => {
    it('can be enabled', () => {
      logger.enableLevel('debug');
      logger.debug('Debug');
      expect(consoleSpy.log).toHaveBeenCalled();
    });

    it('can be disabled', () => {
      logger.disableLevel('debug');
      logger.debug('Debug');
      expect(consoleSpy.log).not.toHaveBeenCalled();
    });
  });

  describe('getHistory()', () => {
    it('returns log history', () => {
      logger.info('Info 1');
      logger.warn('Warn 1');

      const history = logger.getHistory();
      expect(history.length).toBeGreaterThanOrEqual(2);
    });

    it('filters by level', () => {
      logger.info('Info');
      logger.warn('Warn');

      const warnHistory = logger.getHistory('warn');
      expect(warnHistory.every((entry) => entry.level === 'warn')).toBe(true);
    });

    it('limits results', () => {
      for (let i = 0; i < 10; i++) {
        logger.info(`Message ${i}`);
      }

      const history = logger.getHistory(undefined, 5);
      expect(history.length).toBeLessThanOrEqual(5);
    });

    it('maintains max history size by removing old entries', () => {
      logger.clearHistory();

      // maxHistorySize is typically 1000, log more than that
      for (let i = 0; i < 1100; i++) {
        logger.info(`Message ${i}`);
      }

      const history = logger.getHistory();
      // Should not exceed max size
      expect(history.length).toBeLessThanOrEqual(1000);
      // Should have the most recent messages
      const lastEntry = history[history.length - 1];
      expect(lastEntry.message).toContain('Message 1099');
    });
  });

  describe('clearHistory()', () => {
    it('clears all history', () => {
      logger.info('Test');
      logger.clearHistory();

      const history = logger.getHistory();
      expect(history).toHaveLength(0);
    });
  });

  describe('level management', () => {
    it('enables and disables levels', () => {
      logger.disableLevel('info');
      logger.info('Should not log');
      const callsBefore = consoleSpy.info.mock.calls.length;

      logger.enableLevel('info');
      logger.info('Should log');

      expect(consoleSpy.info.mock.calls.length).toBeGreaterThan(callsBefore);
    });
  });
});
