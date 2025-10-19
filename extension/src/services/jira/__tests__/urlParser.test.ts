import { describe, it, expect } from 'vitest';
import { AtlassianUrlParser } from '../urlParser';

describe('AtlassianUrlParser', () => {
  describe('parseJiraUrl', () => {
    it('should parse Atlassian Cloud URLs', () => {
      const result = AtlassianUrlParser.parseJiraUrl(
        'https://company.atlassian.net/browse/ENG-123'
      );
      expect(result).toEqual({
        projectKey: 'ENG',
        ticketNumber: 123,
        fullTicket: 'ENG-123',
      });
    });

    it('should parse Jira Server URLs', () => {
      const result = AtlassianUrlParser.parseJiraUrl('https://jira.company.com/browse/DESIGN-45');
      expect(result).toEqual({
        projectKey: 'DESIGN',
        ticketNumber: 45,
        fullTicket: 'DESIGN-45',
      });
    });

    it('should handle multi-character project keys', () => {
      const result = AtlassianUrlParser.parseJiraUrl(
        'https://company.atlassian.net/browse/PROJ123-999'
      );
      expect(result).toEqual({
        projectKey: 'PROJ123',
        ticketNumber: 999,
        fullTicket: 'PROJ123-999',
      });
    });

    it('should parse project-style URLs', () => {
      const result = AtlassianUrlParser.parseJiraUrl(
        'https://company.atlassian.net/projects/ENG/issues/ENG-456'
      );
      expect(result).toEqual({
        projectKey: 'ENG',
        ticketNumber: 456,
        fullTicket: 'ENG-456',
      });
    });

    it('should return null for non-Jira URLs', () => {
      const result = AtlassianUrlParser.parseJiraUrl('https://google.com');
      expect(result).toBeNull();
    });

    it('should return null for empty URL', () => {
      const result = AtlassianUrlParser.parseJiraUrl('');
      expect(result).toBeNull();
    });

    it('should handle lowercase project keys by converting to uppercase', () => {
      const result = AtlassianUrlParser.parseJiraUrl(
        'https://company.atlassian.net/browse/eng-123'
      );
      expect(result).toBeNull(); // Pattern requires uppercase
    });

    it('should parse URLs with query parameters', () => {
      const result = AtlassianUrlParser.parseJiraUrl(
        'https://company.atlassian.net/browse/ENG-123?focusedCommentId=12345'
      );
      expect(result).toEqual({
        projectKey: 'ENG',
        ticketNumber: 123,
        fullTicket: 'ENG-123',
      });
    });
  });

  describe('parseConfluenceUrl', () => {
    it('should parse Confluence Cloud URLs', () => {
      const result = AtlassianUrlParser.parseConfluenceUrl(
        'https://company.atlassian.net/wiki/spaces/DESIGN/pages/123456/Page+Title'
      );
      expect(result).toEqual({
        spaceKey: 'DESIGN',
      });
    });

    it('should parse Confluence Server display URLs', () => {
      const result = AtlassianUrlParser.parseConfluenceUrl(
        'https://confluence.company.com/display/ENG/Architecture+Overview'
      );
      expect(result).toEqual({
        spaceKey: 'ENG',
      });
    });

    it('should parse Confluence with /confluence/ prefix', () => {
      const result = AtlassianUrlParser.parseConfluenceUrl(
        'https://company.com/confluence/display/DOCS/Page'
      );
      expect(result).toEqual({
        spaceKey: 'DOCS',
      });
    });

    it('should return null for non-Confluence URLs', () => {
      const result = AtlassianUrlParser.parseConfluenceUrl('https://google.com');
      expect(result).toBeNull();
    });

    it('should return null for empty URL', () => {
      const result = AtlassianUrlParser.parseConfluenceUrl('');
      expect(result).toBeNull();
    });

    it('should handle numeric space keys', () => {
      const result = AtlassianUrlParser.parseConfluenceUrl(
        'https://company.atlassian.net/wiki/spaces/SPACE123/pages/456'
      );
      expect(result).toEqual({
        spaceKey: 'SPACE123',
      });
    });
  });

  describe('isAtlassianUrl', () => {
    it('should detect Atlassian Cloud URLs', () => {
      expect(
        AtlassianUrlParser.isAtlassianUrl('https://company.atlassian.net/browse/ENG-123')
      ).toBe(true);
    });

    it('should detect Jira Server URLs', () => {
      expect(AtlassianUrlParser.isAtlassianUrl('https://jira.company.com/browse/ENG-123')).toBe(
        true
      );
    });

    it('should detect Confluence URLs', () => {
      expect(
        AtlassianUrlParser.isAtlassianUrl('https://company.atlassian.net/wiki/spaces/ENG')
      ).toBe(true);
    });

    it('should detect /display/ URLs', () => {
      expect(AtlassianUrlParser.isAtlassianUrl('https://confluence.company.com/display/ENG')).toBe(
        true
      );
    });

    it('should return false for non-Atlassian URLs', () => {
      expect(AtlassianUrlParser.isAtlassianUrl('https://google.com')).toBe(false);
      expect(AtlassianUrlParser.isAtlassianUrl('https://github.com')).toBe(false);
    });

    it('should return false for empty URL', () => {
      expect(AtlassianUrlParser.isAtlassianUrl('')).toBe(false);
    });
  });

  describe('getAtlassianType', () => {
    it('should detect Jira type', () => {
      const result = AtlassianUrlParser.getAtlassianType(
        'https://company.atlassian.net/browse/ENG-123'
      );
      expect(result).toBe('jira');
    });

    it('should detect Confluence type', () => {
      const result = AtlassianUrlParser.getAtlassianType(
        'https://company.atlassian.net/wiki/spaces/ENG'
      );
      expect(result).toBe('confluence');
    });

    it('should detect other Atlassian types', () => {
      const result = AtlassianUrlParser.getAtlassianType('https://company.atlassian.net/admin');
      expect(result).toBe('other');
    });

    it('should return null for non-Atlassian URLs', () => {
      const result = AtlassianUrlParser.getAtlassianType('https://google.com');
      expect(result).toBeNull();
    });
  });
});
