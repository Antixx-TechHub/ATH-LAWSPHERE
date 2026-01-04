"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  Home,
  Library,
  Settings,
  MessageSquare,
  FileText,
  StickyNote,
  ChevronLeft,
  ChevronRight,
  Users,
  ShieldCheck,
  BarChart3,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

const navItems = [
  { href: "/dashboard", label: "Home", icon: Home },
  { href: "/dashboard/chat", label: "Chat", icon: MessageSquare },
  { href: "/dashboard/files", label: "Library", icon: Library },
  { href: "/dashboard/notes", label: "Notes", icon: StickyNote },
  { href: "/dashboard/sessions", label: "Sessions", icon: Users },
  { href: "/dashboard/analytics", label: "Analytics", icon: BarChart3 },
];

const bottomNavItems = [
  { href: "/dashboard/privacy", label: "Privacy", icon: ShieldCheck },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 h-screen bg-white dark:bg-neutral-900 border-r border-neutral-200 dark:border-neutral-800 transition-all duration-300",
        collapsed ? "w-14" : "w-52"
      )}
    >
      {/* Logo */}
      <div className="flex items-center justify-center h-20 px-3 border-b border-neutral-200 dark:border-neutral-800 bg-gradient-to-r from-cyan-50 via-white to-white dark:from-cyan-950/30 dark:via-neutral-900 dark:to-neutral-900">
        <Link href="/dashboard" className="flex items-center gap-3">
          <div className="h-14 w-14 rounded-xl bg-gradient-to-br from-cyan-400 to-teal-500 p-0.5 shadow-lg shadow-cyan-500/30 dark:shadow-cyan-400/20 flex-shrink-0">
            <div className="h-full w-full rounded-[10px] bg-white dark:bg-neutral-900 overflow-hidden flex items-center justify-center p-0.5">
              <Image
                src="/lawsphere-logo.svg"
                alt="Lawsphere"
                width={48}
                height={48}
                className="h-12 w-12 object-contain"
              />
            </div>
          </div>
          {!collapsed && (
            <div className="flex flex-col leading-tight">
              <span className="font-display text-base font-extrabold text-[#1A365D] dark:text-cyan-400 tracking-wider">
                LAW
              </span>
              <span className="font-display text-base font-extrabold text-[#1A365D] dark:text-cyan-400 tracking-wider">
                SPHERE
              </span>
            </div>
          )}
        </Link>
      </div>
      
      {/* Collapse Toggle */}
      <div className="absolute top-2 right-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggle}
          className="h-7 w-7"
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex flex-col h-[calc(100vh-5rem)] p-2">
        <div className="flex-1 space-y-0.5">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-2 px-2.5 py-1.5 rounded-md transition-colors",
                  isActive
                    ? "bg-primary-100 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400"
                    : "text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800",
                  collapsed && "justify-center"
                )}
              >
                <item.icon className="h-4 w-4 flex-shrink-0" />
                {!collapsed && (
                  <span className="font-medium text-xs">{item.label}</span>
                )}
              </Link>
            );
          })}
        </div>

        {/* Bottom Navigation */}
        <div className="border-t border-neutral-200 dark:border-neutral-800 pt-2 space-y-0.5">
          {bottomNavItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-2 px-2.5 py-1.5 rounded-md transition-colors",
                  isActive
                    ? "bg-primary-100 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400"
                    : "text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800",
                  collapsed && "justify-center"
                )}
              >
                <item.icon className="h-4 w-4 flex-shrink-0" />
                {!collapsed && (
                  <span className="font-medium text-xs">{item.label}</span>
                )}
              </Link>
            );
          })}
        </div>
      </nav>
    </aside>
  );
}
