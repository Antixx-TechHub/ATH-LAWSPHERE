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
  Globe,
} from "lucide-react";
import { Button } from "../../components/ui/button";

// Currency configurations
type Currency = "USD" | "INR" | "EUR" | "GBP";

const CURRENCIES: Record<Currency, { symbol: string; name: string; rate: number }> = {
  USD: { symbol: "$", name: "US Dollar", rate: 1 },
  INR: { symbol: "₹", name: "Indian Rupee", rate: 83.5 },
  EUR: { symbol: "€", name: "Euro", rate: 0.92 },
  GBP: { symbol: "£", name: "British Pound", rate: 0.79 },
};

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
  const [currency, setCurrency] = useState<Currency>("USD");

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

  // Convert USD to selected currency
  const convertCurrency = (usdAmount: number): number => {
    return usdAmount * CURRENCIES[currency].rate;
  };

  const formatCost = (cost: number) => {
    const converted = convertCurrency(cost);
    const { symbol } = CURRENCIES[currency];
    
    if (currency === "USD") {
      if (converted < 0.01) return `${(converted * 100).toFixed(4)}¢`;
      return `${symbol}${converted.toFixed(4)}`;
    }
    
    // For other currencies, show 2-4 decimal places based on amount
    if (converted < 1) return `${symbol}${converted.toFixed(4)}`;
    return `${symbol}${converted.toFixed(2)}`;
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
      <div className="min-h-screen bg-gradient-to-br from-neutral-50 to-neutral-100 dark:from-neutral-900 dark:to-neutral-800 p-4 md:p-8 pb-20 md:pb-8">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse space-y-4 md:space-y-6">
            <div className="h-6 md:h-8 w-32 md:w-48 bg-neutral-200 dark:bg-neutral-700 rounded" />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-24 md:h-32 bg-neutral-200 dark:bg-neutral-700 rounded-xl" />
              ))}
            </div>
            <div className="h-60 md:h-80 bg-neutral-200 dark:bg-neutral-700 rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-50 to-neutral-100 dark:from-neutral-900 dark:to-neutral-800 p-3 md:p-8 pb-20 md:pb-8">
      <div className="max-w-7xl mx-auto space-y-4 md:space-y-6">
        {/* Header - Mobile Responsive */}
        <div className="flex flex-col gap-3 md:gap-4">
          <div>
            <h1 className="text-xl md:text-3xl font-bold text-neutral-900 dark:text-white flex items-center gap-2">
              <BarChart3 className="h-5 w-5 md:h-8 md:w-8 text-primary-500" />
              Analytics
            </h1>
            <p className="text-xs md:text-base text-neutral-600 dark:text-neutral-400 mt-1 hidden sm:block">
              Track your AI usage, costs, and savings from optimal routing
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            {/* Time Range Selector - Compact on mobile */}
            <div className="flex bg-white dark:bg-neutral-800 rounded-lg p-1 shadow-sm overflow-x-auto">
              {(["day", "week", "month", "year"] as TimeRange[]).map((r) => (
                <button
                  key={r}
                  onClick={() => setRange(r)}
                  className={`px-2 md:px-4 py-1.5 md:py-2 text-xs md:text-sm font-medium rounded-md transition-all whitespace-nowrap ${
                    range === r
                      ? "bg-primary-500 text-white"
                      : "text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-700"
                  }`}
                >
                  {getRangeLabel(r)}
                </button>
              ))}
            </div>
            
            {/* Currency Selector - Compact on mobile */}
            <div className="flex bg-white dark:bg-neutral-800 rounded-lg p-1 shadow-sm overflow-x-auto">
              {(Object.keys(CURRENCIES) as Currency[]).map((c) => (
                <button
                  key={c}
                  onClick={() => setCurrency(c)}
                  className={`px-2 md:px-3 py-1.5 md:py-2 text-xs md:text-sm font-medium rounded-md transition-all whitespace-nowrap ${
                    currency === c
                      ? "bg-accent-500 text-white"
                      : "text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-700"
                  }`}
                  title={CURRENCIES[c].name}
                >
                  {CURRENCIES[c].symbol}
                </button>
              ))}
            </div>
            
            <Button variant="outline" size="icon" onClick={fetchAnalytics} disabled={loading} className="h-8 w-8 md:h-9 md:w-9 self-end sm:self-auto">
              <RefreshCw className={`h-3.5 w-3.5 md:h-4 md:w-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </div>

        {/* Summary Cards - Mobile Responsive */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          {/* Total Messages */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-neutral-800 rounded-xl p-3 md:p-6 shadow-sm border border-neutral-200 dark:border-neutral-700"
          >
            <div className="flex items-center justify-between">
              <div className="p-1.5 md:p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <Cpu className="h-4 w-4 md:h-5 md:w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <span className="text-[10px] md:text-sm text-neutral-500">Messages</span>
            </div>
            <div className="mt-2 md:mt-4">
              <div className="text-lg md:text-3xl font-bold text-neutral-900 dark:text-white">
                {data?.summary.totalMessages.toLocaleString() || 0}
              </div>
              <div className="text-[10px] md:text-sm text-neutral-500 mt-0.5 md:mt-1 truncate">
                {data?.summary.totalTokens.toLocaleString() || 0} tokens
              </div>
            </div>
          </motion.div>

          {/* Total Cost */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white dark:bg-neutral-800 rounded-xl p-3 md:p-6 shadow-sm border border-neutral-200 dark:border-neutral-700"
          >
            <div className="flex items-center justify-between">
              <div className="p-1.5 md:p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <DollarSign className="h-4 w-4 md:h-5 md:w-5 text-green-600 dark:text-green-400" />
              </div>
              <span className="text-[10px] md:text-sm text-neutral-500">Cost</span>
            </div>
            <div className="mt-2 md:mt-4">
              <div className="text-lg md:text-3xl font-bold text-neutral-900 dark:text-white">
                {formatCost(data?.summary.totalCost || 0)}
              </div>
              <div className="text-[10px] md:text-sm text-neutral-500 mt-0.5 md:mt-1 hidden sm:block">
                {data?.summary.totalMessages || 0} messages
              </div>
            </div>
          </motion.div>

          {/* Cost Saved */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-gradient-to-br from-accent-500 to-accent-600 rounded-xl p-3 md:p-6 shadow-sm text-white"
          >
            <div className="flex items-center justify-between">
              <div className="p-1.5 md:p-2 bg-white/20 rounded-lg">
                <TrendingUp className="h-4 w-4 md:h-5 md:w-5" />
              </div>
              <div className="flex items-center text-[10px] md:text-sm bg-white/20 px-1.5 md:px-2 py-0.5 md:py-1 rounded-full">
                <ArrowUpRight className="h-2.5 w-2.5 md:h-3 md:w-3 mr-0.5 md:mr-1" />
                {data?.summary.savingsPercent || 0}%
              </div>
            </div>
            <div className="mt-2 md:mt-4">
              <div className="text-lg md:text-3xl font-bold">
                {formatCost(data?.summary.totalSaved || 0)}
              </div>
              <div className="text-[10px] md:text-sm text-white/80 mt-0.5 md:mt-1 hidden sm:block">
                Cost saved by smart routing
              </div>
            </div>
          </motion.div>

          {/* Avg Latency */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white dark:bg-neutral-800 rounded-xl p-3 md:p-6 shadow-sm border border-neutral-200 dark:border-neutral-700"
          >
            <div className="flex items-center justify-between">
              <div className="p-1.5 md:p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                <Zap className="h-4 w-4 md:h-5 md:w-5 text-purple-600 dark:text-purple-400" />
              </div>
              <span className="text-[10px] md:text-sm text-neutral-500">Latency</span>
            </div>
            <div className="mt-2 md:mt-4">
              <div className="text-lg md:text-3xl font-bold text-neutral-900 dark:text-white">
                {data?.summary.avgLatency || 0}ms
              </div>
              <div className="text-[10px] md:text-sm text-neutral-500 mt-0.5 md:mt-1 hidden sm:block">
                Response time
              </div>
            </div>
          </motion.div>
        </div>

        {/* Charts Row - Mobile Responsive */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
          {/* Cost Over Time Chart */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-white dark:bg-neutral-800 rounded-xl p-4 md:p-6 shadow-sm border border-neutral-200 dark:border-neutral-700"
          >
            <h3 className="text-sm md:text-lg font-semibold text-neutral-900 dark:text-white mb-3 md:mb-4 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 md:h-5 md:w-5 text-primary-500" />
              Cost & Savings
            </h3>
            <div className="h-40 md:h-64 flex items-end gap-0.5 md:gap-1">
              {data?.costOverTime && data.costOverTime.length > 0 ? (
                data.costOverTime.slice(-14).map((item, i) => {
                  const maxCost = getMaxValue(data.costOverTime.map((d) => d.cost + d.saved));
                  const costHeight = ((item.cost / maxCost) * 100) || 1;
                  const savedHeight = ((item.saved / maxCost) * 100) || 0;
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center gap-0.5 md:gap-1">
                      <div className="w-full flex flex-col justify-end h-32 md:h-48">
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
                      <span className="text-[9px] md:text-xs text-neutral-500 rotate-45 origin-left whitespace-nowrap hidden sm:block">
                        {item.date.slice(-5)}
                      </span>
                    </div>
                  );
                })
              ) : (
                <div className="flex-1 flex items-center justify-center text-neutral-500 text-sm">
                  No data for this period
                </div>
              )}
            </div>
            <div className="flex items-center gap-3 md:gap-4 mt-3 md:mt-4 text-xs md:text-sm">
              <div className="flex items-center gap-1.5 md:gap-2">
                <div className="w-2.5 h-2.5 md:w-3 md:h-3 bg-primary-500 rounded" />
                <span className="text-neutral-600 dark:text-neutral-400">Cost</span>
              </div>
              <div className="flex items-center gap-1.5 md:gap-2">
                <div className="w-2.5 h-2.5 md:w-3 md:h-3 bg-accent-500 rounded" />
                <span className="text-neutral-600 dark:text-neutral-400">Saved</span>
              </div>
            </div>
          </motion.div>

          {/* Model Usage */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-white dark:bg-neutral-800 rounded-xl p-4 md:p-6 shadow-sm border border-neutral-200 dark:border-neutral-700"
          >
            <h3 className="text-sm md:text-lg font-semibold text-neutral-900 dark:text-white mb-3 md:mb-4 flex items-center gap-2">
              <PieChart className="h-4 w-4 md:h-5 md:w-5 text-primary-500" />
              Model Usage
            </h3>
            <div className="space-y-2 md:space-y-3">
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
                    <div key={model.model} className="space-y-0.5 md:space-y-1">
                      <div className="flex items-center justify-between text-xs md:text-sm">
                        <span className="font-medium text-neutral-700 dark:text-neutral-300 truncate max-w-[100px] md:max-w-none">
                          {model.model}
                        </span>
                        <div className="flex items-center gap-2 md:gap-3 text-neutral-500 text-[10px] md:text-sm">
                          <span>{model.count}</span>
                          <span className="text-accent-600 dark:text-accent-400 hidden sm:inline">
                            +{formatCost(model.saved)}
                          </span>
                        </div>
                      </div>
                      <div className="h-1.5 md:h-2 bg-neutral-100 dark:bg-neutral-700 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${colors[i % colors.length]} rounded-full transition-all`}
                          style={{ width: `${width}%` }}
                        />
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center text-neutral-500 py-6 md:py-8 text-sm">
                  No model usage data
                </div>
              )}
            </div>
          </motion.div>
        </div>

        {/* Routing Stats - Mobile Responsive */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="bg-white dark:bg-neutral-800 rounded-xl p-4 md:p-6 shadow-sm border border-neutral-200 dark:border-neutral-700"
        >
          <h3 className="text-sm md:text-lg font-semibold text-neutral-900 dark:text-white mb-3 md:mb-4 flex items-center gap-2">
            <Shield className="h-4 w-4 md:h-5 md:w-5 text-primary-500" />
            Routing & Privacy
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6">
            <div className="text-center p-3 md:p-4 bg-neutral-50 dark:bg-neutral-700/50 rounded-lg">
              <div className="text-lg md:text-2xl font-bold text-blue-600 dark:text-blue-400">
                {data?.routing.cloudMessages || 0}
              </div>
              <div className="text-[10px] md:text-sm text-neutral-600 dark:text-neutral-400 mt-0.5 md:mt-1">
                🌐 Cloud
              </div>
            </div>
            <div className="text-center p-3 md:p-4 bg-neutral-50 dark:bg-neutral-700/50 rounded-lg">
              <div className="text-lg md:text-2xl font-bold text-green-600 dark:text-green-400">
                {data?.routing.localMessages || 0}
              </div>
              <div className="text-[10px] md:text-sm text-neutral-600 dark:text-neutral-400 mt-0.5 md:mt-1">
                🏠 Local
              </div>
            </div>
            <div className="text-center p-3 md:p-4 bg-neutral-50 dark:bg-neutral-700/50 rounded-lg">
              <div className="text-lg md:text-2xl font-bold text-amber-600 dark:text-amber-400">
                {data?.routing.piiDetectedCount || 0}
              </div>
              <div className="text-[10px] md:text-sm text-neutral-600 dark:text-neutral-400 mt-0.5 md:mt-1">
                🔐 PII
              </div>
            </div>
            <div className="text-center p-3 md:p-4 bg-gradient-to-br from-accent-500 to-accent-600 rounded-lg text-white">
              <div className="text-lg md:text-2xl font-bold">
                {data?.routing.localPercent || 0}%
              </div>
              <div className="text-[10px] md:text-sm text-white/80 mt-0.5 md:mt-1">
                Private
              </div>
            </div>
          </div>
        </motion.div>

        {/* Provider Breakdown - Mobile Responsive */}
        {data?.providerUsage && data.providerUsage.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="bg-white dark:bg-neutral-800 rounded-xl p-4 md:p-6 shadow-sm border border-neutral-200 dark:border-neutral-700"
          >
            <h3 className="text-sm md:text-lg font-semibold text-neutral-900 dark:text-white mb-3 md:mb-4 flex items-center gap-2">
              <Cpu className="h-4 w-4 md:h-5 md:w-5 text-primary-500" />
              Providers
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4">
              {data.providerUsage.map((provider) => (
                <div
                  key={provider.provider}
                  className="p-2.5 md:p-4 bg-neutral-50 dark:bg-neutral-700/50 rounded-lg"
                >
                  <div className="font-medium text-xs md:text-base text-neutral-900 dark:text-white capitalize truncate">
                    {provider.provider}
                  </div>
                  <div className="text-lg md:text-2xl font-bold text-primary-600 dark:text-primary-400 mt-0.5 md:mt-1">
                    {provider.count}
                  </div>
                  <div className="text-[10px] md:text-sm text-neutral-500 mt-0.5 md:mt-1">
                    {formatCost(provider.cost)}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Empty State - Mobile Responsive */}
        {data?.summary.totalMessages === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-8 md:py-12"
          >
            <BarChart3 className="h-12 w-12 md:h-16 md:w-16 mx-auto text-neutral-300 dark:text-neutral-600 mb-3 md:mb-4" />
            <h3 className="text-base md:text-xl font-semibold text-neutral-700 dark:text-neutral-300">
              No analytics data yet
            </h3>
            <p className="text-sm text-neutral-500 mt-1 md:mt-2 px-4">
              Start chatting with the AI to see your usage analytics
            </p>
          </motion.div>
        )}
      </div>
    </div>
  );
}
