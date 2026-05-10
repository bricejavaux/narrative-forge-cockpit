import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';

export default function AppLayout() {
  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <div className="ml-60 flex flex-col min-h-screen">
        <Header />
        <main className="flex-1 px-8 py-8 overflow-auto max-w-[1600px] w-full">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
