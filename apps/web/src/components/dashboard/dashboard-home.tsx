"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  MessageSquare,
  FileText,
  StickyNote,
  Users,
  TrendingUp,
  Clock,
  Plus,
  ArrowRight,
  Bot,
} from "lucide-react";

interface DashboardHomeProps {
  user?: {
    id: string;
    name?: string | null;
    email: string;
  };
}

const stats = [
  {
    title: "Active Sessions",
    value: "12",
    change: "+2",
    icon: Users,
    color: "text-primary-600",
    bgColor: "bg-primary-100",
  },
  {
    title: "Documents",
    value: "248",
    change: "+15",
    icon: FileText,
    color: "text-accent-600",
    bgColor: "bg-accent-100",
  },
  {
    title: "AI Interactions",
    value: "1,847",
    change: "+234",
    icon: Bot,
    color: "text-purple-600",
    bgColor: "bg-purple-100",
  },
  {
    title: "Notes",
    value: "67",
    change: "+8",
    icon: StickyNote,
    color: "text-amber-600",
    bgColor: "bg-amber-100",
  },
];

const recentSessions = [
  {
    id: "1",
    name: "Contract Review - ABC Corp",
    participants: 3,
    lastActive: "5 min ago",
  },
  {
    id: "2",
    name: "Legal Research - Patent Case",
    participants: 2,
    lastActive: "1 hour ago",
  },
  {
    id: "3",
    name: "Client Consultation - Smith v. Jones",
    participants: 4,
    lastActive: "3 hours ago",
  },
];

const quickActions = [
  {
    title: "New Chat Session",
    description: "Start a new AI-powered legal chat",
    href: "/dashboard/chat",
    icon: MessageSquare,
    color: "bg-primary-600 hover:bg-primary-700",
  },
  {
    title: "Upload Documents",
    description: "Add files for analysis",
    href: "/dashboard/files",
    icon: FileText,
    color: "bg-accent-600 hover:bg-accent-700",
  },
  {
    title: "Create Note",
    description: "Start a collaborative note",
    href: "/dashboard/notes",
    icon: StickyNote,
    color: "bg-amber-600 hover:bg-amber-700",
  },
];

export function DashboardHome({ user }: DashboardHomeProps) {
  const greeting = getGreeting();

  return (
    <div className="space-y-4 md:space-y-5 pb-16 md:pb-0">
      {/* Welcome Section */}
      <div>
        <h1 className="text-lg md:text-xl font-display font-bold text-neutral-900 dark:text-white">
          {greeting}, {user?.name?.split(" ")[0] || "there"}!
        </h1>
        <p className="text-neutral-600 dark:text-neutral-400 mt-0.5 text-xs md:text-sm hidden sm:block">
          Here's what's happening with your legal work today.
        </p>
      </div>

      {/* Stats Grid - Mobile Responsive */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 md:gap-4">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardContent className="p-3 md:p-4">
              <div className="flex items-start md:items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] md:text-xs font-medium text-neutral-600 dark:text-neutral-400 truncate">
                    {stat.title}
                  </p>
                  <p className="text-lg md:text-xl font-bold mt-0.5">{stat.value}</p>
                  <div className="flex items-center gap-1 mt-0.5 text-[10px] md:text-xs text-accent-600">
                    <TrendingUp className="h-2.5 w-2.5 md:h-3 md:w-3" />
                    <span className="hidden sm:inline">{stat.change} this week</span>
                    <span className="sm:hidden">{stat.change}</span>
                  </div>
                </div>
                <div className={`p-1.5 md:p-2 rounded-md ${stat.bgColor} flex-shrink-0`}>
                  <stat.icon className={`h-4 w-4 md:h-5 md:w-5 ${stat.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 md:gap-4">
        {/* Quick Actions */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader className="py-3 px-4">
              <CardTitle className="text-xs md:text-sm font-semibold flex items-center gap-1.5">
                <Plus className="h-3.5 w-3.5 md:h-4 md:w-4" />
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 px-4 pb-4">
              {quickActions.map((action) => (
                <Link key={action.href} href={action.href}>
                  <div className="flex items-center gap-2 md:gap-3 p-2 rounded-md border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors">
                    <div className={`p-1 md:p-1.5 rounded-md ${action.color}`}>
                      <action.icon className="h-3.5 w-3.5 md:h-4 md:w-4 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-xs">{action.title}</p>
                      <p className="text-[10px] text-neutral-500 hidden sm:block">
                        {action.description}
                      </p>
                    </div>
                    <ArrowRight className="h-3 w-3 md:h-3.5 md:w-3.5 text-neutral-400 flex-shrink-0" />
                  </div>
                </Link>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Recent Sessions - Mobile Responsive */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between py-3 px-4">
              <CardTitle className="text-xs md:text-sm font-semibold flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 md:h-4 md:w-4" />
                Recent Sessions
              </CardTitle>
              <Link href="/dashboard/sessions">
                <Button variant="ghost" size="sm" className="h-7 text-xs px-2">
                  View all
                  <ArrowRight className="ml-1 h-3 w-3" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="space-y-2 md:space-y-3">
                {recentSessions.map((session) => (
                  <Link
                    key={session.id}
                    href={`/dashboard/chat?session=${session.id}`}
                  >
                    <div className="flex items-center justify-between p-2 md:p-3 rounded-md border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors">
                      <div className="flex items-center gap-2 md:gap-3 flex-1 min-w-0">
                        <div className="p-1 md:p-1.5 rounded-md bg-primary-100 dark:bg-primary-900/20 flex-shrink-0">
                          <MessageSquare className="h-3.5 w-3.5 md:h-4 md:w-4 text-primary-600" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-xs md:text-sm truncate">{session.name}</p>
                          <p className="text-[10px] md:text-xs text-neutral-500 hidden sm:block">
                            {session.participants} participants
                          </p>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-[10px] md:text-xs text-neutral-500">
                          {session.lastActive}
                        </p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}
