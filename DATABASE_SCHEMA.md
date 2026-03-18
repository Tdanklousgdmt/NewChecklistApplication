# eCheck Database Schema Documentation

## Overview

This document describes how the eCheck ERD (22 entities) is implemented using Supabase's Key-Value store for rapid prototyping.

## Important Notes

⚠️ **Current Implementation**: This application uses Supabase's KV (Key-Value) store for data persistence. This is a flexible, schema-less approach perfect for rapid prototyping and iteration.

⚠️ **Database Migrations**: Figma Make does not support running SQL migrations or DDL statements. The KV store approach eliminates the need for schema migrations while providing full CRUD functionality.

## ERD to KV Store Mapping

The ERD defines 22 entities. Here's how they map to KV store keys:

### Core Checklist Entities

#### 1. CHECKLIST
**KV Key Pattern**: `checklist:{id}`
```json
{
  "id": "checklist_1234567890_abc123",
  "title": "Safety Inspection - Draft 2024-03-16 - A7B3",
  "status": "draft | active | archived",
  "priority": "urgent | high | normal | low",
  "frequency": "ONE_OFF | PERMANENT | RECURRING",
  "cronExpression": "0 9 * * 1",
  "dueDate": "2024-04-01",
  "startDate": "2024-03-16",
  "isPermanent": false,
  "categoryId": "uuid",
  "category": "Safety & Compliance",
  "locationId": "uuid",
  "location": "Building A - Zone 3 - Line 1",
  "createdBy": "user_uuid",
  "createdByEmail": "user@example.com",
  "version": 3,
  "updatedAt": 1710604800000,
  "createdAt": 1710518400000,
  "validateChecklist": true,
  "managerName": "manager_uuid",
  "assignedTo": "team_uuid | user_uuid | all",
  "canvasFields": [...] // Array of field definitions
}
```

#### 2. SECTION (embedded in CHECKLIST)
Sections are embedded within `canvasFields` array:
```json
{
  "id": "section_uuid",
  "type": "SECTION",
  "title": "Pre-Flight Checks",
  "orderIndex": 0,
  "fields": [...] // Questions within this section
}
```

#### 3. QUESTION (embedded in SECTION)
Questions are embedded within section's `fields` array:
```json
{
  "id": "question_uuid",
  "type": "INPUT_TEXT | NUMERIC | DATETIME_PICKER | etc.",
  "label": "Equipment Temperature",
  "helpText": "Measure in Celsius",
  "isRequired": true,
  "orderIndex": 0,
  "config": {
    "maxLength": 100,
    "threshold": { "min": 0, "max": 100 },
    "unit": "°C",
    "precision": 2,
    "customButtons": [...]
  },
  "conditionalLogic": {
    "showIf": {
      "questionId": "prev_question_uuid",
      "operator": "equals",
      "value": "Yes"
    }
  }
}
```

### Execution & Submission

#### 4. CHECKLIST_ASSIGNMENT
**KV Key Pattern**: `assignment:{id}`
```json
{
  "id": "assignment_uuid",
  "checklistId": "checklist_uuid",
  "assignedTo": "user_uuid | team_uuid | all",
  "assignedBy": "user_uuid",
  "assignedAt": 1710518400000,
  "status": "pending | completed | overdue",
  "dueDate": 1710864000000,
  "completedAt": null,
  "submissionId": null
}
```

**Index Key**: `assignment:user:{userId}:{assignmentId}` → `assignment_uuid`

#### 5. CHECKLIST_EXECUTION / SUBMISSION
**KV Key Pattern**: `submission:{id}`
```json
{
  "id": "submission_uuid",
  "checklistId": "checklist_uuid",
  "assignmentId": "assignment_uuid",
  "submittedBy": "user_uuid",
  "submittedByEmail": "user@example.com",
  "submittedAt": 1710604800000,
  "status": "draft | submitted | validated | rejected",
  "answers": [...], // Array of ANSWER objects
  "totalScore": 85,
  "location": { "lat": 48.8566, "lng": 2.3522 },
  "attachments": [...],
  "signature": {...},
  "offlineCacheId": "offline_uuid",
  "validatedBy": "manager_uuid",
  "validatedAt": 1710691200000,
  "validationComments": "Approved"
}
```

#### 6. ANSWER (embedded in SUBMISSION)
Answers are stored in submission's `answers` array:
```json
{
  "id": "answer_uuid",
  "questionId": "question_uuid",
  "value": 75.5,
  "answeredAt": 1710604800000,
  "isFlagged": false,
  "score": 10,
  "attachments": [...]
}
```

#### 7. ATTACHMENT (embedded in ANSWER)
```json
{
  "id": "attachment_uuid",
  "fileUrl": "https://storage.supabase.co/...",
  "fileType": "image/jpeg",
  "fileSize": 204800
}
```

#### 8. SIGNATURE (embedded in SUBMISSION)
```json
{
  "id": "signature_uuid",
  "userId": "user_uuid",
  "signatureData": "data:image/png;base64,...",
  "signedAt": 1710604800000
}
```

### User & Organization

#### 9. USER
**Managed by Supabase Auth** - accessed via `supabase.auth.getUser()`
Additional user data in KV:
**KV Key Pattern**: `user:{id}`
```json
{
  "id": "user_uuid",
  "badgeNumber": "EMP-1234",
  "fullName": "John Doe",
  "email": "john@example.com",
  "role": "operator | manager | admin",
  "gamificationPoints": 250,
  "createdAt": 1710518400000
}
```

#### 10. TEAM
**KV Key Pattern**: `team:{id}`
```json
{
  "id": "team_uuid",
  "name": "Production Team A",
  "description": "Main production line team"
}
```

#### 11. USER_TEAM (join table)
**KV Key Pattern**: `user_team:{userId}:{teamId}`
```json
{
  "userId": "user_uuid",
  "teamId": "team_uuid",
  "joinedAt": 1710518400000
}
```

**Index Keys**:
- `user_teams:{userId}` → array of team IDs
- `team_users:{teamId}` → array of user IDs

#### 12. LOCATION
**KV Key Pattern**: `location:{id}`
```json
{
  "id": "location_uuid",
  "site": "Factory North",
  "zone": "Production Zone A",
  "line": "Assembly Line 3"
}
```

#### 13. CATEGORY
**KV Key Pattern**: `category:{id}`
```json
{
  "id": "category_uuid",
  "name": "Safety & Compliance",
  "color": "#FF5733"
}
```

### Advanced Features

#### 14. COMPONENT_LIBRARY
**KV Key Pattern**: `component:{id}`
```json
{
  "id": "component_uuid",
  "createdBy": "user_uuid",
  "name": "Temperature Check Template",
  "type": "NUMERIC_WITH_THRESHOLD",
  "config": {
    "label": "Temperature (°C)",
    "unit": "°C",
    "threshold": { "min": 0, "max": 100 },
    "precision": 1
  }
}
```

#### 15. TRIGGER_RULE
**KV Key Pattern**: `trigger:{id}`
```json
{
  "id": "trigger_uuid",
  "checklistId": "checklist_uuid",
  "eventType": "SUBMISSION_COMPLETED | THRESHOLD_EXCEEDED",
  "conditions": {
    "field": "temperature",
    "operator": ">",
    "value": 80
  },
  "actions": {
    "type": "SEND_TO_MES | CREATE_TODO | SEND_NOTIFICATION",
    "config": {
      "endpoint": "https://mes.example.com/api/alerts",
      "method": "POST",
      "payload": {...}
    }
  }
}
```

#### 16. MES_LOG
**KV Key Pattern**: `mes_log:{id}`
```json
{
  "id": "mes_log_uuid",
  "triggerRuleId": "trigger_uuid",
  "executionId": "submission_uuid",
  "method": "POST",
  "endpoint": "https://mes.example.com/api/alerts",
  "payload": {...},
  "statusCode": 200,
  "success": true,
  "calledAt": 1710604800000
}
```

### Field Declarations

#### 17. TAG
**KV Key Pattern**: `tag:{id}`
```json
{
  "id": "tag_uuid",
  "checklistId": "checklist_uuid",
  "createdBy": "user_uuid",
  "title": "Missing Equipment",
  "status": "open | closed",
  "description": "Safety helmet not available",
  "createdAt": 1710604800000
}
```

#### 18. IMMEDIATE_ACTION
**KV Key Pattern**: `immediate_action:{id}`
```json
{
  "id": "action_uuid",
  "executionId": "submission_uuid",
  "declaredBy": "user_uuid",
  "riskLevel": "low | medium | high | critical",
  "description": "Oil leak detected",
  "declaredAt": 1710604800000
}
```

#### 19. EVENT_DECLARATION
**KV Key Pattern**: `event:{id}`
```json
{
  "id": "event_uuid",
  "executionId": "submission_uuid",
  "declaredBy": "user_uuid",
  "eventType": "INCIDENT | OBSERVATION | SUGGESTION",
  "label": "Near Miss",
  "description": "Forklift came close to pedestrian",
  "declaredAt": 1710604800000
}
```

### Support & Gamification

#### 20. TODO_ITEM
**KV Key Pattern**: `todo:{id}`
```json
{
  "id": "todo_uuid",
  "userId": "user_uuid",
  "teamId": "team_uuid",
  "checklistId": "checklist_uuid",
  "executionId": "submission_uuid",
  "title": "Review temperature anomaly",
  "status": "pending | in_progress | completed | snoozed",
  "priority": "low | medium | high | urgent",
  "dueAt": 1710864000000,
  "snoozedUntil": null
}
```

#### 21. NOTIFICATION
**KV Key Pattern**: `notification:{id}`
```json
{
  "id": "notification_uuid",
  "userId": "user_uuid",
  "channel": "in_app | email | push",
  "type": "assignment | validation_required | submission_validated",
  "payload": {
    "checklistId": "checklist_uuid",
    "message": "You have been assigned a new checklist"
  },
  "isRead": false,
  "sentAt": 1710604800000
}
```

**Index Key**: `notification:user:{userId}:{notificationId}` → `notification_uuid`

#### 22. AUDIT_LOG
**KV Key Pattern**: `audit:{id}`
```json
{
  "id": "audit_uuid",
  "entityId": "checklist_uuid",
  "entityType": "CHECKLIST | SUBMISSION | USER",
  "userId": "user_uuid",
  "action": "CREATE | UPDATE | DELETE | PUBLISH",
  "diff": {
    "before": {...},
    "after": {...}
  },
  "occurredAt": 1710604800000
}
```

#### 23. BADGE
**KV Key Pattern**: `badge:{id}`
```json
{
  "id": "badge_uuid",
  "name": "Safety Champion",
  "description": "Completed 50 safety checklists",
  "icon": "🏆",
  "ruleType": "CHECKLIST_COUNT | SCORE_THRESHOLD | STREAK"
}
```

#### 24. USER_BADGE (join table)
**KV Key Pattern**: `user_badge:{userId}:{badgeId}`
```json
{
  "userId": "user_uuid",
  "badgeId": "badge_uuid",
  "earnedAt": 1710604800000
}
```

**Index Key**: `user_badges:{userId}` → array of badge IDs

## KV Store Query Patterns

### Prefix-based Queries
The KV store supports prefix-based queries using `kv.getByPrefix()`:

```typescript
// Get all checklists
const checklists = await kv.getByPrefix('checklist:');

// Get all assignments for a user
const assignments = await kv.getByPrefix('assignment:user:{userId}:');

// Get all notifications for a user
const notifications = await kv.getByPrefix('notification:user:{userId}:');
```

### Index Patterns
For efficient lookups, maintain index keys:

```typescript
// When creating an assignment
await kv.set(`assignment:${id}`, JSON.stringify(assignment));
await kv.set(`assignment:user:${userId}:${id}`, id);

// When querying
const assignmentIds = await kv.getByPrefix(`assignment:user:${userId}:`);
const assignments = await Promise.all(
  assignmentIds.map(id => kv.get(`assignment:${id}`))
);
```

## API Endpoints

All endpoints are prefixed with `/make-server-d5ac9b81`

### Checklists
- `POST /checklists` - Create draft
- `GET /checklists` - List (with filters: ?status=draft)
- `GET /checklists/:id` - Get by ID
- `PUT /checklists/:id` - Update (autosave)
- `DELETE /checklists/:id` - Delete
- `POST /checklists/:id/publish` - Publish

### Assignments
- `POST /assignments` - Create
- `GET /assignments` - List for current user
- `GET /assignments/:id` - Get by ID

### Submissions
- `POST /submissions` - Submit checklist
- `GET /submissions` - List (filters: ?checklistId=..., ?status=...)
- `GET /submissions/:id` - Get by ID
- `PUT /submissions/:id/validate` - Manager validation

### Notifications
- `GET /notifications` - List for user (?unread=true)
- `PUT /notifications/:id/read` - Mark as read
- `DELETE /notifications/:id` - Delete

## Future Migration Path

When ready to move to a traditional SQL database:

1. **Export KV data**: Use `kv.getByPrefix()` to export all entities
2. **Create SQL schema**: Use the ERD as a blueprint
3. **Migrate data**: Transform KV JSON to SQL rows
4. **Update routes**: Replace `kv.*` calls with SQL queries

The current KV structure closely mirrors the SQL schema, making migration straightforward.

## Benefits of KV Store Approach

✅ **No migrations needed** - Schema changes are instant  
✅ **Rapid prototyping** - Add/modify fields without DDL  
✅ **Flexible data model** - JSON supports nested structures  
✅ **Version control** - Easily track document versions  
✅ **Offline-first ready** - JSON is easy to cache locally  
✅ **Simple backup** - Export entire dataset as JSON  

## Limitations to Consider

⚠️ **No complex queries** - No JOINs, GROUP BY, etc.  
⚠️ **Manual indexing** - Must maintain index keys yourself  
⚠️ **No transactions** - Multiple writes aren't atomic  
⚠️ **Size limits** - Large datasets may need pagination  
⚠️ **No referential integrity** - Must validate relationships manually  

For prototyping and MVPs, the KV store is perfect. For production scale, consider migrating to PostgreSQL using the ERD as your schema.
