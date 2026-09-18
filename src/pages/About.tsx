function Para({
  title,
  icon,
  description,
  children,
}: {
  title: string;
  icon: string;
  description: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="para">
      <div className="para-title">
        <div className="para-title-icon">
          <span className="material-icons" aria-hidden="true">{icon}</span>
        </div>
        <div className="para-title-text">{title}</div>
      </div>
      <p className="para-description">{description}</p>
      {children && <div className="para-content">{children}</div>}
    </div>
  );
}

export default function About() {
  return (
    <div className="about">
      <div className="about-col">
        <h1 className="about-title">Mirror Site</h1>

        <Para
          title="Overview"
          icon="info_outline"
          description="A software mirror site providing fast and reliable access to open-source packages and distributions."
        >
          <p>
            This mirror site provides synchronized copies of popular open-source software
            repositories, enabling faster downloads for users in our region. All mirrors
            are automatically synchronized with their upstream sources on a regular schedule.
          </p>
        </Para>

        <Para
          title="Guide"
          icon="explore"
          description="How to use this mirror site effectively."
        >
          <ul className="about-guide">
            <li className="about-guide-item">
              <h3>Browse Mirrors</h3>
              <p>View all available mirrors with real-time sync status on the home page.</p>
            </li>
            <li className="about-guide-item">
              <h3>Download ISOs</h3>
              <p>Find installation images and download links in the Downloads section.</p>
            </li>
            <li className="about-guide-item">
              <h3>Read Help Docs</h3>
              <p>Get configuration instructions for each mirror in the Help section.</p>
            </li>
            <li className="about-guide-item">
              <h3>Check News</h3>
              <p>Stay informed about maintenance windows and new mirror additions.</p>
            </li>
          </ul>
        </Para>

        <Para
          title="Project"
          icon="code"
          description="This mirror site is built with open-source technologies."
        >
          <p>
            Built with{' '}
            <a href="https://vitejs.dev" target="_blank" rel="noopener">Vite</a>,{' '}
            <a href="https://react.dev" target="_blank" rel="noopener">React</a>, and{' '}
            <a href="https://reactrouter.com" target="_blank" rel="noopener">React Router</a>.
            Design inspired by{' '}
            <a href="https://mirrorz.org" target="_blank" rel="noopener">MirrorZ</a>.
          </p>
          <ul className="about-url-list">
            <li><a href="https://github.com/mirrorz-org/mirrorz" target="_blank" rel="noopener">GitHub Repository</a></li>
          </ul>
        </Para>

        <Para
          title="Contact"
          icon="mail"
          description="Get in touch with the mirror administrators."
        >
          <p>
            For issues, suggestions, or mirror requests, please open an issue on our
            GitHub repository or contact the site administrators.
          </p>
        </Para>
      </div>
    </div>
  );
}