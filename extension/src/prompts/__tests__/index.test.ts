import { describe, it, expect } from 'vitest';
import { CATEGORIZATION_V1, TAB_SUMMARY_V1, PROMPTS } from '../index';
import type { Tab } from '@types';

describe('CATEGORIZATION_V1', () => {
  it('has correct version', () => {
    expect(CATEGORIZATION_V1.version).toBe('1.0.0');
  });

  it('has creation date', () => {
    expect(CATEGORIZATION_V1.createdAt).toBe('2025-01-19');
  });

  it('generates prompt with tab info', () => {
    const tabInfo = '0: GitHub\n1: JIRA\n2: Amazon';
    const prompt = CATEGORIZATION_V1.template(tabInfo);

    expect(prompt).toContain('Categorize these browser tabs');
    expect(prompt).toContain(tabInfo);
    expect(prompt).toContain('single-line JSON object');
  });

  it('includes categorization instructions', () => {
    const prompt = CATEGORIZATION_V1.template('test');

    expect(prompt).toContain('Work');
    expect(prompt).toContain('Research');
    expect(prompt).toContain('Shopping');
    expect(prompt).toContain('Development');
  });

  it('includes JSON format example', () => {
    const prompt = CATEGORIZATION_V1.template('test');

    expect(prompt).toMatch(/\{"Work":\[0,1\]/);
  });

  it('has valid schema', () => {
    const validCategories = { Work: [0, 1], Shopping: [2] };
    expect(() => CATEGORIZATION_V1.schema.parse(validCategories)).not.toThrow();
  });

  it('schema rejects invalid data', () => {
    const invalid = { Work: 'not-array' };
    expect(() => CATEGORIZATION_V1.schema.parse(invalid)).toThrow();
  });

  it('has valid examples', () => {
    expect(CATEGORIZATION_V1.examples).toHaveLength(1);

    const example = CATEGORIZATION_V1.examples[0];
    expect(example.input).toBe('0: GitHub - Issues\n1: JIRA\n2: Amazon');
    expect(example.output).toEqual({ Work: [0, 1], Shopping: [2] });
  });

  it('example output passes schema validation', () => {
    CATEGORIZATION_V1.examples.forEach((example) => {
      expect(() => CATEGORIZATION_V1.schema.parse(example.output)).not.toThrow();
    });
  });

  it('generates different prompts for different inputs', () => {
    const prompt1 = CATEGORIZATION_V1.template('0: GitHub');
    const prompt2 = CATEGORIZATION_V1.template('0: Amazon\n1: eBay');

    expect(prompt1).not.toBe(prompt2);
    expect(prompt1).toContain('0: GitHub');
    expect(prompt2).toContain('0: Amazon');
  });
});

describe('TAB_SUMMARY_V1', () => {
  it('has correct version', () => {
    expect(TAB_SUMMARY_V1.version).toBe('1.0.0');
  });

  it('has creation date', () => {
    expect(TAB_SUMMARY_V1.createdAt).toBe('2025-01-19');
  });

  it('generates prompt with tab info', () => {
    const tab: Tab = {
      id: 123,
      title: 'GitHub - Issues',
      url: 'https://github.com/user/repo/issues',
      favIconUrl: 'https://github.com/favicon.ico',
      index: 0,
      windowId: 1,
      highlighted: false,
      active: false,
      pinned: false,
      groupId: -1,
      incognito: false,
    };

    const prompt = TAB_SUMMARY_V1.template(tab);

    expect(prompt).toContain('Summarize this browser tab');
    expect(prompt).toContain(tab.title);
    expect(prompt).toContain(tab.url);
  });

  it('includes summary instructions', () => {
    const tab: Tab = {
      id: 123,
      title: 'Test',
      url: 'https://example.com',
      index: 0,
      windowId: 1,
      highlighted: false,
      active: false,
      pinned: false,
      groupId: -1,
      incognito: false,
    };

    const prompt = TAB_SUMMARY_V1.template(tab);

    expect(prompt).toContain('Main purpose/topic');
    expect(prompt).toContain('Key information');
    expect(prompt).toContain('2-3 sentences');
  });

  it('has valid schema', () => {
    const validSummary = 'This is a test summary';
    expect(() => TAB_SUMMARY_V1.schema.parse(validSummary)).not.toThrow();
  });

  it('schema rejects non-string data', () => {
    expect(() => TAB_SUMMARY_V1.schema.parse(123)).toThrow();
    expect(() => TAB_SUMMARY_V1.schema.parse({ summary: 'test' })).toThrow();
  });

  it('handles undefined tab title and url', () => {
    const tab: Tab = {
      id: 123,
      index: 0,
      windowId: 1,
      highlighted: false,
      active: false,
      pinned: false,
      groupId: -1,
      incognito: false,
    };

    const prompt = TAB_SUMMARY_V1.template(tab);

    expect(prompt).toContain('Tab Title: undefined');
    expect(prompt).toContain('Tab URL: undefined');
  });

  it('generates different prompts for different tabs', () => {
    const tab1: Tab = {
      id: 1,
      title: 'GitHub',
      url: 'https://github.com',
      index: 0,
      windowId: 1,
      highlighted: false,
      active: false,
      pinned: false,
      groupId: -1,
      incognito: false,
    };

    const tab2: Tab = {
      id: 2,
      title: 'Amazon',
      url: 'https://amazon.com',
      index: 1,
      windowId: 1,
      highlighted: false,
      active: false,
      pinned: false,
      groupId: -1,
      incognito: false,
    };

    const prompt1 = TAB_SUMMARY_V1.template(tab1);
    const prompt2 = TAB_SUMMARY_V1.template(tab2);

    expect(prompt1).not.toBe(prompt2);
    expect(prompt1).toContain('GitHub');
    expect(prompt2).toContain('Amazon');
  });
});

describe('PROMPTS', () => {
  it('exports categorization prompt', () => {
    expect(PROMPTS.categorization).toBe(CATEGORIZATION_V1);
  });

  it('exports tab summary prompt', () => {
    expect(PROMPTS.tabSummary).toBe(TAB_SUMMARY_V1);
  });

  it('has expected structure', () => {
    expect(PROMPTS).toHaveProperty('categorization');
    expect(PROMPTS).toHaveProperty('tabSummary');
  });

  it('all prompts have required properties', () => {
    Object.values(PROMPTS).forEach((prompt) => {
      expect(prompt).toHaveProperty('version');
      expect(prompt).toHaveProperty('createdAt');
      expect(prompt).toHaveProperty('template');
      expect(prompt).toHaveProperty('schema');
      expect(prompt).toHaveProperty('examples');

      expect(typeof prompt.version).toBe('string');
      expect(typeof prompt.createdAt).toBe('string');
      expect(typeof prompt.template).toBe('function');
      expect(Array.isArray(prompt.examples)).toBe(true);
    });
  });
});
