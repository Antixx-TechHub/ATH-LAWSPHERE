"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../../components/ui/card";
import { Shield, ShieldCheck, Cloud, Lock, AlertTriangle, FileCheck, Activity } from "lucide-react";
import { aiClient } from "../../../lib/api/ai-client";

interface TrustMetrics {
  total_requests: number;
  local_routed: number;
  cloud_routed: number;
  privacy_protection_rate: number;
  pii_detected_count: number;
  sensitive_documents: number;
}

interface ModelInfo {
  id: string;
  name: string;
  status: string;
}

interface TrustModels {
  local_models: ModelInfo[];
  cloud_models: ModelInfo[];
}

export default function PrivacyDashboard() {
  const [metrics, setMetrics] = useState<TrustMetrics | null>(null);
  const [models, setModels] = useState<TrustModels | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [metricsData, modelsData] = await Promise.all([
        aiClient.getTrustDashboard(),
        aiClient.getTrustModels(),
      ]);
      setMetrics(metricsData);
      setModels(modelsData);
    } catch (err) {
      console.error("Error loading dashboard data:", err);
      setError(err instanceof Error ? err.message : "Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
          <p className="text-sm text-neutral-500">Loading privacy dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-96">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              Error Loading Dashboard
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-neutral-600 mb-4">{error}</p>
            <button
              onClick={loadDashboardData}
              className="px-4 py-2 bg-primary-600 text-white rounded-md text-sm hover:bg-primary-700"
            >
              Retry
            </button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
          <ShieldCheck className="h-7 w-7 text-green-600" />
          Privacy Dashboard
        </h1>
        <p className="text-neutral-600 dark:text-neutral-400 mt-1">
          Monitor your privacy protection and data security metrics
        </p>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Total Requests */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Requests</CardTitle>
            <Activity className="h-4 w-4 text-neutral-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.total_requests || 0}</div>
            <p className="text-xs text-neutral-500 mt-1">All AI interactions</p>
          </CardContent>
        </Card>

        {/* Local Routing */}
        <Card className="border-green-200 dark:border-green-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Local Processing</CardTitle>
            <Lock className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {metrics?.local_routed || 0}
            </div>
            <p className="text-xs text-neutral-500 mt-1">
              Sensitive data kept secure
            </p>
          </CardContent>
        </Card>

        {/* Cloud Routing */}
        <Card className="border-blue-200 dark:border-blue-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cloud Processing</CardTitle>
            <Cloud className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {metrics?.cloud_routed || 0}
            </div>
            <p className="text-xs text-neutral-500 mt-1">
              General queries
            </p>
          </CardContent>
        </Card>

        {/* Privacy Protection Rate */}
        <Card className="border-green-200 dark:border-green-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Privacy Protection</CardTitle>
            <Shield className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {((metrics?.privacy_protection_rate || 0) * 100).toFixed(1)}%
            </div>
            <p className="text-xs text-neutral-500 mt-1">
              Data protected locally
            </p>
          </CardContent>
        </Card>

        {/* PII Detected */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">PII Detected</CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {metrics?.pii_detected_count || 0}
            </div>
            <p className="text-xs text-neutral-500 mt-1">
              Automatically protected
            </p>
          </CardContent>
        </Card>

        {/* Sensitive Documents */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sensitive Docs</CardTitle>
            <FileCheck className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {metrics?.sensitive_documents || 0}
            </div>
            <p className="text-xs text-neutral-500 mt-1">
              Processed locally
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Model Status */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Local Models */}
        <Card className="border-green-200 dark:border-green-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-600">
              <Lock className="h-5 w-5" />
              Local Models (Secure)
            </CardTitle>
            <CardDescription>
              Privacy-first AI models running on your infrastructure
            </CardDescription>
          </CardHeader>
          <CardContent>
            {models?.local_models && models.local_models.length > 0 ? (
              <div className="space-y-3">
                {models.local_models.map((model) => (
                  <div
                    key={model.id}
                    className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/10 rounded-md border border-green-200 dark:border-green-800"
                  >
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4 text-green-600" />
                      <div>
                        <p className="font-medium text-sm">{model.name}</p>
                        <p className="text-xs text-neutral-500">{model.id}</p>
                      </div>
                    </div>
                    <span
                      className={`px-2 py-1 text-xs rounded-full ${
                        model.status === "available" || model.status === "ready"
                          ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                          : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                      }`}
                    >
                      {model.status}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-neutral-500">
                <Lock className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No local models configured</p>
                <p className="text-xs mt-1">Set up Ollama to enable local processing</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Cloud Models */}
        <Card className="border-blue-200 dark:border-blue-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-600">
              <Cloud className="h-5 w-5" />
              Cloud Models
            </CardTitle>
            <CardDescription>
              External AI services for general queries
            </CardDescription>
          </CardHeader>
          <CardContent>
            {models?.cloud_models && models.cloud_models.length > 0 ? (
              <div className="space-y-3">
                {models.cloud_models.map((model) => (
                  <div
                    key={model.id}
                    className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/10 rounded-md border border-blue-200 dark:border-blue-800"
                  >
                    <div className="flex items-center gap-2">
                      <Cloud className="h-4 w-4 text-blue-600" />
                      <div>
                        <p className="font-medium text-sm">{model.name}</p>
                        <p className="text-xs text-neutral-500">{model.id}</p>
                      </div>
                    </div>
                    <span
                      className={`px-2 py-1 text-xs rounded-full ${
                        model.status === "available" || model.status === "ready"
                          ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                          : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                      }`}
                    >
                      {model.status}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-neutral-500">
                <Cloud className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No cloud models configured</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Privacy Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary-600" />
            How Privacy Protection Works
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-green-600 font-medium">
                <Lock className="h-4 w-4" />
                1. Scan for Sensitive Data
              </div>
              <p className="text-sm text-neutral-600 dark:text-neutral-400">
                Every message is analyzed for PII, legal markers, and confidential content before processing.
              </p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-blue-600 font-medium">
                <Activity className="h-4 w-4" />
                2. Intelligent Routing
              </div>
              <p className="text-sm text-neutral-600 dark:text-neutral-400">
                Sensitive data routes to local models. General queries use efficient cloud models.
              </p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-purple-600 font-medium">
                <FileCheck className="h-4 w-4" />
                3. Audit & Compliance
              </div>
              <p className="text-sm text-neutral-600 dark:text-neutral-400">
                All routing decisions are logged for compliance without storing sensitive content.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
