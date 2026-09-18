import { NavLink } from 'react-router';

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
  { label: 'Help', href: '/help/', icon: 'help_outline', external: true },
  { label: 'About', href: '/about/', icon: 'info_outline' },
];

export default function Sidebar() {
  return (
    <nav className="sidebar">
      <NavLink to="/" className="sidebar-brand">
        <img src="/favicon.svg" className="sidebar-logo" alt="Mirror" />
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
      <button type="button" className="settings-toggle">
        <span className="material-icons" aria-hidden="true">settings</span>
        <span className="nav-label">Settings</span>
      </button>
    </nav>
  );
}