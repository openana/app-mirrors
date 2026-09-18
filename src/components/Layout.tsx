import { Outlet } from 'react-router';
import Sidebar from '@/components/Sidebar';

export default function Layout() {
  return (
    <div className="app-container">
      <Sidebar />
      <main>
        <Outlet />
      </main>
    </div>
  );
}