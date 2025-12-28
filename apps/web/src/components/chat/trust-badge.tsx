"use client";

import { cn } from "@/lib/utils";
import { Shield, ShieldCheck, Cloud, Server, Lock, AlertTriangle, CheckCircle, Info } from "lucide-react";

interface TrustInfo {
  is_local: boolean;
  trust_badge: string;
  trust_message: string;
  trust_details: string[];
  sensitivity_level: string;
  pii_detected: boolean;
  document_attached: boolean;
  model_used: string;
  model_provider: string;
  audit_id: string;
}

interface CostInfo {
  estimated_cost_usd: number;
  estimated_cost_inr: number;
  saved_vs_cloud_usd: number;
  saved_vs_cloud_inr: number;
}

interface TrustBadgeProps {
  trust: TrustInfo;
  cost?: CostInfo;
  compact?: boolean;
  showDetails?: boolean;
}

export function TrustBadge({ trust, cost, compact = false, showDetails = false }: TrustBadgeProps) {
  const isLocal = trust.is_local;
  const isSecure = isLocal || trust.sensitivity_level === "public";
  
  if (compact) {
    return (
      <div
        className={cn(
          "inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium",
          isLocal
            ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
            : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
        )}
        title={trust.trust_message}
      >
        {isLocal ? (
          <ShieldCheck className="h-3 w-3" />
        ) : (
          <Cloud className="h-3 w-3" />
        )}
        <span>{isLocal ? "Local" : "Cloud"}</span>
      </div>
    );
  }
  
  return (
    <div
      className={cn(
        "rounded-lg border p-3",
        isLocal
          ? "bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800"
          : "bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800"
      )}
    >
      {/* Header */}
      <div className="flex items-center gap-2">
        {isLocal ? (
          <div className="p-1.5 rounded-full bg-green-100 dark:bg-green-900/50">
            <ShieldCheck className="h-4 w-4 text-green-600 dark:text-green-400" />
          </div>
        ) : (
          <div className="p-1.5 rounded-full bg-blue-100 dark:bg-blue-900/50">
            <Cloud className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          </div>
        )}
        <div>
          <div className={cn(
            "text-sm font-semibold",
            isLocal ? "text-green-700 dark:text-green-400" : "text-blue-700 dark:text-blue-400"
          )}>
            {trust.trust_badge.replace(/[🔒🏠☁️]/g, '').trim()}
          </div>
          <div className="text-xs text-neutral-600 dark:text-neutral-400">
            {trust.model_used}
          </div>
        </div>
      </div>
      
      {/* Message */}
      <p className="mt-2 text-xs text-neutral-600 dark:text-neutral-300">
        {trust.trust_message}
      </p>
      
      {/* Details */}
      {showDetails && (
        <div className="mt-3 space-y-1">
          {trust.trust_details.map((detail, i) => (
            <div key={i} className="flex items-start gap-1.5 text-xs text-neutral-600 dark:text-neutral-400">
              <CheckCircle className="h-3 w-3 mt-0.5 text-green-500 flex-shrink-0" />
              <span>{detail.replace(/[✓✗ℹ️]/g, '').trim()}</span>
            </div>
          ))}
        </div>
      )}
      
      {/* Cost savings */}
      {cost && cost.saved_vs_cloud_inr > 0 && (
        <div className="mt-2 pt-2 border-t border-green-200 dark:border-green-800">
          <div className="text-xs text-green-600 dark:text-green-400">
            💰 Saved: ₹{cost.saved_vs_cloud_inr.toFixed(2)}
          </div>
        </div>
      )}
      
      {/* Audit ID */}
      <div className="mt-2 text-[10px] text-neutral-400">
        Audit: {trust.audit_id}
      </div>
    </div>
  );
}

interface TrustIndicatorProps {
  isLocal: boolean;
  sensitivityLevel: string;
  piiDetected: boolean;
  documentAttached: boolean;
}

export function TrustIndicator({ isLocal, sensitivityLevel, piiDetected, documentAttached }: TrustIndicatorProps) {
  const getColor = () => {
    if (isLocal) return "text-green-500";
    if (sensitivityLevel === "public") return "text-blue-500";
    return "text-yellow-500";
  };
  
  const getIcon = () => {
    if (isLocal) return <Lock className="h-3 w-3" />;
    return <Cloud className="h-3 w-3" />;
  };
  
  const getTooltip = () => {
    if (isLocal) {
      if (documentAttached) return "Document processed securely on-premise";
      if (piiDetected) return "Personal information protected locally";
      return "Processed on your server";
    }
    return "Using cloud AI (no sensitive data)";
  };
  
  return (
    <div
      className={cn("inline-flex items-center gap-1", getColor())}
      title={getTooltip()}
    >
      {getIcon()}
    </div>
  );
}

interface TrustDashboardProps {
  stats: {
    total_requests: number;
    local_requests: number;
    cloud_requests: number;
    documents_processed_locally: number;
    pii_protected_count: number;
    total_saved_inr: number;
    local_percentage: number;
  };
}

export function TrustDashboard({ stats }: TrustDashboardProps) {
  return (
    <div className="bg-white dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-800 p-4">
      <div className="flex items-center gap-2 mb-4">
        <Shield className="h-5 w-5 text-green-500" />
        <h3 className="font-semibold text-neutral-900 dark:text-white">Privacy Dashboard</h3>
      </div>
      
      {/* Trust Score */}
      <div className="mb-4">
        <div className="flex justify-between items-center mb-1">
          <span className="text-sm text-neutral-600 dark:text-neutral-400">Local Processing Rate</span>
          <span className="text-sm font-medium text-green-600">{stats.local_percentage.toFixed(1)}%</span>
        </div>
        <div className="h-2 bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-green-500 rounded-full transition-all"
            style={{ width: `${stats.local_percentage}%` }}
          />
        </div>
      </div>
      
      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3">
        <div className="p-2 bg-green-50 dark:bg-green-900/20 rounded-lg">
          <div className="flex items-center gap-1.5">
            <Server className="h-3.5 w-3.5 text-green-600" />
            <span className="text-xs text-green-700 dark:text-green-400">Local</span>
          </div>
          <div className="text-lg font-bold text-green-600">{stats.local_requests}</div>
        </div>
        
        <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <div className="flex items-center gap-1.5">
            <Cloud className="h-3.5 w-3.5 text-blue-600" />
            <span className="text-xs text-blue-700 dark:text-blue-400">Cloud</span>
          </div>
          <div className="text-lg font-bold text-blue-600">{stats.cloud_requests}</div>
        </div>
        
        <div className="p-2 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
          <div className="flex items-center gap-1.5">
            <Lock className="h-3.5 w-3.5 text-purple-600" />
            <span className="text-xs text-purple-700 dark:text-purple-400">Docs Protected</span>
          </div>
          <div className="text-lg font-bold text-purple-600">{stats.documents_processed_locally}</div>
        </div>
        
        <div className="p-2 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5 text-amber-600" />
            <span className="text-xs text-amber-700 dark:text-amber-400">PII Protected</span>
          </div>
          <div className="text-lg font-bold text-amber-600">{stats.pii_protected_count}</div>
        </div>
      </div>
      
      {/* Savings */}
      <div className="mt-4 p-3 bg-gradient-to-r from-green-500 to-emerald-500 rounded-lg text-white">
        <div className="text-xs opacity-80">Total Cost Savings</div>
        <div className="text-xl font-bold">₹{stats.total_saved_inr.toFixed(2)}</div>
      </div>
      
      {/* Guarantees */}
      <div className="mt-4 space-y-2">
        <div className="text-xs font-medium text-neutral-700 dark:text-neutral-300">Privacy Guarantees</div>
        {[
          "Documents always processed locally",
          "Personal information never leaves server",
          "Full audit trail for compliance",
        ].map((guarantee, i) => (
          <div key={i} className="flex items-center gap-2 text-xs text-neutral-600 dark:text-neutral-400">
            <CheckCircle className="h-3 w-3 text-green-500" />
            <span>{guarantee}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// Model selector with trust indicators
interface TrustModelOption {
  id: string;
  name: string;
  provider: string;
  is_local: boolean;
  cost_per_1k_tokens_inr: number;
}

interface TrustModelSelectorProps {
  models: TrustModelOption[];
  selected: string;
  onSelect: (modelId: string) => void;
  forceLocal?: boolean;
}

export function TrustModelSelector({ models, selected, onSelect, forceLocal = false }: TrustModelSelectorProps) {
  const localModels = models.filter(m => m.is_local);
  const cloudModels = models.filter(m => !m.is_local);
  
  return (
    <div className="space-y-3">
      {/* Local Models */}
      <div>
        <div className="flex items-center gap-1.5 mb-2">
          <Lock className="h-3 w-3 text-green-500" />
          <span className="text-xs font-medium text-green-700 dark:text-green-400">Secure Local Models</span>
        </div>
        <div className="space-y-1">
          {localModels.map(model => (
            <button
              key={model.id}
              onClick={() => onSelect(model.id)}
              className={cn(
                "w-full flex items-center justify-between p-2 rounded-lg text-left text-sm",
                selected === model.id
                  ? "bg-green-100 border-green-300 dark:bg-green-900/30 border"
                  : "hover:bg-neutral-100 dark:hover:bg-neutral-800"
              )}
            >
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-green-500" />
                <span>{model.name}</span>
              </div>
              <span className="text-xs text-green-600">FREE</span>
            </button>
          ))}
        </div>
      </div>
      
      {/* Cloud Models */}
      {!forceLocal && (
        <div>
          <div className="flex items-center gap-1.5 mb-2">
            <Cloud className="h-3 w-3 text-blue-500" />
            <span className="text-xs font-medium text-blue-700 dark:text-blue-400">Cloud Models</span>
            {forceLocal && (
              <span className="text-[10px] text-red-500">(Disabled - sensitive content)</span>
            )}
          </div>
          <div className="space-y-1">
            {cloudModels.map(model => (
              <button
                key={model.id}
                onClick={() => !forceLocal && onSelect(model.id)}
                disabled={forceLocal}
                className={cn(
                  "w-full flex items-center justify-between p-2 rounded-lg text-left text-sm",
                  forceLocal && "opacity-50 cursor-not-allowed",
                  selected === model.id
                    ? "bg-blue-100 border-blue-300 dark:bg-blue-900/30 border"
                    : "hover:bg-neutral-100 dark:hover:bg-neutral-800"
                )}
              >
                <div className="flex items-center gap-2">
                  <Cloud className="h-4 w-4 text-blue-500" />
                  <span>{model.name}</span>
                </div>
                <span className="text-xs text-neutral-500">
                  ₹{model.cost_per_1k_tokens_inr.toFixed(4)}/1K
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
