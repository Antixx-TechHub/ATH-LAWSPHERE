/**
 * Learning Dashboard Page
 * Shows model performance metrics and learning insights
 */

'use client';

import { useState, useEffect } from 'react';
import { DashboardLayout } from '../../../../components/layout/dashboard-layout';
import { Card, CardContent, CardHeader, CardTitle } from '../../../../components/ui/card';
import { Button } from '../../../../components/ui/button';
import { Badge } from '../../../../components/ui/badge';
import { Progress } from '../../../../components/ui/progress';
import {
  Brain,
  TrendingUp,
  CheckCircle,
  RefreshCw,
  Lightbulb,
  AlertTriangle,
  Clock,
  BarChart3,
  Loader2
} from 'lucide-react';

interface LearningData {
  summary: {
    overallAccuracy: string;
    totalFeedback: number;
    acceptCount: number;
    rejectCount: number;
    editCount: number;
    acceptRate: string;
    rejectRate: string;
    editRate: string;
    trainingSamples: number;
    modelVersion: string;
  };
  entityAccuracy: Record<string, number>;
  dailyMetrics: any[];
  insights: any[];
  commonErrors: any[];
}

export default function LearningDashboardPage() {
  const [data, setData] = useState<LearningData | null>(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);

  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/learning?days=' + days);
      if (response.ok) {
        const result = await response.json();
        setData(result);
      }
    } catch (error) {
      console.error('Failed to fetch learning data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [days]);

  const resolveInsight = async (insightId: string) => {
    try {
      await fetch('/api/admin/learning', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'resolve', insightId })
      });
      fetchData();
    } catch (error) {
      console.error('Failed to resolve insight:', error);
    }
  };

  const getAccuracyColor = (accuracy: number) => {
    if (accuracy >= 90) return 'text-green-600';
    if (accuracy >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (loading && !data) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 pb-16">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-serif font-bold tracking-tight flex items-center gap-2">
              <Brain className="h-8 w-8 text-primary" />
              Model Learning Dashboard
            </h1>
            <p className="text-muted-foreground">
              Monitor AI performance and learning progress
            </p>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={days}
              onChange={(e) => setDays(parseInt(e.target.value))}
              className="px-3 py-2 border rounded-md text-sm"
            >
              <option value={7}>Last 7 days</option>
              <option value={30}>Last 30 days</option>
              <option value={90}>Last 90 days</option>
            </select>
            <Button variant="outline" onClick={fetchData} disabled={loading}>
              <RefreshCw className={'h-4 w-4 mr-2 ' + (loading ? 'animate-spin' : '')} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Overall Accuracy</p>
                  <p className={'text-3xl font-bold ' + getAccuracyColor(parseFloat(data?.summary.overallAccuracy || '0'))}>
                    {data?.summary.overallAccuracy || '0'}%
                  </p>
                </div>
                <div className={'p-3 rounded-full ' + (parseFloat(data?.summary.overallAccuracy || '0') >= 80 ? 'bg-green-100' : 'bg-yellow-100')}>
                  <TrendingUp className={'h-6 w-6 ' + (parseFloat(data?.summary.overallAccuracy || '0') >= 80 ? 'text-green-600' : 'text-yellow-600')} />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Feedback</p>
                  <p className="text-3xl font-bold">{data?.summary.totalFeedback || 0}</p>
                </div>
                <div className="p-3 rounded-full bg-blue-100">
                  <BarChart3 className="h-6 w-6 text-blue-600" />
                </div>
              </div>
              <div className="mt-2 flex gap-2 text-xs">
                <span className="text-green-600">✓ {data?.summary.acceptCount || 0}</span>
                <span className="text-red-600">✗ {data?.summary.rejectCount || 0}</span>
                <span className="text-blue-600">✎ {data?.summary.editCount || 0}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Training Samples</p>
                  <p className="text-3xl font-bold">{data?.summary.trainingSamples || 0}</p>
                </div>
                <div className="p-3 rounded-full bg-purple-100">
                  <Brain className="h-6 w-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Model Version</p>
                  <p className="text-xl font-bold font-mono">{data?.summary.modelVersion || 'v1.0'}</p>
                </div>
                <div className="p-3 rounded-full bg-gray-100">
                  <Clock className="h-6 w-6 text-gray-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Entity Accuracy */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Accuracy by Entity Type
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(data?.entityAccuracy || {}).map(([type, accuracy]) => (
                <div key={type} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{type.replace(/_/g, ' ')}</span>
                    <span className={getAccuracyColor(accuracy)}>
                      {accuracy > 0 ? accuracy.toFixed(1) + '%' : 'No data'}
                    </span>
                  </div>
                  <Progress value={accuracy} className="h-2" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Common Errors */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-yellow-600" />
                Common Errors
              </CardTitle>
            </CardHeader>
            <CardContent>
              {(data?.commonErrors || []).length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No errors recorded yet. Keep using the knowledge graph!
                </p>
              ) : (
                <div className="space-y-3">
                  {(data?.commonErrors || []).map((error: any, index: number) => (
                    <div key={index} className="p-3 bg-muted/50 rounded-lg">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-sm">
                          {error.pattern.replace(/_/g, ' ')}
                        </span>
                        <Badge variant="secondary">{error.count}x</Badge>
                      </div>
                      {error.examples.length > 0 && (
                        <p className="text-xs text-muted-foreground mt-1">
                          e.g., &quot;{error.examples[0]?.original}&quot; → &quot;{error.examples[0]?.corrected}&quot;
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Learning Insights */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lightbulb className="h-5 w-5 text-yellow-500" />
                Learning Insights
              </CardTitle>
            </CardHeader>
            <CardContent>
              {(data?.insights || []).length === 0 ? (
                <div className="text-center py-8">
                  <Lightbulb className="h-12 w-12 text-muted-foreground mx-auto" />
                  <p className="text-sm text-muted-foreground mt-2">
                    No insights yet. The system will generate insights as more feedback is collected.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {(data?.insights || []).map((insight: any) => (
                    <div 
                      key={insight.id} 
                      className={'p-3 rounded-lg border ' + (
                        insight.severity === 'critical' ? 'border-red-200 bg-red-50' :
                        insight.severity === 'warning' ? 'border-yellow-200 bg-yellow-50' :
                        'border-blue-200 bg-blue-50'
                      )}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-medium text-sm">{insight.title}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {insight.description}
                          </p>
                        </div>
                        {insight.actionable && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => resolveInsight(insight.id)}
                          >
                            <CheckCircle className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Feedback Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Feedback Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-8">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-green-500"></div>
                <span className="text-sm">Accept ({data?.summary.acceptRate || 0}%)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-red-500"></div>
                <span className="text-sm">Reject ({data?.summary.rejectRate || 0}%)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-blue-500"></div>
                <span className="text-sm">Edit ({data?.summary.editRate || 0}%)</span>
              </div>
            </div>
            <div className="mt-4 h-4 rounded-full overflow-hidden bg-gray-200 flex">
              <div 
                className="bg-green-500 h-full"
                style={{ width: (data?.summary.acceptRate || 0) + '%' }}
              ></div>
              <div 
                className="bg-red-500 h-full"
                style={{ width: (data?.summary.rejectRate || 0) + '%' }}
              ></div>
              <div 
                className="bg-blue-500 h-full"
                style={{ width: (data?.summary.editRate || 0) + '%' }}
              ></div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
