"use client";

import {
    Home,
    Library,
    Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "../../lib/utils";

const mobileNavItems = [
  { href: "/dashboard", label: "Home", icon: Home },
  { href: "/dashboard/sessions", label: "Sessions", icon: Users },
  { href: "/dashboard/files", label: "Files", icon: Library },
];

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-neutral-900 border-t border-neutral-200 dark:border-neutral-800 md:hidden">
      <div className="flex items-center justify-around h-16 px-2">
        {mobileNavItems.map((item) => {
          const isActive = pathname === item.href || 
            (item.href !== "/dashboard" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 px-3 py-2 rounded-lg transition-colors min-w-[60px]",
                isActive
                  ? "text-primary-600 dark:text-primary-400"
                  : "text-neutral-500 dark:text-neutral-400"
              )}
            >
              <item.icon className={cn(
                "h-5 w-5",
                isActive && "text-primary-600 dark:text-primary-400"
              )} />
              <span className={cn(
                "text-[10px] font-medium",
                isActive && "text-primary-600 dark:text-primary-400"
              )}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
      
      {/* Safe area padding for devices with home indicator */}
      <div className="h-safe-area-inset-bottom bg-white dark:bg-neutral-900" />
    </nav>
  );
}
