import { Outlet } from 'react-router';
import Sidebar from '@/components/Sidebar';
import { ThemeProvider } from '@/contexts/ThemeContext';

export default function Layout() {
  return (
    <ThemeProvider>
      <div className="app-container">
        <Sidebar />
        <main>
          <Outlet />
        </main>
      </div>
    </ThemeProvider>
  );
}