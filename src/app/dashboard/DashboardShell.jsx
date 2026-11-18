"use client";

import { useState } from 'react';
import { Sidebar } from '../../components/Sidebar';
import { Header } from '../../components/Header';
import { ConfirmProvider } from '../../components/ConfirmProvider';
import { CommandMenu } from '../../components/CommandMenu';
import { I18nScope } from '../../components/I18nProvider';
import { CapabilityProvider, useCapabilities } from './CapabilityProvider';

/** Nepali/English switching applies to the gym side only; platform-admin pages stay English. */
function Scoped({ children }) {
  const { role, loading } = useCapabilities();
  return <I18nScope enabled={!loading && role !== 'platform_admin'}><ConfirmProvider>{children}<CommandMenu /></ConfirmProvider></I18nScope>;
}

export default function DashboardShell({ children }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <CapabilityProvider>
      <Scoped>
        <div className="min-h-screen bg-[#090909]">
          <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
          <div className="flex min-h-screen min-w-0 flex-col md:ml-64">
            <Header onMenuClick={() => setIsSidebarOpen(true)} />
            <main className="min-w-0 flex-1 bg-[#090909] p-4 sm:p-6 lg:p-8">{children}</main>
          </div>
        </div>
      </Scoped>
    </CapabilityProvider>
  );
}
