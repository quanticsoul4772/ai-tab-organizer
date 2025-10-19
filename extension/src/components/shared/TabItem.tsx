import { memo, useCallback, useMemo, useState } from 'react';
import type { DensityConfig } from '../../types/density';
import { getTabIndicators } from '../../utils/indicators';
import { useTabMetadata } from '../../hooks/useTabMetadata';

interface TabItemProps {
  tab: chrome.tabs.Tab;
  style: React.CSSProperties;
  onClick: () => void;
  onClose: () => void;
  isSelected?: boolean;
  densityConfig?: DensityConfig;
}

export const TabItem = memo(
  function TabItem({
    tab,
    style,
    onClick,
    onClose,
    isSelected = false,
    densityConfig,
  }: TabItemProps) {
    const [isHovered, setIsHovered] = useState(false);
    const [isCloseHovered, setIsCloseHovered] = useState(false);

    // Fetch tab metadata using custom hook
    const { metadata } = useTabMetadata(tab.id, tab.pinned || false);

    // Calculate indicators using the proper function
    const indicators = useMemo(() => {
      const result = getTabIndicators(metadata);
      console.log('TabItem indicators for', tab.title?.substring(0, 30), ':', {
        metadata,
        badges: result.badges,
        badgeCount: result.badges.length,
      });
      return result;
    }, [metadata, tab.title]);

    // Debug logging
    if (!densityConfig) {
      console.warn('TabItem: densityConfig is undefined for tab', tab.id);
    } else {
      console.log(
        'TabItem rendered with density mode:',
        densityConfig.mode,
        'for tab',
        tab.title?.substring(0, 30)
      );
    }

    // Extract domain from URL
    const domain = useMemo(() => {
      try {
        return new URL(tab.url || '').hostname;
      } catch {
        return '';
      }
    }, [tab.url]);

    // Format timestamp (last accessed time)
    const formattedTime = useMemo(() => {
      // Chrome doesn't expose lastAccessed in standard tabs API
      // This would need to be passed from indexed tabs if available
      return '';
    }, []);

    // Memoize styles to prevent recreation
    const containerStyle = useMemo(
      () => ({
        ...style,
        display: 'flex',
        flexDirection: (densityConfig?.mode === 'compact' ? 'row' : 'column') as 'row' | 'column',
        alignItems: densityConfig?.mode === 'compact' ? 'center' : 'flex-start',
        gap: densityConfig?.mode === 'compact' ? '8px' : '4px',
        padding:
          densityConfig?.mode === 'compact'
            ? '6px 12px'
            : densityConfig?.mode === 'spacious'
              ? '12px'
              : '8px 12px',
        cursor: 'pointer',
        transition: 'background-color 0.15s',
        backgroundColor: isSelected ? '#eff6ff' : isHovered ? '#f3f4f6' : 'transparent',
        borderLeft: isSelected ? '2px solid #3b82f6' : '2px solid transparent',
      }),
      [style, isSelected, isHovered, densityConfig?.mode]
    );

    const imgStyle = useMemo(
      () => ({
        width: '16px',
        height: '16px',
        flexShrink: 0,
      }),
      []
    );

    const titleStyle = useMemo(
      () => ({
        flex: 1,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        fontSize: densityConfig?.mode === 'compact' ? '13px' : '14px',
        fontWeight: 500,
        color: '#111827',
        display: '-webkit-box',
        WebkitLineClamp: densityConfig?.titleLines || 1,
        WebkitBoxOrient: 'vertical' as const,
        whiteSpace: densityConfig?.titleLines === 1 ? ('nowrap' as const) : ('normal' as const),
      }),
      [densityConfig?.mode, densityConfig?.titleLines]
    );

    const metaStyle = useMemo(
      () => ({
        fontSize: '11px',
        color: '#9ca3af',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap' as const,
      }),
      []
    );

    const buttonStyle = useMemo(
      () => ({
        color: isCloseHovered ? '#ef4444' : '#9ca3af',
        background: 'none',
        border: 'none',
        fontSize: '18px',
        lineHeight: 1,
        padding: '0 4px',
        cursor: 'pointer',
      }),
      [isCloseHovered]
    );

    const activityDotStyle = useMemo(
      () => ({
        width: '8px',
        height: '8px',
        borderRadius: '50%',
        backgroundColor: indicators.activityColor,
        flexShrink: 0,
      }),
      [indicators.activityColor]
    );

    const badgeStyle = useMemo(
      () => ({
        display: 'inline-flex',
        alignItems: 'center',
        gap: '2px',
        padding: '2px 6px',
        fontSize: '11px',
        fontWeight: 500,
        backgroundColor: '#f3f4f6',
        borderRadius: '4px',
        color: '#374151',
      }),
      []
    );

    // Get badges from indicators
    const badges = indicators.badges;

    // Memoize event handlers
    const handleMouseEnter = useCallback(() => {
      if (!isSelected) {
        setIsHovered(true);
      }
    }, [isSelected]);

    const handleMouseLeave = useCallback(() => {
      setIsHovered(false);
    }, []);

    const handleCloseClick = useCallback(
      (e: React.MouseEvent) => {
        e.stopPropagation();
        onClose();
      },
      [onClose]
    );

    const handleCloseMouseEnter = useCallback(() => {
      setIsCloseHovered(true);
    }, []);

    const handleCloseMouseLeave = useCallback(() => {
      setIsCloseHovered(false);
    }, []);

    const handleImgError = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
      // Use a simple SVG placeholder instead of a non-existent PNG
      e.currentTarget.src =
        'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><rect width="16" height="16" fill="%23ddd"/><text x="8" y="12" text-anchor="middle" font-size="12" fill="%23666">?</text></svg>';
    }, []);

    if (densityConfig?.mode === 'compact') {
      // Compact mode: single row with favicon + title only
      return (
        <div
          style={containerStyle}
          role="option"
          aria-selected={isSelected}
          aria-label={`${tab.title} - ${tab.url}`}
          tabIndex={isSelected ? 0 : -1}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          <span style={activityDotStyle} title={indicators.activityStatus} />
          <img
            src={
              tab.favIconUrl ||
              'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><rect width="16" height="16" fill="%23ddd"/><text x="8" y="12" text-anchor="middle" font-size="12" fill="%23666">?</text></svg>'
            }
            alt=""
            style={imgStyle}
            loading="lazy"
            onError={handleImgError}
          />
          <span style={titleStyle} onClick={onClick}>
            {tab.title}
          </span>
          {badges.length > 0 && (
            <div style={{ display: 'flex', gap: '4px' }}>
              {badges.map((badge, i) => (
                <span key={i} style={badgeStyle}>
                  {badge.icon} {badge.value}
                </span>
              ))}
            </div>
          )}
          <button
            onClick={handleCloseClick}
            style={buttonStyle}
            onMouseEnter={handleCloseMouseEnter}
            onMouseLeave={handleCloseMouseLeave}
            aria-label={`Close ${tab.title}`}
            type="button"
          >
            ×
          </button>
        </div>
      );
    }

    // Normal and Spacious modes: column layout with multiple lines
    return (
      <div
        style={containerStyle}
        role="option"
        aria-selected={isSelected}
        aria-label={`${tab.title} - ${tab.url}`}
        tabIndex={isSelected ? 0 : -1}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%' }}>
          <span style={activityDotStyle} title={indicators.activityStatus} />
          <img
            src={
              tab.favIconUrl ||
              'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><rect width="16" height="16" fill="%23ddd"/><text x="8" y="12" text-anchor="middle" font-size="12" fill="%23666">?</text></svg>'
            }
            alt=""
            style={imgStyle}
            loading="lazy"
            onError={handleImgError}
          />
          <div style={{ flex: 1, overflow: 'hidden', minWidth: 0 }} onClick={onClick}>
            <div style={titleStyle}>{tab.title}</div>
            {densityConfig?.showDomain && domain && <div style={metaStyle}>{domain}</div>}
            {densityConfig?.showUrl && tab.url && <div style={metaStyle}>{tab.url}</div>}
            {densityConfig?.showTimestamp && formattedTime && (
              <div style={metaStyle}>Last accessed: {formattedTime}</div>
            )}
          </div>
          {badges.length > 0 && (
            <div style={{ display: 'flex', gap: '4px' }}>
              {badges.map((badge, i) => (
                <span key={i} style={badgeStyle}>
                  {badge.icon} {badge.value}
                </span>
              ))}
            </div>
          )}
          <button
            onClick={handleCloseClick}
            style={buttonStyle}
            onMouseEnter={handleCloseMouseEnter}
            onMouseLeave={handleCloseMouseLeave}
            aria-label={`Close ${tab.title}`}
            type="button"
          >
            ×
          </button>
        </div>
      </div>
    );
  },
  (prev, next) => {
    // Only re-render if tab data, selection, or density config changed
    return (
      prev.tab.id === next.tab.id &&
      prev.tab.title === next.tab.title &&
      prev.tab.url === next.tab.url &&
      prev.isSelected === next.isSelected &&
      prev.densityConfig?.mode === next.densityConfig?.mode
    );
  }
);
