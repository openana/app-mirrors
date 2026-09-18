import { useState, useRef, useEffect } from 'react';
import { NavLink } from 'react-router';
import { useTheme, type ThemePreference } from '@/contexts/ThemeContext';
import { useTranslation, useLocale, type Locale } from '@/i18n';

interface NavItem {
  labelKey: string;
  href: string;
  icon: string;
  external?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { labelKey: 'nav.mirrors', href: '/mirrors/', icon: 'list_alt' },
  { labelKey: 'nav.downloads', href: '/download/', icon: 'get_app' },
  { labelKey: 'nav.news', href: '/news/', icon: 'newspaper' },
  { labelKey: 'nav.help', href: '/help/', icon: 'help_outline' },
];

export default function Sidebar() {
  const { theme, preference, setPreference } = useTheme();
  const { t } = useTranslation();
  const { locale, setLocale, localeLabels } = useLocale();
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
    ['system', 'computer', t('settings.themeSystem')],
    ['light', 'light_mode', t('settings.themeLight')],
    ['dark', 'dark_mode', t('settings.themeDark')],
  ];

  return (
    <nav className="sidebar">
      <NavLink to="/" end className={({ isActive }) => `sidebar-brand${isActive ? ' active' : ''}`}>
        <img src={theme === 'dark' ? '/favicon-dark.svg' : '/favicon-light.svg'} className="sidebar-logo" alt="Mirror" />
      </NavLink>
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
              {t(item.labelKey)}
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
            <h2>{t(item.labelKey)}</h2>
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
        <span className="nav-label">{t('nav.settings')}</span>
      </button>
      {settingsOpen && (
        <div
          className="settings-panel"
          id="settings-panel"
          role="dialog"
          aria-label="Settings"
          ref={settingsPanel}
        >
          <div className="settings-panel-title">{t('settings.title')}</div>
          <div className="settings-section">
            <div className="settings-section-label">
              <span className="material-icons" aria-hidden="true" style={{ fontSize: 18 }}>contrast</span>
              <strong>{t('settings.theme')}</strong>
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
          <div className="settings-section">
            <div className="settings-section-label">
              <span className="material-icons" aria-hidden="true" style={{ fontSize: 18 }}>translate</span>
              <strong>{t('settings.language')}</strong>
            </div>
            <div className="settings-options" role="radiogroup" aria-label="Language">
              {(Object.entries(localeLabels) as [Locale, string][]).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  className={`settings-choice${locale === value ? ' active' : ''}`}
                  role="radio"
                  aria-checked={locale === value}
                  onClick={() => setLocale(value)}
                >
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