import { useState, useEffect } from 'react';
import type { JiraTicketInfo, ConfluencePageInfo, AtlassianGrouping } from '../../../types/jira';
import { AtlassianDetectionService } from '../../../services/jira/atlassianDetectionService';
import { JiraTitleParser } from '../../../services/jira/titleParser';
import '../../JiraView.css';

export function JiraView() {
  const [loading, setLoading] = useState(true);
  const [grouping, setGrouping] = useState<AtlassianGrouping | null>(null);
  const [stats, setStats] = useState<{
    jira: ReturnType<AtlassianDetectionService['getJiraStats']> | null;
    confluence: ReturnType<AtlassianDetectionService['getConfluenceStats']> | null;
  }>({ jira: null, confluence: null });
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());
  const [expandedSpaces, setExpandedSpaces] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'jira' | 'confluence'>('jira');

  useEffect(() => {
    loadAtlassianTabs();
  }, []);

  const loadAtlassianTabs = async () => {
    setLoading(true);
    try {
      const tabs = await chrome.tabs.query({});
      const service = new AtlassianDetectionService();

      const { jiraTabs, confluenceTabs, otherAtlassian } = await service.detectAtlassianTabs(tabs);

      const grouped = service.groupAtlassianTabs(jiraTabs, confluenceTabs, otherAtlassian);
      setGrouping(grouped);

      // Calculate stats
      const jiraStats = service.getJiraStats(jiraTabs);
      const confluenceStats = service.getConfluenceStats(confluenceTabs);
      setStats({ jira: jiraStats, confluence: confluenceStats });

      // Auto-expand if only one or two projects/spaces
      if (grouped.jiraProjects.size <= 2) {
        setExpandedProjects(new Set(grouped.jiraProjects.keys()));
      }
      if (grouped.confluenceSpaces.size <= 2) {
        setExpandedSpaces(new Set(grouped.confluenceSpaces.keys()));
      }
    } catch (error) {
      console.error('Failed to load Atlassian tabs:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleProject = (projectKey: string) => {
    const newExpanded = new Set(expandedProjects);
    if (newExpanded.has(projectKey)) {
      newExpanded.delete(projectKey);
    } else {
      newExpanded.add(projectKey);
    }
    setExpandedProjects(newExpanded);
  };

  const toggleSpace = (spaceKey: string) => {
    const newExpanded = new Set(expandedSpaces);
    if (newExpanded.has(spaceKey)) {
      newExpanded.delete(spaceKey);
    } else {
      newExpanded.add(spaceKey);
    }
    setExpandedSpaces(newExpanded);
  };

  const openTab = async (tabId: number) => {
    await chrome.tabs.update(tabId, { active: true });
    const tab = await chrome.tabs.get(tabId);
    if (tab.windowId) {
      await chrome.windows.update(tab.windowId, { focused: true });
    }
  };

  const closeTab = async (tabId: number) => {
    await chrome.tabs.remove(tabId);
    await loadAtlassianTabs(); // Refresh
  };

  const getFilteredJiraTabs = (): Map<string, JiraTicketInfo[]> => {
    if (!grouping) return new Map();
    if (!searchQuery.trim()) return grouping.jiraProjects;

    const service = new AtlassianDetectionService();
    const allTickets = Array.from(grouping.jiraProjects.values()).flat();
    const filtered = service.searchJiraTickets(allTickets, searchQuery);

    // Re-group filtered results
    const result = new Map<string, JiraTicketInfo[]>();
    for (const ticket of filtered) {
      const existing = result.get(ticket.projectKey) || [];
      existing.push(ticket);
      result.set(ticket.projectKey, existing);
    }
    return result;
  };

  const getFilteredConfluenceTabs = (): Map<string, ConfluencePageInfo[]> => {
    if (!grouping) return new Map();
    if (!searchQuery.trim()) return grouping.confluenceSpaces;

    const service = new AtlassianDetectionService();
    const allPages = Array.from(grouping.confluenceSpaces.values()).flat();
    const filtered = service.searchConfluencePages(allPages, searchQuery);

    // Re-group filtered results
    const result = new Map<string, ConfluencePageInfo[]>();
    for (const page of filtered) {
      const existing = result.get(page.spaceKey) || [];
      existing.push(page);
      result.set(page.spaceKey, existing);
    }
    return result;
  };

  if (loading) {
    return (
      <div className="jira-view">
        <div className="loading">Loading Atlassian tabs...</div>
      </div>
    );
  }

  if (!grouping) {
    return (
      <div className="jira-view">
        <div className="error">Failed to load Atlassian tabs</div>
      </div>
    );
  }

  const filteredJiraProjects = getFilteredJiraTabs();
  const filteredConfluenceSpaces = getFilteredConfluenceTabs();
  const totalJira = Array.from(filteredJiraProjects.values()).flat().length;
  const totalConfluence = Array.from(filteredConfluenceSpaces.values()).flat().length;

  if (totalJira === 0 && totalConfluence === 0 && grouping.otherAtlassian.length === 0) {
    return (
      <div className="jira-view">
        <div className="empty-state">
          <h3>No Atlassian tabs found</h3>
          <p>Open some Jira or Confluence tabs to see them organized here!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="jira-view">
      {/* Header with stats */}
      <div className="jira-header">
        <h2>Atlassian Tabs</h2>
        <div className="jira-stats">
          <span className="stat">
            <strong>{stats.jira?.totalTickets || 0}</strong> Jira tickets
          </span>
          <span className="stat">
            <strong>{stats.confluence?.totalPages || 0}</strong> Confluence pages
          </span>
        </div>
      </div>

      {/* Search */}
      <div className="jira-search">
        <input
          type="text"
          placeholder="Search tickets or pages..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="search-input"
        />
      </div>

      {/* Tabs */}
      <div className="jira-tabs">
        <button
          className={`jira-tab ${activeTab === 'jira' ? 'active' : ''}`}
          onClick={() => setActiveTab('jira')}
        >
          Jira ({totalJira})
        </button>
        <button
          className={`jira-tab ${activeTab === 'confluence' ? 'active' : ''}`}
          onClick={() => setActiveTab('confluence')}
        >
          Confluence ({totalConfluence})
        </button>
      </div>

      {/* Content */}
      <div className="jira-content">
        {activeTab === 'jira' && (
          <div className="jira-projects">
            {filteredJiraProjects.size === 0 ? (
              <div className="no-results">No Jira tickets found</div>
            ) : (
              Array.from(filteredJiraProjects.entries()).map(([projectKey, tickets]) => (
                <div key={projectKey} className="project-group">
                  <div className="project-header" onClick={() => toggleProject(projectKey)}>
                    <span className="expand-icon">
                      {expandedProjects.has(projectKey) ? '▼' : '▶'}
                    </span>
                    <span className="project-name">{projectKey}</span>
                    <span className="project-count">{tickets.length}</span>
                  </div>

                  {expandedProjects.has(projectKey) && (
                    <div className="tickets-list">
                      {tickets.map((ticket) => (
                        <div key={ticket.tabId} className="ticket-item">
                          <div className="ticket-main">
                            <span className="ticket-number" onClick={() => openTab(ticket.tabId)}>
                              {ticket.fullTicket}
                            </span>
                            {ticket.status && ticket.status !== 'unknown' && (
                              <span
                                className="ticket-status"
                                style={{
                                  backgroundColor: JiraTitleParser.getStatusColor(ticket.status),
                                }}
                              >
                                {JiraTitleParser.getStatusDisplayName(ticket.status)}
                              </span>
                            )}
                          </div>
                          <div className="ticket-summary" onClick={() => openTab(ticket.tabId)}>
                            {ticket.summary}
                          </div>
                          <button
                            className="close-btn"
                            onClick={() => closeTab(ticket.tabId)}
                            title="Close tab"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'confluence' && (
          <div className="confluence-spaces">
            {filteredConfluenceSpaces.size === 0 ? (
              <div className="no-results">No Confluence pages found</div>
            ) : (
              Array.from(filteredConfluenceSpaces.entries()).map(([spaceKey, pages]) => (
                <div key={spaceKey} className="space-group">
                  <div className="space-header" onClick={() => toggleSpace(spaceKey)}>
                    <span className="expand-icon">{expandedSpaces.has(spaceKey) ? '▼' : '▶'}</span>
                    <span className="space-name">{spaceKey}</span>
                    <span className="space-count">{pages.length}</span>
                  </div>

                  {expandedSpaces.has(spaceKey) && (
                    <div className="pages-list">
                      {pages.map((page) => (
                        <div key={page.tabId} className="page-item">
                          <div className="page-title" onClick={() => openTab(page.tabId)}>
                            {page.pageTitle}
                          </div>
                          <button
                            className="close-btn"
                            onClick={() => closeTab(page.tabId)}
                            title="Close tab"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default JiraView;
