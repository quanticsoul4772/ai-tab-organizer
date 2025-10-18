import React, { useState } from 'react';
import type { DuplicateGroup } from '../../../types/duplicates';
import { DuplicateDetectionService } from '../../../services/duplicates/duplicateDetectionService';
import { tabManager } from '../../../services/tabManager';

export function DuplicateDetection() {
  const [scanning, setScanning] = useState(false);
  const [results, setResults] = useState<DuplicateGroup[]>([]);
  const [stats, setStats] = useState<{ time: number; cost: number; tiersUsed: string } | null>(
    null
  );
  const [error, setError] = useState<string | null>(null);

  const handleScan = async () => {
    setScanning(true);
    setError(null);

    try {
      // Get all tabs
      const allTabs = await tabManager.getAllTabs();

      if (allTabs.length < 2) {
        setError('Need at least 2 tabs to detect duplicates');
        setScanning(false);
        return;
      }

      // Get API key for Tier 3 (optional)
      const apiKeyResult = await chrome.storage.local.get('apiKey');
      const apiKey = apiKeyResult.apiKey;

      const service = new DuplicateDetectionService(apiKey);
      const result = await service.detectDuplicates(allTabs, {
        enableSemanticAnalysis: !!apiKey,
        fingerprintThreshold: 0.9,
        semanticThreshold: 0.85,
      });

      setResults(result.duplicateGroups);
      setStats({
        time: result.processingTime,
        cost: result.apiCost,
        tiersUsed: `Tier 1: ${result.tier1Found}, Tier 2: ${result.tier2Found}, Tier 3: ${result.tier3Found}`,
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to detect duplicates';
      setError(errorMessage);
    } finally {
      setScanning(false);
    }
  };

  const handleCloseDuplicates = async (group: DuplicateGroup) => {
    const tabsToClose = group.recommendation.closeTabIds;

    for (const tabId of tabsToClose) {
      try {
        await tabManager.closeTab(tabId);
      } catch (error) {
        console.error(`Failed to close tab ${tabId}:`, error);
      }
    }

    // Remove from results
    setResults((prev) => prev.filter((g) => g.id !== group.id));
  };

  const handleKeepAll = (group: DuplicateGroup) => {
    // Remove from results without closing tabs
    setResults((prev) => prev.filter((g) => g.id !== group.id));
  };

  if (scanning) {
    return (
      <div className="duplicate-detection">
        <div className="scanning-panel">
          <div className="spinner" />
          <p>🔍 Scanning for duplicates...</p>
          <p className="hint">This may take a few seconds</p>
        </div>
      </div>
    );
  }

  return (
    <div className="duplicate-detection">
      <div className="duplicate-header">
        <div className="header-content">
          <h2>🔍 Duplicate Detection</h2>
          <p className="header-description">
            Find and remove duplicate or near-duplicate tabs
          </p>
        </div>
        <button onClick={handleScan} className="scan-button">
          Scan for Duplicates
        </button>
      </div>

      {error && (
        <div className="duplicate-error">
          ⚠️ {error}
        </div>
      )}

      {!scanning && results.length === 0 && stats && (
        <div className="no-duplicates">
          <div className="success-icon">✅</div>
          <h3>No duplicates found!</h3>
          <p className="stats-text">
            Scanned in {stats.time}ms
            {stats.cost > 0 && ` • Cost: $${stats.cost.toFixed(4)}`}
          </p>
          <p className="tiers-info">{stats.tiersUsed}</p>
        </div>
      )}

      {results.length > 0 && (
        <div className="duplicate-results">
          <div className="results-summary">
            <span className="result-count">
              Found {results.length} duplicate group{results.length > 1 ? 's' : ''}
            </span>
            {stats && (
              <span className="result-stats">
                {stats.time}ms
                {stats.cost > 0 && ` • $${stats.cost.toFixed(4)}`}
              </span>
            )}
          </div>

          <div className="duplicate-groups">
            {results.map((group) => (
              <div key={group.id} className="duplicate-group">
                <div className="group-header">
                  <div className="group-badges">
                    <span className="similarity-badge">
                      {Math.round(group.similarity * 100)}% similar
                    </span>
                    <span className={`method-badge method-${group.detectionMethod}`}>
                      {group.detectionMethod}
                    </span>
                  </div>
                  <p className="group-reason">{group.reason}</p>
                </div>

                <div className="tabs-list">
                  {group.tabs.map((tab) => (
                    <div
                      key={tab.id}
                      className={`tab-item ${
                        group.recommendation.keepTabId === tab.id ? 'recommended' : ''
                      }`}
                    >
                      {tab.favIconUrl && (
                        <img src={tab.favIconUrl} alt="" className="tab-favicon" />
                      )}
                      <div className="tab-info">
                        <div className="tab-title">{tab.title || 'Untitled'}</div>
                        <div className="tab-url">
                          {tab.url ? new URL(tab.url).hostname : ''}
                        </div>
                      </div>
                      {group.recommendation.keepTabId === tab.id && (
                        <span className="keep-badge">✓ Keep</span>
                      )}
                    </div>
                  ))}
                </div>

                <div className="group-actions">
                  <button
                    onClick={() => handleCloseDuplicates(group)}
                    className="close-duplicates-button"
                  >
                    Close {group.recommendation.closeTabIds.length} duplicate
                    {group.recommendation.closeTabIds.length > 1 ? 's' : ''}
                  </button>
                  <button
                    onClick={() => handleKeepAll(group)}
                    className="keep-all-button"
                  >
                    Keep All
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default DuplicateDetection;
