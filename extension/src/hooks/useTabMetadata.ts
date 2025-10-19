import { useState, useEffect } from 'react';
import type { TabMetadata } from '../types/indicators';
import { runtime } from '../core/browserApi';
import { BACKGROUND_ACTIONS } from '../constants/actions';

/**
 * Custom hook to fetch and manage tab metadata
 *
 * Fetches metadata from the background worker including:
 * - Last accessed time
 * - Memory usage
 * - Suspended state
 * - Duplicate count
 * - Jira status (if applicable)
 *
 * @param tabId - The tab ID to fetch metadata for
 * @param isPinned - Whether the tab is pinned
 * @returns Object containing metadata and loading state
 */
export function useTabMetadata(tabId: number | undefined, isPinned: boolean = false) {
  const [metadata, setMetadata] = useState<TabMetadata>({
    lastAccessed: Date.now(),
    isSuspended: false,
    duplicateCount: 1,
    isPinned,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!tabId) {
      setLoading(false);
      return;
    }

    let isMounted = true;
    setLoading(true);
    setError(null);

    runtime
      .sendMessage<TabMetadata>(BACKGROUND_ACTIONS.GET_TAB_METADATA, { tabId })
      .then((data) => {
        if (isMounted) {
          setMetadata({
            lastAccessed: data.lastAccessed || Date.now(),
            memoryUsage: data.memoryUsage,
            isSuspended: data.isSuspended || false,
            duplicateCount: data.duplicateCount || 1,
            isPinned,
            jiraStatus: data.jiraStatus,
          });
          setLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          console.warn('Failed to fetch tab metadata:', err);
          setError(err);
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [tabId, isPinned]);

  return { metadata, loading, error };
}
