import { useState, useRef, useEffect } from 'react';
import { Link, NavLink } from 'react-router';
import { useTheme, type ThemePreference } from '@/contexts/ThemeContext';

interface NavItem {
  label: string;
  href: string;
  icon: string;
  external?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Mirrors', href: '/', icon: 'list_alt' },
  { label: 'Downloads', href: '/download/', icon: 'get_app' },
  { label: 'News', href: '/news/', icon: 'newspaper' },
  { label: 'Help', href: '/help/', icon: 'help_outline' },
  { label: 'About', href: '/about/', icon: 'info_outline' },
];

export default function Sidebar() {
  const { theme, preference, setPreference } = useTheme();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const settingsButton = useRef<HTMLButtonElement>(null);
  const settingsPanel = useRef<HTMLDivElement>(null);

  // Close settings on outside click
  useEffect(() => {
    if (!settingsOpen) return;
    const onClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        !settingsButton.current?.contains(target) &&
        !settingsPanel.current?.contains(target)
      ) {
        setSettingsOpen(false);
      }
    };
    const onEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSettingsOpen(false);
        settingsButton.current?.focus();
      }
    };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onEscape);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onEscape);
    };
  }, [settingsOpen]);

  const themeOptions: [ThemePreference, string, string][] = [
    ['system', 'computer', 'System'],
    ['light', 'light_mode', 'Light'],
    ['dark', 'dark_mode', 'Dark'],
  ];

  return (
    <nav className="sidebar">
      <Link to="/" className="sidebar-brand">
        <img src={theme === 'dark' ? '/favicon-dark.svg' : '/favicon-light.svg'} className="sidebar-logo" alt="Mirror" />
      </Link>
      {NAV_ITEMS.map((item) =>
        item.external ? (
          <a
            key={item.href}
            href={item.href}
            target="_blank"
            rel="noopener"
          >
            <span className="material-icons" aria-hidden="true">
              {item.icon}
            </span>
            <h2>
              {item.label}
              <span className="external-link-icon" aria-hidden="true">
                ↗
              </span>
            </h2>
          </a>
        ) : (
          <NavLink
            key={item.href}
            to={item.href}
            end={item.href === '/'}
            className={({ isActive }) => (isActive ? 'active' : '')}
          >
            <span className="material-icons" aria-hidden="true">
              {item.icon}
            </span>
            <h2>{item.label}</h2>
          </NavLink>
        ),
      )}
      <button
        type="button"
        className="settings-toggle"
        onClick={() => setSettingsOpen((o) => !o)}
        aria-expanded={settingsOpen}
        aria-controls="settings-panel"
        ref={settingsButton}
      >
        <span className="material-icons" aria-hidden="true">settings</span>
        <span className="nav-label">Settings</span>
      </button>
      {settingsOpen && (
        <div
          className="settings-panel"
          id="settings-panel"
          role="dialog"
          aria-label="Settings"
          ref={settingsPanel}
        >
          <div className="settings-panel-title">Settings</div>
          <div className="settings-section">
            <div className="settings-section-label">
              <span className="material-icons" aria-hidden="true" style={{ fontSize: 18 }}>contrast</span>
              <strong>Theme</strong>
            </div>
            <div className="settings-options" role="radiogroup" aria-label="Theme">
              {themeOptions.map(([value, icon, label]) => (
                <button
                  key={value}
                  type="button"
                  className={`settings-choice${preference === value ? ' active' : ''}`}
                  role="radio"
                  aria-checked={preference === value}
                  onClick={() => setPreference(value)}
                >
                  <span className="material-icons" style={{ fontSize: 18 }}>{icon}</span>
                  <span>{label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}