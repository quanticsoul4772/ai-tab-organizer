import { describe, it, expect } from 'vitest';
import { JiraTitleParser } from '../titleParser';

describe('JiraTitleParser', () => {
  describe('parseTitle', () => {
    it('should parse Pattern 1: [TICKET] Summary - Status', () => {
      const result = JiraTitleParser.parseTitle('[ENG-123] Fix login bug - In Progress');
      expect(result).toEqual({
        fullTicket: 'ENG-123',
        summary: 'Fix login bug',
        status: 'in-progress',
      });
    });

    it('should parse Pattern 1 without status', () => {
      const result = JiraTitleParser.parseTitle('[ENG-123] Fix login bug');
      expect(result).toEqual({
        fullTicket: 'ENG-123',
        summary: 'Fix login bug',
        status: 'unknown',
      });
    });

    it('should parse Pattern 2: TICKET: Summary (Status)', () => {
      const result = JiraTitleParser.parseTitle('DESIGN-45: Update mockups (In Review)');
      expect(result).toEqual({
        fullTicket: 'DESIGN-45',
        summary: 'Update mockups',
        status: 'in-review',
      });
    });

    it('should parse Pattern 2 without status', () => {
      const result = JiraTitleParser.parseTitle('DESIGN-45: Update mockups');
      expect(result).toEqual({
        fullTicket: 'DESIGN-45',
        summary: 'Update mockups',
        status: 'unknown',
      });
    });

    it('should parse Pattern 3: TICKET | Summary - Status', () => {
      const result = JiraTitleParser.parseTitle('PROJ123-999 | Refactor API - Done');
      expect(result).toEqual({
        fullTicket: 'PROJ123-999',
        summary: 'Refactor API',
        status: 'done',
      });
    });

    it('should parse Pattern 3 without status', () => {
      const result = JiraTitleParser.parseTitle('PROJ123-999 | Refactor API');
      expect(result).toEqual({
        fullTicket: 'PROJ123-999',
        summary: 'Refactor API',
        status: 'unknown',
      });
    });

    it('should handle multi-character project keys', () => {
      const result = JiraTitleParser.parseTitle('[PLATFORM123-456] Scale infrastructure');
      expect(result).toEqual({
        fullTicket: 'PLATFORM123-456',
        summary: 'Scale infrastructure',
        status: 'unknown',
      });
    });

    it('should handle complex summaries with special characters', () => {
      const result = JiraTitleParser.parseTitle(
        "[ENG-789] Fix bug: User can't login with @email.com - Blocked"
      );
      expect(result).toEqual({
        fullTicket: 'ENG-789',
        summary: "Fix bug: User can't login with @email.com",
        status: 'blocked',
      });
    });

    it('should return empty object for non-matching title', () => {
      const result = JiraTitleParser.parseTitle('Just a regular tab title');
      expect(result).toEqual({});
    });

    it('should return empty object for empty title', () => {
      const result = JiraTitleParser.parseTitle('');
      expect(result).toEqual({});
    });

    it('should handle whitespace around components', () => {
      const result = JiraTitleParser.parseTitle('[ENG-123]   Fix bug   -   To Do  ');
      expect(result).toEqual({
        fullTicket: 'ENG-123',
        summary: 'Fix bug',
        status: 'todo',
      });
    });
  });

  describe('parseStatus', () => {
    it('should parse "To Do" variations', () => {
      expect(JiraTitleParser.parseStatus('To Do')).toBe('todo');
      expect(JiraTitleParser.parseStatus('TODO')).toBe('todo');
      expect(JiraTitleParser.parseStatus('Open')).toBe('todo');
      expect(JiraTitleParser.parseStatus('Backlog')).toBe('todo');
    });

    it('should parse "In Progress" variations', () => {
      expect(JiraTitleParser.parseStatus('In Progress')).toBe('in-progress');
      expect(JiraTitleParser.parseStatus('In-Progress')).toBe('in-progress');
      expect(JiraTitleParser.parseStatus('Doing')).toBe('in-progress');
      expect(JiraTitleParser.parseStatus('Working')).toBe('in-progress');
      expect(JiraTitleParser.parseStatus('Started')).toBe('in-progress');
    });

    it('should parse "In Review" variations', () => {
      expect(JiraTitleParser.parseStatus('In Review')).toBe('in-review');
      expect(JiraTitleParser.parseStatus('In-Review')).toBe('in-review');
      expect(JiraTitleParser.parseStatus('Review')).toBe('in-review');
      expect(JiraTitleParser.parseStatus('Reviewing')).toBe('in-review');
      expect(JiraTitleParser.parseStatus('Code Review')).toBe('in-review');
      expect(JiraTitleParser.parseStatus('PR Review')).toBe('in-review');
    });

    it('should parse "Done" variations', () => {
      expect(JiraTitleParser.parseStatus('Done')).toBe('done');
      expect(JiraTitleParser.parseStatus('Closed')).toBe('done');
      expect(JiraTitleParser.parseStatus('Resolved')).toBe('done');
      expect(JiraTitleParser.parseStatus('Complete')).toBe('done');
      expect(JiraTitleParser.parseStatus('Finished')).toBe('done');
    });

    it('should parse "Blocked" variations', () => {
      expect(JiraTitleParser.parseStatus('Blocked')).toBe('blocked');
      expect(JiraTitleParser.parseStatus('Waiting')).toBe('blocked');
      expect(JiraTitleParser.parseStatus('On Hold')).toBe('blocked');
      expect(JiraTitleParser.parseStatus('Paused')).toBe('blocked');
      expect(JiraTitleParser.parseStatus('Impediment')).toBe('blocked');
    });

    it('should handle case insensitivity', () => {
      expect(JiraTitleParser.parseStatus('IN PROGRESS')).toBe('in-progress');
      expect(JiraTitleParser.parseStatus('in progress')).toBe('in-progress');
      expect(JiraTitleParser.parseStatus('In Progress')).toBe('in-progress');
    });

    it('should handle extra whitespace', () => {
      expect(JiraTitleParser.parseStatus('  In Progress  ')).toBe('in-progress');
      expect(JiraTitleParser.parseStatus('   Done   ')).toBe('done');
    });

    it('should return unknown for unrecognized status', () => {
      expect(JiraTitleParser.parseStatus('Custom Status')).toBe('unknown');
      expect(JiraTitleParser.parseStatus('Some Random Text')).toBe('unknown');
    });

    it('should return unknown for empty status', () => {
      expect(JiraTitleParser.parseStatus('')).toBe('unknown');
      expect(JiraTitleParser.parseStatus(undefined)).toBe('unknown');
    });
  });

  describe('extractTicketNumber', () => {
    it('should extract ticket from [TICKET] format', () => {
      const result = JiraTitleParser.extractTicketNumber('[ENG-123] Fix bug');
      expect(result).toBe('ENG-123');
    });

    it('should extract ticket from TICKET: format', () => {
      const result = JiraTitleParser.extractTicketNumber('DESIGN-45: Update mockups');
      expect(result).toBe('DESIGN-45');
    });

    it('should extract ticket from TICKET | format', () => {
      const result = JiraTitleParser.extractTicketNumber('PROJ-999 | Refactor code');
      expect(result).toBe('PROJ-999');
    });

    it('should extract ticket from middle of text', () => {
      const result = JiraTitleParser.extractTicketNumber('Some text ENG-123 more text');
      expect(result).toBe('ENG-123');
    });

    it('should extract first ticket if multiple exist', () => {
      const result = JiraTitleParser.extractTicketNumber('[ENG-123] Related to DESIGN-45');
      expect(result).toBe('ENG-123');
    });

    it('should handle multi-character project keys', () => {
      const result = JiraTitleParser.extractTicketNumber('[PLATFORM123-456] Task');
      expect(result).toBe('PLATFORM123-456');
    });

    it('should return null for no ticket', () => {
      const result = JiraTitleParser.extractTicketNumber('No ticket here');
      expect(result).toBeNull();
    });

    it('should return null for empty title', () => {
      const result = JiraTitleParser.extractTicketNumber('');
      expect(result).toBeNull();
    });

    it('should require uppercase project key', () => {
      const result = JiraTitleParser.extractTicketNumber('eng-123 lowercase');
      expect(result).toBeNull();
    });
  });

  describe('getStatusDisplayName', () => {
    it('should return display name for todo', () => {
      expect(JiraTitleParser.getStatusDisplayName('todo')).toBe('To Do');
    });

    it('should return display name for in-progress', () => {
      expect(JiraTitleParser.getStatusDisplayName('in-progress')).toBe('In Progress');
    });

    it('should return display name for in-review', () => {
      expect(JiraTitleParser.getStatusDisplayName('in-review')).toBe('In Review');
    });

    it('should return display name for done', () => {
      expect(JiraTitleParser.getStatusDisplayName('done')).toBe('Done');
    });

    it('should return display name for blocked', () => {
      expect(JiraTitleParser.getStatusDisplayName('blocked')).toBe('Blocked');
    });

    it('should return empty string for unknown', () => {
      expect(JiraTitleParser.getStatusDisplayName('unknown')).toBe('');
    });
  });

  describe('getStatusColor', () => {
    it('should return blue for todo', () => {
      expect(JiraTitleParser.getStatusColor('todo')).toBe('#0052cc');
    });

    it('should return yellow for in-progress', () => {
      expect(JiraTitleParser.getStatusColor('in-progress')).toBe('#ffab00');
    });

    it('should return purple for in-review', () => {
      expect(JiraTitleParser.getStatusColor('in-review')).toBe('#6554c0');
    });

    it('should return green for done', () => {
      expect(JiraTitleParser.getStatusColor('done')).toBe('#36b37e');
    });

    it('should return red for blocked', () => {
      expect(JiraTitleParser.getStatusColor('blocked')).toBe('#ff5630');
    });

    it('should return gray for unknown', () => {
      expect(JiraTitleParser.getStatusColor('unknown')).toBe('#6b7280');
    });
  });
});
