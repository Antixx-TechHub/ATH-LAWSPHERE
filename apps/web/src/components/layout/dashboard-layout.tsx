"use client";

import { ReactNode, useState, useEffect } from "react";
import { Sidebar } from "./sidebar";
import { TopBar } from "./top-bar";
import { Footer } from "./footer";
import { MobileNav } from "./mobile-nav";

interface DashboardLayoutProps {
  children: ReactNode;
  user?: {
    id: string;
    name?: string | null;
    email: string;
    image?: string | null;
  };
}

export function DashboardLayout({ children, user }: DashboardLayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Detect mobile screen size
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
      if (window.innerWidth >= 768) {
        setMobileMenuOpen(false);
      }
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Close mobile menu when navigating
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [children]);

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 flex flex-col">
      {/* Desktop Sidebar - hidden on mobile */}
      <div className="hidden md:block">
        <Sidebar
          collapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        />
      </div>

      {/* Mobile Sidebar Overlay */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Mobile Sidebar - slide in from left */}
      <div className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-neutral-900 
        transform transition-transform duration-300 ease-in-out md:hidden
        ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <Sidebar
          collapsed={false}
          onToggle={() => setMobileMenuOpen(false)}
          isMobile={true}
          onClose={() => setMobileMenuOpen(false)}
        />
      </div>

      {/* Main Content Area */}
      <div
        className={`flex-1 flex flex-col transition-all duration-300 
          ${isMobile ? 'ml-0' : (sidebarCollapsed ? 'ml-14' : 'ml-52')}
          pb-16 md:pb-0
        `}
      >
        {/* Top Bar */}
        <TopBar 
          user={user} 
          onMenuClick={() => setMobileMenuOpen(true)}
          showMenuButton={isMobile}
        />

        {/* Page Content */}
        <main className="flex-1 p-2 md:p-4">{children}</main>

        {/* Footer - hidden on mobile (bottom nav takes its place) */}
        <div className="hidden md:block">
          <Footer />
        </div>
      </div>

      {/* Mobile Bottom Navigation */}
      <MobileNav />
    </div>
  );
}
