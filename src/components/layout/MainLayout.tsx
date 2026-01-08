"use client";

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import { useIsMobile } from '@/hooks/use-mobile';
import { MadeWithDyad } from '@/components/made-with-dyad';
import React from 'react';

interface MainLayoutProps {
  children: React.ReactNode;
  title: string;
  hideGlobalSearch?: boolean;
  hideValues?: boolean; // Made optional
  setHideValues?: (hide: boolean) => void; // Made optional
}

const MainLayout = ({ children, title, hideGlobalSearch, hideValues = false, setHideValues = () => {} }: MainLayoutProps) => {
  const { loading, user } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const isMobile = useIsMobile();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      {/* Sidebar - Desktop */}
      {!isMobile && (
        <aside className="w-72 flex-shrink-0 hidden lg:block">
          <Sidebar />
        </aside>
      )}

      {/* Mobile Sidebar Overlay */}
      {isMobile && sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden" 
          onClick={() => setSidebarOpen(false)}
        >
          <div className="w-72 h-full" onClick={(e) => e.stopPropagation()}>
            <Sidebar />
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <Topbar 
          onMenuClick={() => setSidebarOpen(true)} 
          title={title} 
          hideGlobalSearch={hideGlobalSearch}
          hideValues={hideValues}
          setHideValues={setHideValues}
        />
        <main className="flex-1 overflow-y-auto p-6">
          {children}
          <MadeWithDyad />
        </main>
      </div>
    </div>
  );
};

export default MainLayout;