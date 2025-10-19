type View = 'categories' | 'search' | 'duplicates' | 'jira' | 'sessions';

interface PopupNavigationProps {
  activeView: View;
  onViewChange: (view: View) => void;
}

export function PopupNavigation({ activeView, onViewChange }: PopupNavigationProps) {
  return (
    <nav className="popup-nav">
      <button
        onClick={() => onViewChange('search')}
        className={activeView === 'search' ? 'nav-btn active' : 'nav-btn'}
      >
        Search
      </button>
      <button
        onClick={() => onViewChange('categories')}
        className={activeView === 'categories' ? 'nav-btn active' : 'nav-btn'}
      >
        Categories
      </button>
      <button
        onClick={() => onViewChange('jira')}
        className={activeView === 'jira' ? 'nav-btn active' : 'nav-btn'}
      >
        Jira
      </button>
      <button
        onClick={() => onViewChange('duplicates')}
        className={activeView === 'duplicates' ? 'nav-btn active' : 'nav-btn'}
      >
        Duplicates
      </button>
      <button
        onClick={() => onViewChange('sessions')}
        className={activeView === 'sessions' ? 'nav-btn active' : 'nav-btn'}
      >
        Sessions
      </button>
    </nav>
  );
}
