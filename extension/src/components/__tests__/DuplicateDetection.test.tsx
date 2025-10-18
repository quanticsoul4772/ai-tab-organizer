import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { DuplicateDetection } from '../DuplicateDetection';
import type { DuplicateGroup } from '../../types/duplicates';
import * as tabManager from '../../services/tabManager';

// Mock dependencies
vi.mock('../../services/tabManager', () => ({
  tabManager: {
    getAllTabs: vi.fn(),
    closeTab: vi.fn(),
  },
}));

vi.mock('../../services/duplicates/duplicateDetectionService', () => ({
  DuplicateDetectionService: vi.fn().mockImplementation(() => ({
    detectDuplicates: vi.fn(),
  })),
}));

describe('DuplicateDetection', () => {
  const mockTabs: chrome.tabs.Tab[] = [
    {
      id: 1,
      title: 'Example Site',
      url: 'https://example.com/page1',
      index: 0,
      pinned: false,
      highlighted: false,
      windowId: 1,
      active: false,
      incognito: false,
      selected: false,
      discarded: false,
      autoDiscardable: true,
      groupId: -1,
      favIconUrl: 'https://example.com/favicon.ico',
    },
    {
      id: 2,
      title: 'Example Site',
      url: 'https://example.com/page2',
      index: 1,
      pinned: false,
      highlighted: false,
      windowId: 1,
      active: false,
      incognito: false,
      selected: false,
      discarded: false,
      autoDiscardable: true,
      groupId: -1,
      favIconUrl: 'https://example.com/favicon.ico',
    },
  ];

  const mockDuplicateGroup: DuplicateGroup = {
    id: 'group-1',
    tabs: mockTabs,
    similarity: 0.95,
    reason: 'Same domain and similar titles',
    detectionMethod: 'exact',
    recommendation: {
      keepTabId: 1,
      closeTabIds: [2],
      reason: 'Keep tab 1 as it was opened first',
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock chrome.storage.local
    vi.mocked(chrome.storage.local.get).mockResolvedValue({ apiKey: 'test-api-key' });

    // Default tabManager mocks
    vi.mocked(tabManager.tabManager.getAllTabs).mockResolvedValue(mockTabs);
    vi.mocked(tabManager.tabManager.closeTab).mockResolvedValue(undefined);
  });

  describe('Rendering', () => {
    it('should render header and scan button', () => {
      render(<DuplicateDetection />);

      expect(screen.getByText('🔍 Duplicate Detection')).toBeInTheDocument();
      expect(screen.getByText('Find and remove duplicate or near-duplicate tabs')).toBeInTheDocument();
      expect(screen.getByText('Scan for Duplicates')).toBeInTheDocument();
    });

    it('should render with empty results initially', () => {
      render(<DuplicateDetection />);

      expect(screen.queryByText(/Found \d+ duplicate group/)).not.toBeInTheDocument();
    });
  });

  describe('Scanning State', () => {
    it('should show scanning UI when scanning', async () => {
      const { DuplicateDetectionService } = await import(
        '../../services/duplicates/duplicateDetectionService'
      );

      // Mock slow response
      const mockDetect = vi.fn(
        () => new Promise((resolve) => setTimeout(() => resolve({ duplicateGroups: [] }), 1000))
      );
      vi.mocked(DuplicateDetectionService).mockImplementation(
        () =>
          ({
            detectDuplicates: mockDetect,
          }) as any
      );

      render(<DuplicateDetection />);

      const scanButton = screen.getByText('Scan for Duplicates');
      fireEvent.click(scanButton);

      await waitFor(() => {
        expect(screen.getByText('🔍 Scanning for duplicates...')).toBeInTheDocument();
        expect(screen.getByText('This may take a few seconds')).toBeInTheDocument();
      });
    });

    it('should hide scan button while scanning', async () => {
      const { DuplicateDetectionService } = await import(
        '../../services/duplicates/duplicateDetectionService'
      );

      const mockDetect = vi.fn(
        () => new Promise((resolve) => setTimeout(() => resolve({ duplicateGroups: [] }), 1000))
      );
      vi.mocked(DuplicateDetectionService).mockImplementation(
        () =>
          ({
            detectDuplicates: mockDetect,
          }) as any
      );

      render(<DuplicateDetection />);

      const scanButton = screen.getByText('Scan for Duplicates');
      fireEvent.click(scanButton);

      await waitFor(() => {
        expect(screen.queryByText('Scan for Duplicates')).not.toBeInTheDocument();
      });
    });
  });

  describe('Scan Functionality', () => {
    it('should fetch all tabs when scanning', async () => {
      const { DuplicateDetectionService } = await import(
        '../../services/duplicates/duplicateDetectionService'
      );

      const mockDetect = vi.fn().mockResolvedValue({
        duplicateGroups: [],
        processingTime: 123,
        apiCost: 0,
        tier1Found: 0,
        tier2Found: 0,
        tier3Found: 0,
      });
      vi.mocked(DuplicateDetectionService).mockImplementation(
        () =>
          ({
            detectDuplicates: mockDetect,
          }) as any
      );

      render(<DuplicateDetection />);

      const scanButton = screen.getByText('Scan for Duplicates');
      fireEvent.click(scanButton);

      await waitFor(() => {
        expect(tabManager.tabManager.getAllTabs).toHaveBeenCalled();
      });
    });

    it('should call duplicate detection service', async () => {
      const { DuplicateDetectionService } = await import(
        '../../services/duplicates/duplicateDetectionService'
      );

      const mockDetect = vi.fn().mockResolvedValue({
        duplicateGroups: [],
        processingTime: 123,
        apiCost: 0,
        tier1Found: 0,
        tier2Found: 0,
        tier3Found: 0,
      });
      vi.mocked(DuplicateDetectionService).mockImplementation(
        () =>
          ({
            detectDuplicates: mockDetect,
          }) as any
      );

      render(<DuplicateDetection />);

      const scanButton = screen.getByText('Scan for Duplicates');
      fireEvent.click(scanButton);

      await waitFor(() => {
        expect(mockDetect).toHaveBeenCalledWith(mockTabs, {
          enableSemanticAnalysis: true,
          fingerprintThreshold: 0.9,
          semanticThreshold: 0.85,
        });
      });
    });

    it('should use API key for semantic analysis', async () => {
      const { DuplicateDetectionService } = await import(
        '../../services/duplicates/duplicateDetectionService'
      );

      const mockDetect = vi.fn().mockResolvedValue({
        duplicateGroups: [],
        processingTime: 123,
        apiCost: 0.0012,
        tier1Found: 0,
        tier2Found: 0,
        tier3Found: 2,
      });

      const mockConstructor = vi.fn().mockImplementation(() => ({
        detectDuplicates: mockDetect,
      }));
      vi.mocked(DuplicateDetectionService).mockImplementation(mockConstructor as any);

      render(<DuplicateDetection />);

      const scanButton = screen.getByText('Scan for Duplicates');
      fireEvent.click(scanButton);

      await waitFor(() => {
        expect(mockConstructor).toHaveBeenCalledWith('test-api-key');
      });
    });

    it('should disable semantic analysis when no API key', async () => {
      vi.mocked(chrome.storage.local.get).mockResolvedValue({});

      const { DuplicateDetectionService } = await import(
        '../../services/duplicates/duplicateDetectionService'
      );

      const mockDetect = vi.fn().mockResolvedValue({
        duplicateGroups: [],
        processingTime: 123,
        apiCost: 0,
        tier1Found: 0,
        tier2Found: 0,
        tier3Found: 0,
      });
      vi.mocked(DuplicateDetectionService).mockImplementation(
        () =>
          ({
            detectDuplicates: mockDetect,
          }) as any
      );

      render(<DuplicateDetection />);

      const scanButton = screen.getByText('Scan for Duplicates');
      fireEvent.click(scanButton);

      await waitFor(() => {
        expect(mockDetect).toHaveBeenCalledWith(mockTabs, {
          enableSemanticAnalysis: false,
          fingerprintThreshold: 0.9,
          semanticThreshold: 0.85,
        });
      });
    });
  });

  describe('Error Handling', () => {
    it('should show error when less than 2 tabs', async () => {
      vi.mocked(tabManager.tabManager.getAllTabs).mockResolvedValue([mockTabs[0]]);

      render(<DuplicateDetection />);

      const scanButton = screen.getByText('Scan for Duplicates');
      fireEvent.click(scanButton);

      await waitFor(() => {
        expect(screen.getByText(/Need at least 2 tabs to detect duplicates/)).toBeInTheDocument();
      });
    });

    it('should show error when detection fails', async () => {
      const { DuplicateDetectionService } = await import(
        '../../services/duplicates/duplicateDetectionService'
      );

      const mockDetect = vi.fn().mockRejectedValue(new Error('Network error'));
      vi.mocked(DuplicateDetectionService).mockImplementation(
        () =>
          ({
            detectDuplicates: mockDetect,
          }) as any
      );

      render(<DuplicateDetection />);

      const scanButton = screen.getByText('Scan for Duplicates');
      fireEvent.click(scanButton);

      await waitFor(() => {
        expect(screen.getByText(/Network error/)).toBeInTheDocument();
      });
    });

    it('should handle non-Error exceptions', async () => {
      const { DuplicateDetectionService } = await import(
        '../../services/duplicates/duplicateDetectionService'
      );

      const mockDetect = vi.fn().mockRejectedValue('String error');
      vi.mocked(DuplicateDetectionService).mockImplementation(
        () =>
          ({
            detectDuplicates: mockDetect,
          }) as any
      );

      render(<DuplicateDetection />);

      const scanButton = screen.getByText('Scan for Duplicates');
      fireEvent.click(scanButton);

      await waitFor(() => {
        expect(screen.getByText(/Failed to detect duplicates/)).toBeInTheDocument();
      });
    });

    it('should not show no results message when there is an error', async () => {
      const { DuplicateDetectionService } = await import(
        '../../services/duplicates/duplicateDetectionService'
      );

      const mockDetect = vi.fn().mockRejectedValue(new Error('Test error'));
      vi.mocked(DuplicateDetectionService).mockImplementation(
        () =>
          ({
            detectDuplicates: mockDetect,
          }) as any
      );

      render(<DuplicateDetection />);

      const scanButton = screen.getByText('Scan for Duplicates');
      fireEvent.click(scanButton);

      await waitFor(() => {
        expect(screen.getByText(/Test error/)).toBeInTheDocument();
      });

      // Should not show "No duplicates found" when error is displayed
      expect(screen.queryByText('No duplicates found!')).not.toBeInTheDocument();
    });
  });

  describe('No Duplicates Found', () => {
    it('should show success message when no duplicates', async () => {
      const { DuplicateDetectionService } = await import(
        '../../services/duplicates/duplicateDetectionService'
      );

      const mockDetect = vi.fn().mockResolvedValue({
        duplicateGroups: [],
        processingTime: 123,
        apiCost: 0,
        tier1Found: 0,
        tier2Found: 0,
        tier3Found: 0,
      });
      vi.mocked(DuplicateDetectionService).mockImplementation(
        () =>
          ({
            detectDuplicates: mockDetect,
          }) as any
      );

      render(<DuplicateDetection />);

      const scanButton = screen.getByText('Scan for Duplicates');
      fireEvent.click(scanButton);

      await waitFor(() => {
        expect(screen.getByText('No duplicates found!')).toBeInTheDocument();
        expect(screen.getByText('✅')).toBeInTheDocument();
      });
    });

    it('should show processing time', async () => {
      const { DuplicateDetectionService } = await import(
        '../../services/duplicates/duplicateDetectionService'
      );

      const mockDetect = vi.fn().mockResolvedValue({
        duplicateGroups: [],
        processingTime: 456,
        apiCost: 0,
        tier1Found: 0,
        tier2Found: 0,
        tier3Found: 0,
      });
      vi.mocked(DuplicateDetectionService).mockImplementation(
        () =>
          ({
            detectDuplicates: mockDetect,
          }) as any
      );

      render(<DuplicateDetection />);

      const scanButton = screen.getByText('Scan for Duplicates');
      fireEvent.click(scanButton);

      await waitFor(() => {
        expect(screen.getByText(/Scanned in 456ms/)).toBeInTheDocument();
      });
    });

    it('should show API cost when > 0', async () => {
      const { DuplicateDetectionService } = await import(
        '../../services/duplicates/duplicateDetectionService'
      );

      const mockDetect = vi.fn().mockResolvedValue({
        duplicateGroups: [],
        processingTime: 123,
        apiCost: 0.0012,
        tier1Found: 0,
        tier2Found: 0,
        tier3Found: 2,
      });
      vi.mocked(DuplicateDetectionService).mockImplementation(
        () =>
          ({
            detectDuplicates: mockDetect,
          }) as any
      );

      render(<DuplicateDetection />);

      const scanButton = screen.getByText('Scan for Duplicates');
      fireEvent.click(scanButton);

      await waitFor(() => {
        expect(screen.getByText(/\$0\.0012/)).toBeInTheDocument();
      });
    });

    it('should show tier usage stats', async () => {
      const { DuplicateDetectionService } = await import(
        '../../services/duplicates/duplicateDetectionService'
      );

      const mockDetect = vi.fn().mockResolvedValue({
        duplicateGroups: [],
        processingTime: 123,
        apiCost: 0.0012,
        tier1Found: 2,
        tier2Found: 1,
        tier3Found: 3,
      });
      vi.mocked(DuplicateDetectionService).mockImplementation(
        () =>
          ({
            detectDuplicates: mockDetect,
          }) as any
      );

      render(<DuplicateDetection />);

      const scanButton = screen.getByText('Scan for Duplicates');
      fireEvent.click(scanButton);

      await waitFor(() => {
        expect(screen.getByText('Tier 1: 2, Tier 2: 1, Tier 3: 3')).toBeInTheDocument();
      });
    });
  });

  describe('Duplicate Results Display', () => {
    it('should show results count', async () => {
      const { DuplicateDetectionService } = await import(
        '../../services/duplicates/duplicateDetectionService'
      );

      const mockDetect = vi.fn().mockResolvedValue({
        duplicateGroups: [mockDuplicateGroup],
        processingTime: 123,
        apiCost: 0,
        tier1Found: 1,
        tier2Found: 0,
        tier3Found: 0,
      });
      vi.mocked(DuplicateDetectionService).mockImplementation(
        () =>
          ({
            detectDuplicates: mockDetect,
          }) as any
      );

      render(<DuplicateDetection />);

      const scanButton = screen.getByText('Scan for Duplicates');
      fireEvent.click(scanButton);

      await waitFor(() => {
        expect(screen.getByText('Found 1 duplicate group')).toBeInTheDocument();
      });
    });

    it('should pluralize results count', async () => {
      const { DuplicateDetectionService } = await import(
        '../../services/duplicates/duplicateDetectionService'
      );

      const mockDetect = vi.fn().mockResolvedValue({
        duplicateGroups: [mockDuplicateGroup, { ...mockDuplicateGroup, id: 'group-2' }],
        processingTime: 123,
        apiCost: 0,
        tier1Found: 2,
        tier2Found: 0,
        tier3Found: 0,
      });
      vi.mocked(DuplicateDetectionService).mockImplementation(
        () =>
          ({
            detectDuplicates: mockDetect,
          }) as any
      );

      render(<DuplicateDetection />);

      const scanButton = screen.getByText('Scan for Duplicates');
      fireEvent.click(scanButton);

      await waitFor(() => {
        expect(screen.getByText('Found 2 duplicate groups')).toBeInTheDocument();
      });
    });

    it('should show similarity percentage', async () => {
      const { DuplicateDetectionService } = await import(
        '../../services/duplicates/duplicateDetectionService'
      );

      const mockDetect = vi.fn().mockResolvedValue({
        duplicateGroups: [mockDuplicateGroup],
        processingTime: 123,
        apiCost: 0,
        tier1Found: 1,
        tier2Found: 0,
        tier3Found: 0,
      });
      vi.mocked(DuplicateDetectionService).mockImplementation(
        () =>
          ({
            detectDuplicates: mockDetect,
          }) as any
      );

      render(<DuplicateDetection />);

      const scanButton = screen.getByText('Scan for Duplicates');
      fireEvent.click(scanButton);

      await waitFor(() => {
        expect(screen.getByText('95% similar')).toBeInTheDocument();
      });
    });

    it('should show detection method badge', async () => {
      const { DuplicateDetectionService } = await import(
        '../../services/duplicates/duplicateDetectionService'
      );

      const mockDetect = vi.fn().mockResolvedValue({
        duplicateGroups: [mockDuplicateGroup],
        processingTime: 123,
        apiCost: 0,
        tier1Found: 1,
        tier2Found: 0,
        tier3Found: 0,
      });
      vi.mocked(DuplicateDetectionService).mockImplementation(
        () =>
          ({
            detectDuplicates: mockDetect,
          }) as any
      );

      render(<DuplicateDetection />);

      const scanButton = screen.getByText('Scan for Duplicates');
      fireEvent.click(scanButton);

      await waitFor(() => {
        expect(screen.getByText('exact')).toBeInTheDocument();
      });
    });

    it('should show duplicate reason', async () => {
      const { DuplicateDetectionService } = await import(
        '../../services/duplicates/duplicateDetectionService'
      );

      const mockDetect = vi.fn().mockResolvedValue({
        duplicateGroups: [mockDuplicateGroup],
        processingTime: 123,
        apiCost: 0,
        tier1Found: 1,
        tier2Found: 0,
        tier3Found: 0,
      });
      vi.mocked(DuplicateDetectionService).mockImplementation(
        () =>
          ({
            detectDuplicates: mockDetect,
          }) as any
      );

      render(<DuplicateDetection />);

      const scanButton = screen.getByText('Scan for Duplicates');
      fireEvent.click(scanButton);

      await waitFor(() => {
        expect(screen.getByText('Same domain and similar titles')).toBeInTheDocument();
      });
    });

    it('should display tabs in group', async () => {
      const { DuplicateDetectionService } = await import(
        '../../services/duplicates/duplicateDetectionService'
      );

      const mockDetect = vi.fn().mockResolvedValue({
        duplicateGroups: [mockDuplicateGroup],
        processingTime: 123,
        apiCost: 0,
        tier1Found: 1,
        tier2Found: 0,
        tier3Found: 0,
      });
      vi.mocked(DuplicateDetectionService).mockImplementation(
        () =>
          ({
            detectDuplicates: mockDetect,
          }) as any
      );

      render(<DuplicateDetection />);

      const scanButton = screen.getByText('Scan for Duplicates');
      fireEvent.click(scanButton);

      await waitFor(() => {
        expect(screen.getAllByText('Example Site')).toHaveLength(2);
        expect(screen.getAllByText('example.com')).toHaveLength(2);
      });
    });

    it('should mark recommended tab to keep', async () => {
      const { DuplicateDetectionService } = await import(
        '../../services/duplicates/duplicateDetectionService'
      );

      const mockDetect = vi.fn().mockResolvedValue({
        duplicateGroups: [mockDuplicateGroup],
        processingTime: 123,
        apiCost: 0,
        tier1Found: 1,
        tier2Found: 0,
        tier3Found: 0,
      });
      vi.mocked(DuplicateDetectionService).mockImplementation(
        () =>
          ({
            detectDuplicates: mockDetect,
          }) as any
      );

      render(<DuplicateDetection />);

      const scanButton = screen.getByText('Scan for Duplicates');
      fireEvent.click(scanButton);

      await waitFor(() => {
        expect(screen.getByText('✓ Keep')).toBeInTheDocument();
      });
    });

    it('should show favicon when available', async () => {
      const { DuplicateDetectionService } = await import(
        '../../services/duplicates/duplicateDetectionService'
      );

      const mockDetect = vi.fn().mockResolvedValue({
        duplicateGroups: [mockDuplicateGroup],
        processingTime: 123,
        apiCost: 0,
        tier1Found: 1,
        tier2Found: 0,
        tier3Found: 0,
      });
      vi.mocked(DuplicateDetectionService).mockImplementation(
        () =>
          ({
            detectDuplicates: mockDetect,
          }) as any
      );

      const { container } = render(<DuplicateDetection />);

      const scanButton = screen.getByText('Scan for Duplicates');
      fireEvent.click(scanButton);

      await waitFor(() => {
        const favicons = container.querySelectorAll('.tab-favicon');
        expect(favicons.length).toBe(2);
      });
    });

    it('should handle tab without title', async () => {
      const tabWithoutTitle = { ...mockTabs[0], title: undefined };

      const { DuplicateDetectionService } = await import(
        '../../services/duplicates/duplicateDetectionService'
      );

      const mockDetect = vi.fn().mockResolvedValue({
        duplicateGroups: [
          {
            ...mockDuplicateGroup,
            tabs: [tabWithoutTitle, mockTabs[1]],
          },
        ],
        processingTime: 123,
        apiCost: 0,
        tier1Found: 1,
        tier2Found: 0,
        tier3Found: 0,
      });
      vi.mocked(DuplicateDetectionService).mockImplementation(
        () =>
          ({
            detectDuplicates: mockDetect,
          }) as any
      );

      render(<DuplicateDetection />);

      const scanButton = screen.getByText('Scan for Duplicates');
      fireEvent.click(scanButton);

      await waitFor(() => {
        expect(screen.getByText('Untitled')).toBeInTheDocument();
      });
    });
  });

  describe('Actions', () => {
    it('should close duplicate tabs when button clicked', async () => {
      const { DuplicateDetectionService } = await import(
        '../../services/duplicates/duplicateDetectionService'
      );

      const mockDetect = vi.fn().mockResolvedValue({
        duplicateGroups: [mockDuplicateGroup],
        processingTime: 123,
        apiCost: 0,
        tier1Found: 1,
        tier2Found: 0,
        tier3Found: 0,
      });
      vi.mocked(DuplicateDetectionService).mockImplementation(
        () =>
          ({
            detectDuplicates: mockDetect,
          }) as any
      );

      render(<DuplicateDetection />);

      const scanButton = screen.getByText('Scan for Duplicates');
      fireEvent.click(scanButton);

      await waitFor(() => {
        expect(screen.getByText('Close 1 duplicate')).toBeInTheDocument();
      });

      const closeButton = screen.getByText('Close 1 duplicate');
      fireEvent.click(closeButton);

      await waitFor(() => {
        expect(tabManager.tabManager.closeTab).toHaveBeenCalledWith(2);
      });
    });

    it('should pluralize close button text', async () => {
      const groupWith2ToClose: DuplicateGroup = {
        ...mockDuplicateGroup,
        tabs: [...mockTabs, { ...mockTabs[0], id: 3 }],
        recommendation: {
          keepTabId: 1,
          closeTabIds: [2, 3],
          reason: 'Keep oldest',
        },
      };

      const { DuplicateDetectionService } = await import(
        '../../services/duplicates/duplicateDetectionService'
      );

      const mockDetect = vi.fn().mockResolvedValue({
        duplicateGroups: [groupWith2ToClose],
        processingTime: 123,
        apiCost: 0,
        tier1Found: 1,
        tier2Found: 0,
        tier3Found: 0,
      });
      vi.mocked(DuplicateDetectionService).mockImplementation(
        () =>
          ({
            detectDuplicates: mockDetect,
          }) as any
      );

      render(<DuplicateDetection />);

      const scanButton = screen.getByText('Scan for Duplicates');
      fireEvent.click(scanButton);

      await waitFor(() => {
        expect(screen.getByText('Close 2 duplicates')).toBeInTheDocument();
      });
    });

    it('should remove group from results after closing', async () => {
      const { DuplicateDetectionService } = await import(
        '../../services/duplicates/duplicateDetectionService'
      );

      const mockDetect = vi.fn().mockResolvedValue({
        duplicateGroups: [mockDuplicateGroup],
        processingTime: 123,
        apiCost: 0,
        tier1Found: 1,
        tier2Found: 0,
        tier3Found: 0,
      });
      vi.mocked(DuplicateDetectionService).mockImplementation(
        () =>
          ({
            detectDuplicates: mockDetect,
          }) as any
      );

      render(<DuplicateDetection />);

      const scanButton = screen.getByText('Scan for Duplicates');
      fireEvent.click(scanButton);

      await waitFor(() => {
        expect(screen.getByText('Found 1 duplicate group')).toBeInTheDocument();
      });

      const closeButton = screen.getByText('Close 1 duplicate');
      fireEvent.click(closeButton);

      await waitFor(() => {
        expect(screen.queryByText('Found 1 duplicate group')).not.toBeInTheDocument();
      });
    });

    it('should handle close tab error gracefully', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      vi.mocked(tabManager.tabManager.closeTab).mockRejectedValue(new Error('Close failed'));

      const { DuplicateDetectionService } = await import(
        '../../services/duplicates/duplicateDetectionService'
      );

      const mockDetect = vi.fn().mockResolvedValue({
        duplicateGroups: [mockDuplicateGroup],
        processingTime: 123,
        apiCost: 0,
        tier1Found: 1,
        tier2Found: 0,
        tier3Found: 0,
      });
      vi.mocked(DuplicateDetectionService).mockImplementation(
        () =>
          ({
            detectDuplicates: mockDetect,
          }) as any
      );

      render(<DuplicateDetection />);

      const scanButton = screen.getByText('Scan for Duplicates');
      fireEvent.click(scanButton);

      await waitFor(() => {
        expect(screen.getByText('Close 1 duplicate')).toBeInTheDocument();
      });

      const closeButton = screen.getByText('Close 1 duplicate');
      fireEvent.click(closeButton);

      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalled();
      });

      consoleErrorSpy.mockRestore();
    });

    it('should keep all tabs when keep all clicked', async () => {
      const { DuplicateDetectionService } = await import(
        '../../services/duplicates/duplicateDetectionService'
      );

      const mockDetect = vi.fn().mockResolvedValue({
        duplicateGroups: [mockDuplicateGroup],
        processingTime: 123,
        apiCost: 0,
        tier1Found: 1,
        tier2Found: 0,
        tier3Found: 0,
      });
      vi.mocked(DuplicateDetectionService).mockImplementation(
        () =>
          ({
            detectDuplicates: mockDetect,
          }) as any
      );

      render(<DuplicateDetection />);

      const scanButton = screen.getByText('Scan for Duplicates');
      fireEvent.click(scanButton);

      await waitFor(() => {
        expect(screen.getByText('Keep All')).toBeInTheDocument();
      });

      const keepAllButton = screen.getByText('Keep All');
      fireEvent.click(keepAllButton);

      await waitFor(() => {
        expect(tabManager.tabManager.closeTab).not.toHaveBeenCalled();
        expect(screen.queryByText('Found 1 duplicate group')).not.toBeInTheDocument();
      });
    });
  });
});
