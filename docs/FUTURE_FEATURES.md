# LawSphere - Future Features TODO

This document tracks planned features and enhancements for future implementation.

---

## High Priority

### 1. Session Summary Generation
**Status**: Planned  
**Complexity**: Medium-High  
**Description**: Automatically generate a brief summary (2-3 lines) of each chat session to help users quickly understand the context and relevance of past conversations.

**Implementation Considerations**:
- Could use the LLM to summarize the conversation after a certain number of messages
- Summary could be generated on-demand (when user opens sessions list) or periodically
- Need to balance API cost vs. user experience
- Could cache summaries in the `ChatSession.description` field

**Suggested Approach**:
1. Add a "Summarize" button on sessions list (manual trigger first)
2. Later: Auto-generate after session has 5+ messages and user navigates away
3. Use a lightweight prompt to summarize key topics discussed

**API Endpoint Needed**:
```typescript
POST /api/sessions/{sessionId}/summarize
Response: { summary: string }
```

**Database**: Already has `description` field in ChatSession model that can store the summary.

---

## Medium Priority

### 2. Session Categories/Tags
**Status**: Planned  
**Description**: Allow users to tag or categorize sessions (e.g., "Contract Review", "GDPR", "Employment Law") for better organization.

### 3. Session Search with AI
**Status**: Planned  
**Description**: Use semantic search to find sessions based on conversation content, not just session title.

### 4. Export Session to PDF
**Status**: Planned  
**Description**: Export full session conversation with files and notes as a formatted PDF document.

### 5. Session Sharing
**Status**: Planned  
**Description**: Share sessions with team members (read-only or collaborative).

---

## Low Priority

### 6. Session Templates
**Status**: Planned  
**Description**: Pre-configured session templates for common legal workflows.

### 7. Auto-Title Generation
**Status**: Planned  
**Description**: Automatically suggest a title based on the first few messages in the conversation.

### 8. Session Analytics
**Status**: Planned  
**Description**: Show statistics like number of messages, tokens used, files analyzed per session.

---

## Completed Features

- [x] Default session naming with date (e.g., "Session - Jan 4, 2026")
- [x] Session rename functionality
- [x] File upload and display in sessions
- [x] Trust routing with Groq LLMs

---

*Last Updated: January 4, 2026*
