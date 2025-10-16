import React from 'react';
import type { CategorizedTabs } from '../types';
import { TabList } from './TabList';

interface CategoryViewProps {
  categorizedTabs: CategorizedTabs;
  onTabClick: (tabId: number) => void;
  onTabClose: (tabId: number) => void;
}

/**
 * Component for rendering categorized tabs
 */
export function CategoryView({ categorizedTabs, onTabClick, onTabClose }: CategoryViewProps) {
  return (
    <div className="categories">
      {Object.entries(categorizedTabs).map(([category, categoryTabs]) => (
        <div key={category} className="category">
          <h3>
            {category} ({categoryTabs.length})
          </h3>
          <TabList tabs={categoryTabs} onTabClick={onTabClick} onTabClose={onTabClose} />
        </div>
      ))}
    </div>
  );
}
