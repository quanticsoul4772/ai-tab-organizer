import { describe, it, expect } from 'vitest';
import { AtlassianDetectionService } from '../atlassianDetectionService';
import { JiraSearchEnhancer } from '../jiraSearchEnhancer';

/**
 * Performance tests for Jira functionality with large tab counts
 */
describe('Performance Tests', () => {
  /**
   * Generate mock Jira tabs for testing
   */
  function generateMockJiraTabs(count: number): chrome.tabs.Tab[] {
    const tabs: chrome.tabs.Tab[] = [];
    const projects = ['ENG', 'DESIGN', 'PRODUCT', 'DATA', 'INFRA'];
    const statuses = ['To Do', 'In Progress', 'In Review', 'Done', 'Blocked'];

    for (let i = 0; i < count; i++) {
      const projectKey = projects[i % projects.length];
      const ticketNumber = Math.floor(i / projects.length) + 1;
      const status = statuses[i % statuses.length];

      tabs.push({
        id: i + 1,
        url: `https://company.atlassian.net/browse/${projectKey}-${ticketNumber}`,
        title: `[${projectKey}-${ticketNumber}] Feature ${i} - ${status}`,
        index: i,
        pinned: false,
        highlighted: false,
        windowId: 1,
        active: i === 0,
        incognito: false,
        selected: false,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);
    }

    return tabs;
  }

  /**
   * Generate mixed tabs (Jira, Confluence, regular)
   */
  function generateMixedTabs(count: number): chrome.tabs.Tab[] {
    const tabs: chrome.tabs.Tab[] = [];

    for (let i = 0; i < count; i++) {
      const type = i % 3;

      if (type === 0) {
        // Jira tab
        const projectKey = ['ENG', 'DESIGN', 'PRODUCT'][i % 3];
        const ticketNumber = Math.floor(i / 3) + 1;
        tabs.push({
          id: i + 1,
          url: `https://company.atlassian.net/browse/${projectKey}-${ticketNumber}`,
          title: `[${projectKey}-${ticketNumber}] Feature ${i}`,
          index: i,
          pinned: false,
          highlighted: false,
          windowId: 1,
          active: i === 0,
          incognito: false,
          selected: false,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any);
      } else if (type === 1) {
        // Confluence tab
        const spaceKey = ['TEAM', 'DOCS', 'WIKI'][i % 3];
        tabs.push({
          id: i + 1,
          url: `https://company.atlassian.net/wiki/spaces/${spaceKey}/pages/${i}`,
          title: `Document ${i} - ${spaceKey} - Confluence`,
          index: i,
          pinned: false,
          highlighted: false,
          windowId: 1,
          active: false,
          incognito: false,
          selected: false,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any);
      } else {
        // Regular tab
        tabs.push({
          id: i + 1,
          url: `https://example.com/page-${i}`,
          title: `Example Page ${i}`,
          index: i,
          pinned: false,
          highlighted: false,
          windowId: 1,
          active: false,
          incognito: false,
          selected: false,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any);
      }
    }

    return tabs;
  }

  describe('AtlassianDetectionService Performance', () => {
    it('should detect and group 100 Jira tabs in under 100ms', async () => {
      const tabs = generateMockJiraTabs(100);
      const service = new AtlassianDetectionService();

      const startTime = performance.now();
      const { jiraTabs } = await service.detectAtlassianTabs(tabs);
      const detectTime = performance.now() - startTime;

      expect(jiraTabs).toHaveLength(100);
      expect(detectTime).toBeLessThan(100);
      console.log(`Detected 100 tabs in ${detectTime.toFixed(2)}ms`);
    });

    it('should group 100 Jira tabs in under 50ms', () => {
      const tabs = generateMockJiraTabs(100);
      const service = new AtlassianDetectionService();

      // First detect
      service.detectAtlassianTabs(tabs).then(({ jiraTabs }) => {
        const startTime = performance.now();
        const grouping = service.groupAtlassianTabs(jiraTabs, [], []);
        const groupTime = performance.now() - startTime;

        expect(grouping.jiraProjects.size).toBeGreaterThan(0);
        expect(groupTime).toBeLessThan(50);
        console.log(`Grouped 100 tabs in ${groupTime.toFixed(2)}ms`);
      });
    });

    it('should handle 300 mixed tabs without performance degradation', async () => {
      const tabs = generateMixedTabs(300);
      const service = new AtlassianDetectionService();

      const startTime = performance.now();
      const { jiraTabs, confluenceTabs } = await service.detectAtlassianTabs(tabs);
      const totalTime = performance.now() - startTime;

      expect(jiraTabs.length + confluenceTabs.length).toBeGreaterThan(0);
      expect(totalTime).toBeLessThan(300); // <1ms per tab
      console.log(
        `Processed 300 mixed tabs in ${totalTime.toFixed(2)}ms (${(totalTime / 300).toFixed(2)}ms per tab)`
      );
    });
  });

  describe('JiraSearchEnhancer Performance', () => {
    it('should search 100 tabs in under 50ms', () => {
      const tabs = generateMockJiraTabs(100);

      const startTime = performance.now();
      const results = JiraSearchEnhancer.searchJiraTabs('ENG-10', tabs);
      const searchTime = performance.now() - startTime;

      expect(results.length).toBeGreaterThan(0);
      expect(searchTime).toBeLessThan(50);
      console.log(`Searched 100 tabs in ${searchTime.toFixed(2)}ms`);
    });

    it('should filter by project across 200 tabs in under 100ms', () => {
      const tabs = generateMockJiraTabs(200);

      const startTime = performance.now();
      const results = JiraSearchEnhancer.searchJiraTabs('ENG', tabs);
      const searchTime = performance.now() - startTime;

      expect(results.length).toBeGreaterThan(0);
      expect(searchTime).toBeLessThan(100);
      console.log(`Filtered 200 tabs by project in ${searchTime.toFixed(2)}ms`);
    });

    it('should perform text search across 100 tabs in under 100ms', () => {
      const tabs = generateMockJiraTabs(100);

      const startTime = performance.now();
      const results = JiraSearchEnhancer.searchJiraTabs('Feature', tabs);
      const searchTime = performance.now() - startTime;

      expect(results.length).toBeGreaterThan(0);
      expect(searchTime).toBeLessThan(100);
      console.log(`Text search across 100 tabs in ${searchTime.toFixed(2)}ms`);
    });
  });

  describe('Memory Efficiency', () => {
    it('should handle 500 tabs without excessive memory usage', async () => {
      const tabs = generateMixedTabs(500);
      const service = new AtlassianDetectionService();

      // Measure memory before (if available in Node.js environment)
      const memBefore = process.memoryUsage ? process.memoryUsage().heapUsed : 0;

      const { jiraTabs, confluenceTabs, otherAtlassian } = await service.detectAtlassianTabs(tabs);
      const grouping = service.groupAtlassianTabs(jiraTabs, confluenceTabs, otherAtlassian);

      const memAfter = process.memoryUsage ? process.memoryUsage().heapUsed : 0;
      const memDiff = (memAfter - memBefore) / 1024 / 1024; // Convert to MB

      expect(grouping.jiraProjects.size).toBeGreaterThan(0);

      if (typeof process.memoryUsage === 'function') {
        expect(memDiff).toBeLessThan(50); // Should use less than 50MB
        console.log(`Memory usage for 500 tabs: ${memDiff.toFixed(2)}MB`);
      }
    });
  });

  describe('Stress Tests', () => {
    it('should handle 1000 tabs without crashing', async () => {
      const tabs = generateMixedTabs(1000);
      const service = new AtlassianDetectionService();

      const startTime = performance.now();
      const { jiraTabs, confluenceTabs } = await service.detectAtlassianTabs(tabs);
      const grouping = service.groupAtlassianTabs(jiraTabs, confluenceTabs, []);
      const totalTime = performance.now() - startTime;

      expect(jiraTabs.length + confluenceTabs.length).toBeGreaterThan(0);
      expect(grouping.jiraProjects.size).toBeGreaterThan(0);
      expect(totalTime).toBeLessThan(1000); // <1 second for 1000 tabs
      console.log(`Processed 1000 tabs in ${totalTime.toFixed(2)}ms`);
    });
  });
});
