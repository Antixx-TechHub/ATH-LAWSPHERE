/**
 * Node Feedback Component
 * Provides feedback buttons for accepting/rejecting/editing nodes
 */

'use client';

import React, { useState } from 'react';
import { Check, X, Pencil, Trash2, Link2, MessageSquare, Loader2 } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { Textarea } from '../ui/textarea';

interface NodeData {
  id: string;
  label: string;
  type: string;
  description?: string;
  properties?: Record<string, unknown>;
}

interface NodeFeedbackProps {
  node: NodeData;
  sessionId: string;
  onFeedbackSubmit?: (type: string, data?: any) => void;
  onNodeUpdate?: (node: NodeData) => void;
  onNodeDelete?: (nodeId: string) => void;
}

const NODE_TYPES = [
  'PERSON',
  'ORGANIZATION', 
  'LAW_REFERENCE',
  'DATE',
  'LOCATION',
  'CLAIM',
  'EVIDENCE',
  'EVENT',
  'DOCUMENT',
  'CONCEPT'
];

export function NodeFeedback({ 
  node, 
  sessionId, 
  onFeedbackSubmit,
  onNodeUpdate,
  onNodeDelete 
}: NodeFeedbackProps) {
  const [loading, setLoading] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [commentDialogOpen, setCommentDialogOpen] = useState(false);
  const [editedNode, setEditedNode] = useState<NodeData>(node);
  const [comment, setComment] = useState('');

  const submitFeedback = async (
    feedbackType: string, 
    originalValue?: any, 
    correctedValue?: any,
    commentText?: string
  ) => {
    setLoading(true);
    try {
      const response = await fetch('/api/knowledge-graph/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          nodeId: node.id,
          feedbackType,
          originalValue: originalValue || {
            label: node.label,
            type: node.type,
            description: node.description
          },
          correctedValue,
          comment: commentText
        })
      });

      if (response.ok) {
        onFeedbackSubmit?.(feedbackType, correctedValue);
      }
    } catch (error) {
      console.error('Failed to submit feedback:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async () => {
    await submitFeedback('ACCEPT');
  };

  const handleReject = async () => {
    await submitFeedback('REJECT');
    onNodeDelete?.(node.id);
  };

  const handleEdit = async () => {
    await submitFeedback('EDIT', {
      label: node.label,
      type: node.type,
      description: node.description
    }, {
      label: editedNode.label,
      type: editedNode.type,
      description: editedNode.description
    });
    onNodeUpdate?.(editedNode);
    setEditDialogOpen(false);
  };

  const handleDelete = async () => {
    await submitFeedback('DELETE_NODE');
    onNodeDelete?.(node.id);
  };

  const handleComment = async () => {
    await submitFeedback('RATE', undefined, undefined, comment);
    setCommentDialogOpen(false);
    setComment('');
  };

  return (
    <>
      {/* Feedback Buttons */}
      <div className="flex items-center gap-1 mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
        <Button
          size="sm"
          variant="ghost"
          className="h-6 px-1.5 text-green-600 hover:text-green-700 hover:bg-green-50"
          onClick={handleAccept}
          disabled={loading}
          title="Accept - Entity is correct"
        >
          <Check className="h-3 w-3" />
        </Button>
        
        <Button
          size="sm"
          variant="ghost"
          className="h-6 px-1.5 text-red-600 hover:text-red-700 hover:bg-red-50"
          onClick={handleReject}
          disabled={loading}
          title="Reject - Entity is wrong"
        >
          <X className="h-3 w-3" />
        </Button>
        
        <Button
          size="sm"
          variant="ghost"
          className="h-6 px-1.5 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
          onClick={() => setEditDialogOpen(true)}
          disabled={loading}
          title="Edit - Correct this entity"
        >
          <Pencil className="h-3 w-3" />
        </Button>
        
        <Button
          size="sm"
          variant="ghost"
          className="h-6 px-1.5 text-gray-600 hover:text-gray-700 hover:bg-gray-50"
          onClick={() => setCommentDialogOpen(true)}
          disabled={loading}
          title="Add comment"
        >
          <MessageSquare className="h-3 w-3" />
        </Button>
        
        <Button
          size="sm"
          variant="ghost"
          className="h-6 px-1.5 text-purple-600 hover:text-purple-700 hover:bg-purple-50"
          disabled={loading}
          title="Find related resources"
        >
          <Link2 className="h-3 w-3" />
        </Button>

        {loading && <Loader2 className="h-3 w-3 animate-spin text-gray-400" />}
      </div>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Entity</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="label">Label</Label>
              <Input
                id="label"
                value={editedNode.label}
                onChange={(e) => setEditedNode({ ...editedNode, label: e.target.value })}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="type">Type</Label>
              <Select
                value={editedNode.type}
                onValueChange={(value) => setEditedNode({ ...editedNode, type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {NODE_TYPES.map(type => (
                    <SelectItem key={type} value={type}>
                      {type.replace(/_/g, ' ')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={editedNode.description || ''}
                onChange={(e) => setEditedNode({ ...editedNode, description: e.target.value })}
                rows={3}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleEdit} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Comment Dialog */}
      <Dialog open={commentDialogOpen} onOpenChange={setCommentDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Comment</DialogTitle>
          </DialogHeader>
          
          <div className="py-4">
            <Textarea
              placeholder="Add your feedback about this entity..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={4}
            />
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setCommentDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleComment} disabled={loading || !comment.trim()}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Submit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default NodeFeedback;
