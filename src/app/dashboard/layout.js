import { Sidebar } from '../../components/Sidebar';
import { Header } from '../../components/Header';

export default function DashboardLayout({ children }) {
  return (
    <div className="flex">
      <Sidebar />
      <div className="ml-64 flex-1">
        <Header />
        <main className="p-6 bg-black min-h-[calc(100vh-64px)]">{children}</main>
      </div>
    </div>
  );
}