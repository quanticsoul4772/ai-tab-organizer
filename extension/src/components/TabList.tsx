import React from 'react';
import type { Tab } from '../types';

interface TabListProps {
  tabs: Tab[];
  onTabClick: (tabId: number) => void;
  onTabClose: (tabId: number) => void;
}

/**
 * Component for rendering a list of tabs
 */
export function TabList({ tabs, onTabClick, onTabClose }: TabListProps) {
  return (
    <div className="tabs">
      {tabs.map((tab) => (
        <div key={tab.id} className="tab">
          <img
            src={tab.favIconUrl || 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg"/>'}
            className="favicon"
            alt=""
          />
          <div className="tab-info" onClick={() => onTabClick(tab.id)}>
            <div className="tab-title">{tab.title}</div>
            <div className="tab-url">{new URL(tab.url).hostname}</div>
          </div>
          <button onClick={() => onTabClose(tab.id)} className="close-btn">
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}
