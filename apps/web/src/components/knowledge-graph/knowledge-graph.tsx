/**
 * Legal Knowledge Graph Component
 * Interactive visualization of entities and relationships extracted from case data
 * Uses React Flow for the graph visualization
 */

'use client';

import React, { useCallback, useMemo, useState, useEffect } from 'react';
import ReactFlow, {
  Node,
  Edge,
  Controls,
  Background,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  MarkerType,
  NodeProps,
  Handle,
  Position,
  ReactFlowProvider,
  Panel
} from 'reactflow';
import 'reactflow/dist/style.css';
import { 
  User, Building2, Scale, Calendar, MapPin, FileText, 
  AlertTriangle, Clock, File, Lightbulb, Loader2, RefreshCw,
  ZoomIn, ZoomOut, Maximize2, Download
} from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';

// Node type colors and icons
const NODE_STYLES: Record<string, { bg: string; border: string; text: string; icon: React.ElementType }> = {
  PERSON: { bg: 'bg-blue-100 dark:bg-blue-900/40', border: 'border-blue-500', text: 'text-blue-700 dark:text-blue-300', icon: User },
  ORGANIZATION: { bg: 'bg-purple-100 dark:bg-purple-900/40', border: 'border-purple-500', text: 'text-purple-700 dark:text-purple-300', icon: Building2 },
  LAW_REFERENCE: { bg: 'bg-amber-100 dark:bg-amber-900/40', border: 'border-amber-500', text: 'text-amber-700 dark:text-amber-300', icon: Scale },
  DATE: { bg: 'bg-green-100 dark:bg-green-900/40', border: 'border-green-500', text: 'text-green-700 dark:text-green-300', icon: Calendar },
  LOCATION: { bg: 'bg-red-100 dark:bg-red-900/40', border: 'border-red-500', text: 'text-red-700 dark:text-red-300', icon: MapPin },
  CLAIM: { bg: 'bg-orange-100 dark:bg-orange-900/40', border: 'border-orange-500', text: 'text-orange-700 dark:text-orange-300', icon: AlertTriangle },
  EVIDENCE: { bg: 'bg-cyan-100 dark:bg-cyan-900/40', border: 'border-cyan-500', text: 'text-cyan-700 dark:text-cyan-300', icon: FileText },
  EVENT: { bg: 'bg-pink-100 dark:bg-pink-900/40', border: 'border-pink-500', text: 'text-pink-700 dark:text-pink-300', icon: Clock },
  DOCUMENT: { bg: 'bg-slate-100 dark:bg-slate-900/40', border: 'border-slate-500', text: 'text-slate-700 dark:text-slate-300', icon: File },
  CONCEPT: { bg: 'bg-indigo-100 dark:bg-indigo-900/40', border: 'border-indigo-500', text: 'text-indigo-700 dark:text-indigo-300', icon: Lightbulb },
};

interface KnowledgeNodeData {
  label: string;
  type: string;
  description?: string;
  properties?: Record<string, unknown>;
}

// Custom Node Component
const CustomNode = ({ data, selected }: NodeProps<KnowledgeNodeData>) => {
  const style = NODE_STYLES[data.type] || NODE_STYLES.CONCEPT;
  const Icon = style.icon;
  
  return (
    <div
      className={`
        px-3 py-2 rounded-lg border-2 shadow-md transition-all min-w-[120px] max-w-[200px]
        ${style.bg} ${style.border} ${selected ? 'ring-2 ring-primary ring-offset-2' : ''}
      `}
    >
      <Handle type="target" position={Position.Top} className="w-2 h-2 !bg-gray-400" />
      <div className="flex items-center gap-2">
        <Icon className={`h-4 w-4 flex-shrink-0 ${style.text}`} />
        <div className="min-w-0 flex-1">
          <div className={`text-xs font-semibold truncate ${style.text}`}>
            {data.label}
          </div>
          <div className="text-[10px] text-gray-500 dark:text-gray-400 uppercase">
            {data.type.replace(/_/g, ' ')}
          </div>
        </div>
      </div>
      {data.description && (
        <div className="mt-1 text-[10px] text-gray-600 dark:text-gray-400 line-clamp-2">
          {data.description}
        </div>
      )}
      <Handle type="source" position={Position.Bottom} className="w-2 h-2 !bg-gray-400" />
    </div>
  );
};

const nodeTypes = {
  custom: CustomNode,
};

interface GraphNode {
  id: string;
  type: string;
  label: string;
  description?: string;
  properties?: Record<string, unknown>;
  position?: { x: number; y: number };
}

interface GraphEdge {
  id: string;
  sourceId: string;
  targetId: string;
  sourceLabel: string;
  targetLabel: string;
  relation: string;
  label?: string;
}

interface KnowledgeGraphProps {
  sessionId: string;
  sessionName?: string;
}

// Layout algorithm - simple force-directed-like placement
function calculateLayout(nodes: GraphNode[]): Node[] {
  const centerX = 400;
  const centerY = 300;
  const radius = 250;
  const angleStep = (2 * Math.PI) / Math.max(nodes.length, 1);
  
  return nodes.map((node, index) => {
    // Use saved position or calculate new one
    const position = node.position || {
      x: centerX + radius * Math.cos(index * angleStep - Math.PI / 2),
      y: centerY + radius * Math.sin(index * angleStep - Math.PI / 2)
    };
    
    return {
      id: node.id,
      type: 'custom',
      position,
      data: {
        label: node.label,
        type: node.type,
        description: node.description,
        properties: node.properties
      }
    };
  });
}

function createEdges(edges: GraphEdge[]): Edge[] {
  return edges.map(edge => ({
    id: edge.id,
    source: edge.sourceId,
    target: edge.targetId,
    label: edge.label || edge.relation.replace(/_/g, ' '),
    type: 'smoothstep',
    animated: false,
    style: { stroke: '#94a3b8', strokeWidth: 2 },
    labelStyle: { fontSize: 10, fill: '#64748b' },
    labelBgStyle: { fill: 'white', fillOpacity: 0.8 },
    markerEnd: {
      type: MarkerType.ArrowClosed,
      color: '#94a3b8'
    }
  }));
}

export function KnowledgeGraph({ sessionId, sessionName }: KnowledgeGraphProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'building' | 'not_built' | 'error'>('loading');
  const [summary, setSummary] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [stats, setStats] = useState({ nodeCount: 0, edgeCount: 0 });

  const fetchGraph = useCallback(async () => {
    setStatus('loading');
    try {
      const response = await fetch(`/api/knowledge-graph?sessionId=${sessionId}`);
      if (!response.ok) throw new Error('Failed to fetch graph');
      
      const data = await response.json();
      
      if (data.status === 'NOT_BUILT') {
        setStatus('not_built');
        return;
      }
      
      if (data.status === 'BUILDING') {
        setStatus('building');
        // Poll for completion
        setTimeout(fetchGraph, 3000);
        return;
      }
      
      if (data.status === 'ERROR') {
        setStatus('error');
        return;
      }
      
      // Build graph from data
      const flowNodes = calculateLayout(data.nodes);
      const flowEdges = createEdges(data.edges);
      
      setNodes(flowNodes);
      setEdges(flowEdges);
      setSummary(data.summary);
      setStats({ nodeCount: data.nodeCount, edgeCount: data.edgeCount });
      setStatus('ready');
      
    } catch (error) {
      console.error('Failed to fetch knowledge graph:', error);
      setStatus('error');
    }
  }, [sessionId, setNodes, setEdges]);

  const buildGraph = async () => {
    setStatus('building');
    try {
      const response = await fetch('/api/knowledge-graph', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId })
      });
      
      if (!response.ok) throw new Error('Failed to build graph');
      
      // Refetch the graph
      await fetchGraph();
      
    } catch (error) {
      console.error('Failed to build knowledge graph:', error);
      setStatus('error');
    }
  };

  const saveLayout = async () => {
    try {
      await fetch('/api/knowledge-graph', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          nodes: nodes.map(n => ({ id: n.id, position: n.position }))
        })
      });
    } catch (error) {
      console.error('Failed to save layout:', error);
    }
  };

  const onNodeClick = useCallback((_event: React.MouseEvent, node: Node) => {
    setSelectedNode({
      id: node.id,
      type: node.data.type,
      label: node.data.label,
      description: node.data.description,
      properties: node.data.properties
    });
  }, []);

  useEffect(() => {
    fetchGraph();
  }, [fetchGraph]);

  // Save layout when nodes change (debounced)
  useEffect(() => {
    if (status === 'ready' && nodes.length > 0) {
      const timer = setTimeout(saveLayout, 2000);
      return () => clearTimeout(timer);
    }
  }, [nodes, status]);

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center h-[500px] bg-muted/30 rounded-lg">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="mt-2 text-sm text-muted-foreground">Loading knowledge graph...</p>
        </div>
      </div>
    );
  }

  if (status === 'not_built') {
    return (
      <div className="flex items-center justify-center h-[500px] bg-muted/30 rounded-lg">
        <div className="text-center max-w-md px-4">
          <Scale className="h-12 w-12 mx-auto text-muted-foreground" />
          <h3 className="mt-4 text-lg font-semibold">No Knowledge Graph Yet</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Generate a knowledge map to visualize entities, relationships, and key information from this session.
          </p>
          <Button className="mt-4" onClick={buildGraph}>
            <Lightbulb className="h-4 w-4 mr-2" />
            Generate Knowledge Map
          </Button>
        </div>
      </div>
    );
  }

  if (status === 'building') {
    return (
      <div className="flex items-center justify-center h-[500px] bg-muted/30 rounded-lg">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="mt-2 text-sm text-muted-foreground">Building knowledge graph...</p>
          <p className="mt-1 text-xs text-muted-foreground">Extracting entities and relationships from your session data</p>
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="flex items-center justify-center h-[500px] bg-muted/30 rounded-lg">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 mx-auto text-destructive" />
          <h3 className="mt-4 text-lg font-semibold">Failed to Load Graph</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            There was an error loading the knowledge graph.
          </p>
          <Button className="mt-4" variant="outline" onClick={fetchGraph}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-[600px] bg-white dark:bg-neutral-900 rounded-lg border overflow-hidden">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.3}
        maxZoom={2}
      >
        <Background />
        <Controls />
        <MiniMap 
          nodeColor={(node) => {
            const style = NODE_STYLES[node.data?.type] || NODE_STYLES.CONCEPT;
            return style.border.replace('border-', '').replace('-500', '');
          }}
          className="!bg-white dark:!bg-neutral-800"
        />
        
        {/* Top Panel - Summary and Stats */}
        <Panel position="top-left" className="bg-white/90 dark:bg-neutral-800/90 rounded-lg p-3 shadow-md max-w-md">
          <div className="text-sm font-semibold text-gray-900 dark:text-white">
            {sessionName || 'Knowledge Map'}
          </div>
          {summary && (
            <p className="mt-1 text-xs text-gray-600 dark:text-gray-400 line-clamp-2">
              {summary}
            </p>
          )}
          <div className="mt-2 flex items-center gap-3 text-xs text-gray-500">
            <span>{stats.nodeCount} entities</span>
            <span>•</span>
            <span>{stats.edgeCount} relationships</span>
          </div>
        </Panel>
        
        {/* Actions Panel */}
        <Panel position="top-right" className="flex gap-2">
          <Button size="sm" variant="outline" onClick={buildGraph} className="bg-white dark:bg-neutral-800">
            <RefreshCw className="h-3 w-3 mr-1" />
            Rebuild
          </Button>
        </Panel>

        {/* Legend */}
        <Panel position="bottom-left" className="bg-white/90 dark:bg-neutral-800/90 rounded-lg p-2 shadow-md">
          <div className="text-xs font-medium mb-1 text-gray-700 dark:text-gray-300">Legend</div>
          <div className="grid grid-cols-2 gap-x-3 gap-y-0.5">
            {Object.entries(NODE_STYLES).slice(0, 6).map(([type, style]) => {
              const Icon = style.icon;
              return (
                <div key={type} className="flex items-center gap-1 text-[10px]">
                  <Icon className={`h-3 w-3 ${style.text}`} />
                  <span className="text-gray-600 dark:text-gray-400">
                    {type.replace(/_/g, ' ')}
                  </span>
                </div>
              );
            })}
          </div>
        </Panel>
      </ReactFlow>

      {/* Selected Node Details */}
      {selectedNode && (
        <div className="absolute bottom-4 right-4 w-72 bg-white dark:bg-neutral-800 rounded-lg shadow-lg border p-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              {(() => {
                const Icon = NODE_STYLES[selectedNode.type]?.icon || Lightbulb;
                return <Icon className={`h-5 w-5 ${NODE_STYLES[selectedNode.type]?.text || 'text-gray-500'}`} />;
              })()}
              <div>
                <div className="font-medium text-sm">{selectedNode.label}</div>
                <div className="text-xs text-muted-foreground uppercase">{selectedNode.type.replace(/_/g, ' ')}</div>
              </div>
            </div>
            <button onClick={() => setSelectedNode(null)} className="text-gray-400 hover:text-gray-600">✕</button>
          </div>
          {selectedNode.description && (
            <p className="mt-2 text-xs text-gray-600 dark:text-gray-400">
              {selectedNode.description}
            </p>
          )}
          {selectedNode.properties && Object.keys(selectedNode.properties).length > 0 && (
            <div className="mt-2 pt-2 border-t">
              <div className="text-xs font-medium mb-1">Properties</div>
              {Object.entries(selectedNode.properties).map(([key, value]) => (
                <div key={key} className="flex justify-between text-xs">
                  <span className="text-gray-500">{key}:</span>
                  <span className="text-gray-700 dark:text-gray-300">{String(value)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Wrapper with ReactFlowProvider
export function KnowledgeGraphWrapper(props: KnowledgeGraphProps) {
  return (
    <ReactFlowProvider>
      <KnowledgeGraph {...props} />
    </ReactFlowProvider>
  );
}

export default KnowledgeGraphWrapper;
