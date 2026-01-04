"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  BarChart3,
  TrendingUp,
  DollarSign,
  Cpu,
  Clock,
  Shield,
  Zap,
  PieChart,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface AnalyticsData {
  summary: {
    totalMessages: number;
    totalCost: number;
    totalSaved: number;
    totalCloudCost: number;
    savingsPercent: number;
    totalTokens: number;
    avgLatency: number;
  };
  costOverTime: Array<{
    date: string;
    cost: number;
    saved: number;
    messages: number;
  }>;
  modelUsage: Array<{
    model: string;
    count: number;
    cost: number;
    saved: number;
    tokens: number;
  }>;
  providerUsage: Array<{
    provider: string;
    count: number;
    cost: number;
    isLocal: number;
  }>;
  routing: {
    localMessages: number;
    cloudMessages: number;
    piiDetectedCount: number;
    localPercent: number;
  };
  range: string;
}

type TimeRange = "day" | "week" | "month" | "year";

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState<TimeRange>("month");

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/analytics?range=${range}`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error("Failed to fetch analytics:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [range]);

  const formatCost = (cost: number) => {
    if (cost < 0.01) return `$${(cost * 100).toFixed(4)}¢`;
    return `$${cost.toFixed(4)}`;
  };

  const formatCostINR = (cost: number) => {
    const inr = cost * 83; // Approximate USD to INR
    return `₹${inr.toFixed(2)}`;
  };

  const getRangeLabel = (r: TimeRange) => {
    switch (r) {
      case "day": return "Today";
      case "week": return "This Week";
      case "month": return "This Month";
      case "year": return "This Year";
    }
  };

  const getMaxValue = (arr: number[]) => Math.max(...arr, 1);

  if (loading && !data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-neutral-50 to-neutral-100 dark:from-neutral-900 dark:to-neutral-800 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-8 w-48 bg-neutral-200 dark:bg-neutral-700 rounded" />
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-32 bg-neutral-200 dark:bg-neutral-700 rounded-xl" />
              ))}
            </div>
            <div className="h-80 bg-neutral-200 dark:bg-neutral-700 rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-50 to-neutral-100 dark:from-neutral-900 dark:to-neutral-800 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-neutral-900 dark:text-white flex items-center gap-2">
              <BarChart3 className="h-8 w-8 text-primary-500" />
              Analytics Dashboard
            </h1>
            <p className="text-neutral-600 dark:text-neutral-400 mt-1">
              Track your AI usage, costs, and savings from optimal routing
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Time Range Selector */}
            <div className="flex bg-white dark:bg-neutral-800 rounded-lg p-1 shadow-sm">
              {(["day", "week", "month", "year"] as TimeRange[]).map((r) => (
                <button
                  key={r}
                  onClick={() => setRange(r)}
                  className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
                    range === r
                      ? "bg-primary-500 text-white"
                      : "text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-700"
                  }`}
                >
                  {getRangeLabel(r)}
                </button>
              ))}
            </div>
            <Button variant="outline" size="icon" onClick={fetchAnalytics} disabled={loading}>
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total Messages */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-neutral-800 rounded-xl p-6 shadow-sm border border-neutral-200 dark:border-neutral-700"
          >
            <div className="flex items-center justify-between">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <Cpu className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <span className="text-sm text-neutral-500">Messages</span>
            </div>
            <div className="mt-4">
              <div className="text-3xl font-bold text-neutral-900 dark:text-white">
                {data?.summary.totalMessages.toLocaleString() || 0}
              </div>
              <div className="text-sm text-neutral-500 mt-1">
                {data?.summary.totalTokens.toLocaleString() || 0} tokens used
              </div>
            </div>
          </motion.div>

          {/* Total Cost */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white dark:bg-neutral-800 rounded-xl p-6 shadow-sm border border-neutral-200 dark:border-neutral-700"
          >
            <div className="flex items-center justify-between">
              <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <DollarSign className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <span className="text-sm text-neutral-500">Total Cost</span>
            </div>
            <div className="mt-4">
              <div className="text-3xl font-bold text-neutral-900 dark:text-white">
                {formatCost(data?.summary.totalCost || 0)}
              </div>
              <div className="text-sm text-neutral-500 mt-1">
                {formatCostINR(data?.summary.totalCost || 0)}
              </div>
            </div>
          </motion.div>

          {/* Cost Saved */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-gradient-to-br from-accent-500 to-accent-600 rounded-xl p-6 shadow-sm text-white"
          >
            <div className="flex items-center justify-between">
              <div className="p-2 bg-white/20 rounded-lg">
                <TrendingUp className="h-5 w-5" />
              </div>
              <div className="flex items-center text-sm bg-white/20 px-2 py-1 rounded-full">
                <ArrowUpRight className="h-3 w-3 mr-1" />
                {data?.summary.savingsPercent || 0}% saved
              </div>
            </div>
            <div className="mt-4">
              <div className="text-3xl font-bold">
                {formatCost(data?.summary.totalSaved || 0)}
              </div>
              <div className="text-sm text-white/80 mt-1">
                Cost saved by smart routing
              </div>
            </div>
          </motion.div>

          {/* Avg Latency */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white dark:bg-neutral-800 rounded-xl p-6 shadow-sm border border-neutral-200 dark:border-neutral-700"
          >
            <div className="flex items-center justify-between">
              <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                <Zap className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
              <span className="text-sm text-neutral-500">Avg Latency</span>
            </div>
            <div className="mt-4">
              <div className="text-3xl font-bold text-neutral-900 dark:text-white">
                {data?.summary.avgLatency || 0}ms
              </div>
              <div className="text-sm text-neutral-500 mt-1">
                Response time
              </div>
            </div>
          </motion.div>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Cost Over Time Chart */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-white dark:bg-neutral-800 rounded-xl p-6 shadow-sm border border-neutral-200 dark:border-neutral-700"
          >
            <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-4 flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary-500" />
              Cost & Savings Over Time
            </h3>
            <div className="h-64 flex items-end gap-1">
              {data?.costOverTime && data.costOverTime.length > 0 ? (
                data.costOverTime.slice(-14).map((item, i) => {
                  const maxCost = getMaxValue(data.costOverTime.map((d) => d.cost + d.saved));
                  const costHeight = ((item.cost / maxCost) * 100) || 1;
                  const savedHeight = ((item.saved / maxCost) * 100) || 0;
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1">
                      <div className="w-full flex flex-col justify-end h-48">
                        <div
                          className="w-full bg-accent-500 rounded-t"
                          style={{ height: `${savedHeight}%` }}
                          title={`Saved: ${formatCost(item.saved)}`}
                        />
                        <div
                          className="w-full bg-primary-500 rounded-b"
                          style={{ height: `${costHeight}%` }}
                          title={`Cost: ${formatCost(item.cost)}`}
                        />
                      </div>
                      <span className="text-xs text-neutral-500 rotate-45 origin-left whitespace-nowrap">
                        {item.date.slice(-5)}
                      </span>
                    </div>
                  );
                })
              ) : (
                <div className="flex-1 flex items-center justify-center text-neutral-500">
                  No data for this period
                </div>
              )}
            </div>
            <div className="flex items-center gap-4 mt-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-primary-500 rounded" />
                <span className="text-neutral-600 dark:text-neutral-400">Cost</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-accent-500 rounded" />
                <span className="text-neutral-600 dark:text-neutral-400">Saved</span>
              </div>
            </div>
          </motion.div>

          {/* Model Usage */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-white dark:bg-neutral-800 rounded-xl p-6 shadow-sm border border-neutral-200 dark:border-neutral-700"
          >
            <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-4 flex items-center gap-2">
              <PieChart className="h-5 w-5 text-primary-500" />
              Model Usage & Savings
            </h3>
            <div className="space-y-3">
              {data?.modelUsage && data.modelUsage.length > 0 ? (
                data.modelUsage.slice(0, 6).map((model, i) => {
                  const maxCount = data.modelUsage[0]?.count || 1;
                  const width = (model.count / maxCount) * 100;
                  const colors = [
                    "bg-blue-500",
                    "bg-green-500",
                    "bg-purple-500",
                    "bg-orange-500",
                    "bg-pink-500",
                    "bg-cyan-500",
                  ];
                  return (
                    <div key={model.model} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium text-neutral-700 dark:text-neutral-300 truncate">
                          {model.model}
                        </span>
                        <div className="flex items-center gap-3 text-neutral-500">
                          <span>{model.count} msgs</span>
                          <span className="text-accent-600 dark:text-accent-400">
                            +{formatCost(model.saved)} saved
                          </span>
                        </div>
                      </div>
                      <div className="h-2 bg-neutral-100 dark:bg-neutral-700 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${colors[i % colors.length]} rounded-full transition-all`}
                          style={{ width: `${width}%` }}
                        />
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center text-neutral-500 py-8">
                  No model usage data
                </div>
              )}
            </div>
          </motion.div>
        </div>

        {/* Routing Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="bg-white dark:bg-neutral-800 rounded-xl p-6 shadow-sm border border-neutral-200 dark:border-neutral-700"
        >
          <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-4 flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary-500" />
            Smart Routing & Privacy
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="text-center p-4 bg-neutral-50 dark:bg-neutral-700/50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {data?.routing.cloudMessages || 0}
              </div>
              <div className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">
                🌐 Cloud Processed
              </div>
            </div>
            <div className="text-center p-4 bg-neutral-50 dark:bg-neutral-700/50 rounded-lg">
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                {data?.routing.localMessages || 0}
              </div>
              <div className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">
                🏠 Local Processed
              </div>
            </div>
            <div className="text-center p-4 bg-neutral-50 dark:bg-neutral-700/50 rounded-lg">
              <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                {data?.routing.piiDetectedCount || 0}
              </div>
              <div className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">
                🔐 PII Detected
              </div>
            </div>
            <div className="text-center p-4 bg-gradient-to-br from-accent-500 to-accent-600 rounded-lg text-white">
              <div className="text-2xl font-bold">
                {data?.routing.localPercent || 0}%
              </div>
              <div className="text-sm text-white/80 mt-1">
                Privacy Protected
              </div>
            </div>
          </div>
        </motion.div>

        {/* Provider Breakdown */}
        {data?.providerUsage && data.providerUsage.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="bg-white dark:bg-neutral-800 rounded-xl p-6 shadow-sm border border-neutral-200 dark:border-neutral-700"
          >
            <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-4 flex items-center gap-2">
              <Cpu className="h-5 w-5 text-primary-500" />
              Provider Breakdown
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {data.providerUsage.map((provider) => (
                <div
                  key={provider.provider}
                  className="p-4 bg-neutral-50 dark:bg-neutral-700/50 rounded-lg"
                >
                  <div className="font-medium text-neutral-900 dark:text-white capitalize">
                    {provider.provider}
                  </div>
                  <div className="text-2xl font-bold text-primary-600 dark:text-primary-400 mt-1">
                    {provider.count}
                  </div>
                  <div className="text-sm text-neutral-500 mt-1">
                    {formatCost(provider.cost)} spent
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Empty State */}
        {data?.summary.totalMessages === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12"
          >
            <BarChart3 className="h-16 w-16 mx-auto text-neutral-300 dark:text-neutral-600 mb-4" />
            <h3 className="text-xl font-semibold text-neutral-700 dark:text-neutral-300">
              No analytics data yet
            </h3>
            <p className="text-neutral-500 mt-2">
              Start chatting with the AI to see your usage analytics here
            </p>
          </motion.div>
        )}
      </div>
    </div>
  );
}
