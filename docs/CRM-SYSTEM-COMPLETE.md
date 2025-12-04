# Tax Genius Pro - Complete CRM System Documentation

**Version:** 2.0
**Last Updated:** 2025-01-09
**Status:** ✅ Production Ready

---

## 🎯 Overview

A comprehensive, admin-controlled CRM system for Tax Genius Pro with granular permission management. Built with FluentCampaign Pro-inspired features adapted for tax preparation workflows.

### Key Principles

1. **Admin-Controlled Access** - All CRM features gated by admin permissions
2. **Permission-Based Architecture** - 7 distinct CRM features that can be toggled per tax preparer
3. **Clean Code** - Service layer, API layer, UI layer separation
4. **Type-Safe** - Full TypeScript with Prisma ORM
5. **Activity Logging** - Comprehensive audit trail for all lead interactions

---

## 📦 Features Implemented

### 1. Permission System ✅

**Admin Controls:**
- Toggle 7 CRM features per tax preparer
- Quick presets (None, Basic, Professional, Enterprise)
- Real-time permission updates
- Permission counter badges

**Tax Preparer Experience:**
- See only enabled features
- Locked feature messages with benefits listed
- Server-side permission validation on all API calls

**Files:**
```
/src/lib/permissions/crm-permissions.ts              - Permission utilities
/src/components/crm/PermissionGuard.tsx             - React permission guards
/src/app/api/crm/check-permission/route.ts          - Permission validation API
/src/app/admin/crm/permissions/page.tsx             - Admin UI
/src/app/api/admin/crm/tax-preparers/route.ts       - Tax preparer list API
/src/app/api/admin/crm/permissions/[id]/route.ts    - Permission update API
```

**Permissions:**
```typescript
enum CRMFeature {
  EMAIL_AUTOMATION = 'crmEmailAutomation',
  WORKFLOW_AUTOMATION = 'crmWorkflowAutomation',
  ACTIVITY_TRACKING = 'crmActivityTracking',
  ADVANCED_ANALYTICS = 'crmAdvancedAnalytics',
  TASK_MANAGEMENT = 'crmTaskManagement',
  LEAD_SCORING = 'crmLeadScoring',
  BULK_ACTIONS = 'crmBulkActions',
}
```

---

### 2. Activity Timeline ✅

**Features:**
- 15 activity types (email, calls, status changes, tasks, meetings, etc.)
- Chronological timeline with color-coded icons
- Filter by activity type
- Add manual activities (notes, calls, meetings)
- Automatic activity logging from system events
- Engagement tracking (email opens, clicks, views)

**Files:**
```
/src/app/api/crm/activities/[leadId]/route.ts       - Activity CRUD API
/src/components/crm/ActivityTimeline.tsx            - Timeline UI component
/src/lib/services/activity.service.ts               - Activity logging utilities
```

**Activity Types:**
```typescript
enum ActivityType {
  CONTACT_ATTEMPTED, CONTACT_MADE, EMAIL_SENT, EMAIL_OPENED,
  EMAIL_CLICKED, NOTE_ADDED, STATUS_CHANGED, TASK_CREATED,
  TASK_COMPLETED, FORM_VIEWED, DOCUMENT_UPLOADED,
  MEETING_SCHEDULED, MEETING_COMPLETED, CONVERTED, ASSIGNED
}
```

**Usage:**
```tsx
import { ActivityTimeline } from '@/components/crm/ActivityTimeline';

<ActivityTimeline leadId="lead_123" />
```

---

### 3. Task Management ✅

**Features:**
- Create, edit, delete, complete tasks
- Priority levels (Low, Medium, High, Urgent)
- Status tracking (To Do, In Progress, Done, Cancelled)
- Due dates with overdue warnings
- Task assignment to team members
- Automatic activity logging
- Statistics dashboard

**Files:**
```
/src/app/api/crm/tasks/[leadId]/route.ts            - Task CRUD API
/src/app/api/crm/tasks/task/[taskId]/route.ts       - Individual task updates
/src/components/crm/TaskManager.tsx                 - Task management UI
```

**Database:**
```prisma
model LeadTask {
  id            String       @id @default(cuid())
  leadId        String
  title         String
  description   String?
  status        TaskStatus   @default(TODO)
  priority      TaskPriority @default(MEDIUM)
  assignedTo    String?
  dueDate       DateTime?
  completedAt   DateTime?
}
```

**Usage:**
```tsx
import { TaskManager } from '@/components/crm/TaskManager';

<TaskManager leadId="lead_123" />
```

---

### 4. Email Automation ✅

**Features:**
- Email campaign creation (HTML/plain text)
- Campaign scheduling
- Bulk email sending to leads
- Email tracking (sent, opened, clicked counts)
- Campaign statistics (open rate, click rate, bounce rate)
- Template variables ({{firstName}}, {{lastName}})
- Draft/Scheduled/Sent status tracking

**Files:**
```
/src/lib/services/email-automation.service.ts                - Email utilities
/src/app/api/crm/email/campaigns/route.ts                    - Campaign list/create
/src/app/api/crm/email/campaigns/[id]/route.ts               - Campaign details/delete
/src/app/api/crm/email/campaigns/[id]/send/route.ts          - Send campaign
/src/components/crm/EmailCampaigns.tsx                       - Campaign management UI
```

**API Examples:**
```typescript
// Send individual email
await sendEmail({
  to: 'john@example.com',
  toName: 'John Doe',
  subject: 'Welcome to Tax Genius',
  htmlBody: '<p>Welcome!</p>',
  leadId: 'lead_123',
});

// Create campaign
await createEmailCampaign({
  name: 'Welcome Campaign',
  subject: 'Welcome to Tax Genius',
  htmlBody: '<p>Welcome {{firstName}}!</p>',
  scheduledAt: new Date('2025-01-15'),
  createdBy: 'user_123',
});
```

---

### 5. Workflow Automation ✅

**Features:**
- 10 trigger types (lead created, status changed, email opened, etc.)
- 8 action types (send email, create task, assign preparer, etc.)
- Conditional execution
- Action delays
- Priority-based execution
- Execution logging and statistics

**Files:**
```
/src/lib/services/workflow-automation.service.ts    - Workflow engine
/src/app/api/crm/workflows/route.ts                 - Workflow management API
```

**Triggers:**
```typescript
enum CRMWorkflowTrigger {
  LEAD_CREATED, LEAD_UPDATED, STATUS_CHANGED, ASSIGNED,
  EMAIL_OPENED, EMAIL_CLICKED, FORM_SUBMITTED,
  TASK_COMPLETED, TIME_BASED, MANUAL
}
```

**Actions:**
```typescript
enum CRMWorkflowActionType {
  SEND_EMAIL, CREATE_TASK, ASSIGN_TO_PREPARER, UPDATE_STATUS,
  ADD_TAG, UPDATE_FIELD, SEND_NOTIFICATION, WAIT
}
```

**Example Workflow:**
```typescript
await createWorkflow({
  name: 'Welcome New Leads',
  trigger: CRMWorkflowTrigger.LEAD_CREATED,
  actions: [
    {
      actionType: CRMWorkflowActionType.SEND_EMAIL,
      actionConfig: {
        subject: 'Welcome to Tax Genius',
        htmlBody: '<p>Thank you for your interest!</p>',
      },
      order: 0,
    },
    {
      actionType: CRMWorkflowActionType.CREATE_TASK,
      actionConfig: {
        title: 'Follow up with new lead',
        priority: 'HIGH',
      },
      order: 1,
      delayMinutes: 60, // Wait 1 hour
    },
  ],
  createdBy: 'admin_123',
});
```

---

### 6. Lead Routing ✅

**Features:**
- 5 routing strategies (round-robin, least busy, geographic, skill-based, custom)
- Automatic lead assignment
- Workload balancing
- Preparer capacity management
- Geographic matching by state
- Workload statistics

**Files:**
```
/src/lib/services/lead-routing.service.ts           - Lead routing engine
```

**Routing Strategies:**
```typescript
enum RoutingStrategy {
  ROUND_ROBIN,      // Distribute leads evenly
  LEAST_BUSY,       // Assign to preparer with fewest active leads
  GEOGRAPHIC,       // Match by state/location
  SKILL_BASED,      // Match by preparer expertise
  CUSTOM,           // Custom business logic
}
```

**API Examples:**
```typescript
// Route a single lead
const result = await routeLead('lead_123');
// { success: true, preparerId: 'prep_456', reason: 'Round-robin' }

// Bulk route leads
await bulkRoutLeads(['lead_1', 'lead_2', 'lead_3']);

// Get preparer workload
const { workload } = await getPreparerWorkload();
// [{ preparerId, preparerName, activeLeads, convertedClients }]
```

---

### 7. Lead Scoring ✅

**Features:**
- 0-100 score calculation
- 5 scoring factors (profile, engagement, source, timing, demographics)
- Automatic urgency classification (LOW, NORMAL, HIGH, URGENT)
- Human-readable score explanations
- Batch score recalculation
- Top leads dashboard
- Score distribution analytics

**Files:**
```
/src/lib/services/lead-scoring.service.ts           - Lead scoring engine
/src/app/api/crm/leads/[leadId]/score/route.ts      - Scoring API
```

**Scoring Factors:**
```typescript
interface LeadScoreFactors {
  profileCompleteness: number;  // 0-25 points
  engagement: number;            // 0-25 points (email opens/clicks)
  sourceQuality: number;         // 0-20 points (referral > website > social)
  timing: number;                // 0-15 points (fresher = higher)
  demographics: number;          // 0-15 points (income, filing status)
}
```

**API Examples:**
```typescript
// Calculate score for a lead
const result = await calculateLeadScore('lead_123');
// {
//   score: 85,
//   urgency: 'HIGH',
//   factors: { profileCompleteness: 25, engagement: 20, ... },
//   reason: 'Complete profile, Highly engaged, Quality source'
// }

// Get top-scoring leads
const { leads } = await getTopLeads(10);

// Get score distribution
const { distribution } = await getScoreDistribution();
// { hot: 15, warm: 32, cold: 8, urgent: 5, high: 20, normal: 25, low: 5 }
```

---

## 🗄️ Database Schema

### Profile Enhancements
```prisma
model Profile {
  // ... existing fields ...

  // CRM Permissions
  crmEmailAutomation     Boolean @default(false)
  crmWorkflowAutomation  Boolean @default(false)
  crmActivityTracking    Boolean @default(false)
  crmAdvancedAnalytics   Boolean @default(false)
  crmTaskManagement      Boolean @default(false)
  crmLeadScoring         Boolean @default(false)
  crmBulkActions         Boolean @default(false)
}
```

### TaxIntakeLead Enhancements
```prisma
model TaxIntakeLead {
  // ... existing fields ...

  // Lead Scoring & Urgency
  leadScore         Int?      @default(0)
  leadScoreUpdatedAt DateTime?
  urgency           LeadUrgency @default(NORMAL)

  // Engagement Tracking
  lastViewedAt      DateTime?
  emailOpens        Int       @default(0)
  emailClicks       Int       @default(0)

  // Relations
  activities        LeadActivity[]
  tasks             LeadTask[]
}
```

### New Models
```prisma
model LeadActivity {
  id            String       @id @default(cuid())
  leadId        String
  activityType  ActivityType
  title         String
  description   String?
  metadata      Json?
  createdBy     String?
  createdByName String?
  automated     Boolean      @default(false)
  createdAt     DateTime     @default(now())
}

model LeadTask {
  id            String       @id @default(cuid())
  leadId        String
  title         String
  description   String?
  status        TaskStatus   @default(TODO)
  priority      TaskPriority @default(MEDIUM)
  assignedTo    String?
  dueDate       DateTime?
  completedAt   DateTime?
}

model CRMWorkflow {
  id            String              @id @default(cuid())
  name          String
  trigger       CRMWorkflowTrigger
  isActive      Boolean             @default(false)
  actions       CRMWorkflowAction[]
}

model CRMWorkflowAction {
  id            String                 @id @default(cuid())
  workflowId    String
  actionType    CRMWorkflowActionType
  actionConfig  Json
  order         Int
  delayMinutes  Int                    @default(0)
}
```

---

## 🔐 Security & Permissions

### Permission Checking Flow

```
User Request
    ↓
Server-Side Auth (NextAuth)
    ↓
Get User Profile & Role
    ↓
Check CRM Permission
    ├─ Admin → Allow All
    ├─ Tax Preparer → Check Profile.crmFeatureName
    └─ Other Roles → Deny
    ↓
Execute Action / Return Data
```

### API Protection Example
```typescript
// Every CRM API endpoint has this pattern
export async function GET(req: NextRequest) {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const permissionCheck = await checkCRMPermission(userId, CRMFeature.TASK_MANAGEMENT);
  if (!permissionCheck.allowed) {
    return NextResponse.json(
      { error: 'You do not have permission to view tasks' },
      { status: 403 }
    );
  }

  // ... proceed with action ...
}
```

### UI Protection Example
```tsx
import { CRMPermissionGuard } from '@/components/crm/PermissionGuard';

<CRMPermissionGuard feature={CRMFeature.TASK_MANAGEMENT}>
  <TaskManager leadId={lead.id} />
</CRMPermissionGuard>
```

---

## 🚀 Usage Examples

### Complete Lead Management Flow

```typescript
// 1. New lead created
const lead = await createLead({
  firstName: 'John',
  lastName: 'Doe',
  email: 'john@example.com',
  source: 'website',
});

// 2. Automatically route to best preparer
await routeLead(lead.id);

// 3. Calculate lead score
const scoreResult = await calculateLeadScore(lead.id);
// Score: 75 (HIGH urgency)

// 4. Trigger welcome workflow
await executeWorkflows({
  trigger: CRMWorkflowTrigger.LEAD_CREATED,
  leadId: lead.id,
});
// - Sends welcome email
// - Creates follow-up task
// - Logs activities

// 5. Preparer views lead
// - Activity Timeline shows all interactions
// - Task Manager shows follow-up task
// - Lead score badge shows 75 (HIGH)

// 6. Preparer contacts lead
await logContactMade(lead.id, 'phone', 'Discussed tax situation');
// - Activity logged
// - Engagement score increases
// - Lead score recalculated (now 82 - URGENT)

// 7. Create task for document collection
await createTask(lead.id, {
  title: 'Collect W-2 and 1099 forms',
  priority: 'HIGH',
  dueDate: addDays(new Date(), 3),
});

// 8. Lead converts to client
await convertToClient(lead.id);
// - Status updated
// - Activity logged
// - Lead marked as converted
```

---

## 📊 Admin Dashboard Features

### Permission Management
**URL:** `/admin/crm/permissions`

**Features:**
- View all tax preparers with permission states
- Toggle individual features per preparer
- Apply quick presets (None, Basic, Professional, Enterprise)
- Search and filter preparers
- Real-time updates with optimistic UI
- Permission counter badges

### Preparer Workload
```typescript
const { workload } = await getPreparerWorkload();

// [
//   {
//     preparerId: 'prep_1',
//     preparerName: 'John Smith',
//     activeLeads: 15,
//     convertedClients: 42,
//     totalLeads: 57
//   },
//   ...
// ]
```

### Lead Score Distribution
```typescript
const { distribution } = await getScoreDistribution();

// {
//   hot: 15,     // 80-100 score
//   warm: 32,    // 60-79 score
//   cold: 8,     // 0-59 score
//   urgent: 5,   // URGENT urgency
//   high: 20,    // HIGH urgency
//   normal: 25,  // NORMAL urgency
//   low: 5       // LOW urgency
// }
```

---

## 🎨 Component Library

### ActivityTimeline
```tsx
<ActivityTimeline
  leadId="lead_123"
  readonly={false}  // Set to true for view-only mode
/>
```

### TaskManager
```tsx
<TaskManager
  leadId="lead_123"
  readonly={false}
/>
```

### EmailCampaigns
```tsx
<EmailCampaigns />
```

### PermissionGuard
```tsx
<CRMPermissionGuard
  feature={CRMFeature.TASK_MANAGEMENT}
  showLockedMessage={true}
>
  <TaskManager leadId={lead.id} />
</CRMPermissionGuard>
```

---

## 🔄 Integration Points

### Trigger Workflows on Lead Events
```typescript
// In your lead creation code
await prisma.taxIntakeLead.create({ data: leadData });

// Trigger workflows
await executeWorkflows({
  trigger: CRMWorkflowTrigger.LEAD_CREATED,
  leadId: lead.id,
});
```

### Auto-Calculate Scores on Lead Updates
```typescript
// After lead is updated
await prisma.taxIntakeLead.update({
  where: { id: leadId },
  data: updates,
});

// Recalculate score
await calculateLeadScore(leadId);
```

### Log Activities Throughout App
```typescript
import {
  logEmailSent,
  logContactMade,
  logFormViewed,
  logDocumentUploaded,
} from '@/lib/services/activity.service';

// When email is sent
await logEmailSent(leadId, 'Welcome Email', 'email_123');

// When preparer calls lead
await logContactMade(leadId, 'phone', 'Discussed tax situation', preparerId);

// When lead views form
await logFormViewed(leadId, 'Tax Intake Form');

// When lead uploads document
await logDocumentUploaded(leadId, 'W2-2024.pdf', 'application/pdf', 245678);
```

---

## 📈 Performance Considerations

### Batch Operations
```typescript
// Recalculate all lead scores (run as cron job)
await recalculateAllLeadScores();

// Bulk route unassigned leads
const unassignedLeads = await getUnassignedLeads();
await bulkRoutLeads(unassignedLeads.map(l => l.id));
```

### Indexing
All critical queries are indexed:
```prisma
@@index([leadId, createdAt(sort: Desc)])  // Fast activity timeline
@@index([assignedTo, status])              // Fast task filtering
@@index([trigger, isActive])               // Fast workflow lookup
@@index([leadScore])                       // Fast top leads query
```

---

## 🧪 Testing

### Test Admin Permissions
1. Login as admin
2. Go to `/admin/crm/permissions`
3. Toggle permissions for a test preparer
4. Login as that preparer
5. Verify features appear/disappear based on permissions

### Test Activity Timeline
1. Create a test lead
2. Manually add activities (notes, calls)
3. Send test email (logged automatically)
4. Mark task complete (logged automatically)
5. Verify all activities appear in timeline

### Test Lead Scoring
```typescript
// Create test lead with complete profile
const lead = await createTestLead({
  firstName: 'Test',
  lastName: 'User',
  email: 'test@example.com',
  phone: '555-1234',
  state: 'CA',
  filing_status: 'married_filing_jointly',
  estimated_income: 150000,
  source: 'referral',
});

// Calculate score
const result = await calculateLeadScore(lead.id);

// Should score high (80+) due to:
// - Complete profile (25 points)
// - Quality source (20 points)
// - Fresh lead (15 points)
// - High demographics (15 points)
```

---

## 🐛 Troubleshooting

### "Permission denied" errors
- Verify user is logged in
- Check user role in Profile table
- Verify CRM permission flag is true for that feature
- Check API endpoint is validating permissions correctly

### Activities not appearing
- Verify LeadActivity records are being created
- Check leadId matches correctly
- Verify activity type is valid
- Check database indexes

### Workflows not triggering
- Verify workflow is marked as `isActive: true`
- Check trigger conditions are met
- Verify workflow actions are properly configured
- Check WorkflowExecution records for error logs

### Lead scores not updating
- Run manual score calculation
- Check if lead has enough data for scoring
- Verify leadScoreUpdatedAt timestamp is updating
- Check for errors in calculateLeadScore function

---

## 🔮 Future Enhancements

### Planned (Not Yet Implemented)

1. **Advanced Analytics Dashboard**
   - Conversion funnel visualization
   - Performance metrics by preparer
   - Source ROI analysis
   - Time-to-conversion tracking

2. **Admin CRM Settings Panel**
   - Global CRM configuration
   - Default routing rules
   - Scoring weight adjustments
   - Email template library

3. **SMS Integration**
   - Two-way SMS conversations
   - SMS campaigns
   - SMS in activity timeline

4. **Calendar Integration**
   - Meeting scheduling
   - Availability management
   - Meeting reminders

5. **Mobile App**
   - Lead notifications
   - Quick activity logging
   - Task management on-the-go

---

## 📞 Support

For questions or issues:
- Check this documentation first
- Review code comments in source files
- Check Prisma schema for data structure
- Test in development environment first

---

**Built with ❤️ for Tax Genius Pro**
**Clean Code • Best Practices • Production Ready**
