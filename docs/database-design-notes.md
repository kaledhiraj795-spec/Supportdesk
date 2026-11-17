# SupportDesk Database Design Notes

## 1. Project Requirements
Source: Proposed SupportDesk PRD v0.1.
Status: Proposed design; assumptions require review.

## 2. Entity List

### User
Important fields:
- id — Primary key candidate
- name — Required
- email — Required, unique
- passwordHash — Required
- role — Required (customer, agent, admin)

### Ticket
- id — Primary key candidate
- title — Required
- description — Required
- status — Required
- priority — Required
- category — Required; allowed values are not yet decided
- creatorId — Required; references User
- assigneeId — Optional; references User
- slaDueAt — Requiredness and calculation need confirmation

### Comment
- id — Primary key candidate
- ticketId — Required; references Ticket
- authorId — Required; references User
- body — Required
- isInternal — Required; default behaviour needs confirmation

### Tag
- id — Primary key candidate
- name — Required; uniqueness needs confirmation

### Attachment
- id — Primary key candidate
- ticketId — Required; references Ticket
- fileName — Required
- Additional file metadata — Exact fields need confirmation

### AuditLog
- id — Primary key candidate
- actorId — Required; references User
- action — Required
- target — Required; representation needs confirmation
- timestamp — Required

## 3. Primary Key Candidates
Each entity can use an id field as its primary key.
The final database ID type will be decided during schema design review.

## 4. Relationships and Cardinality
- User (1) to Ticket (many): ticket creator.
- User (1) to Ticket (many): assigned agent; assignment is optional.
- Ticket (1) to Comment (many).
- User (1) to Comment (many): comment author.
- Ticket (many) to Tag (many): requires a join table, provisionally TicketTag.
- Ticket (1) to Attachment (many).
- User (1) to AuditLog (many): actor.

## 5. Business Rules
- Every ticket must have a creator.
- Every ticket must have a title and description.
- Ticket status must be one of: open, in_progress, waiting_on_customer, resolved, closed.
- Ticket priority must be one of: P1, P2, P3, P4.
- A ticket may have an assigned agent.
- Every comment must belong to a ticket and have an author.
- Tickets and tags have a many-to-many relationship.
- User email addresses must be unique.
- Passwords must be stored as hashes, not plain text.
- Important ticket activities must be recorded in the audit log.

## 6. Open Questions and Assumptions
1. Should ticket categories be a fixed list or user-defined?
2. Is slaDueAt mandatory, and how is it calculated?
3. Can customers see only public comments?
4. What attachment file types and maximum sizes are allowed?
5. Which events must create audit log entries?
6. Should users be deleted or deactivated?
7. What should happen to related tickets and comments when a user is deleted?
8. Can agents assign tickets to other agents?
9. Should tag names be unique?
10. Which exact metadata fields should Attachment store?

## 7. Design Decisions Pending
- Final field data types.
- Enum definitions.
- Foreign key delete behaviour.
- Database constraints.
- Index decisions.
- Final migration design.

## Task 2 — AI-Assisted Schema Review

### Accepted Suggestions

1. **UUID primary keys:** Use UUID as the proposed primary key for each entity. It provides unique identifiers. Final approval is pending.
2. **Unique email:** User email should be required and unique to prevent duplicate accounts.
3. **Enums:** Use enums for UserRole, TicketStatus and TicketPriority because the proposed PRD defines fixed values.
4. **TicketTag join table:** Use a separate join table to represent the many-to-many relationship between Ticket and Tag.
5. **Foreign keys:** Use foreign keys to maintain relationships between users, tickets, comments, attachments and audit logs.

### Pending Decisions

1. Tag name uniqueness needs confirmation.
2. Attachment metadata and allowed file types need confirmation.
3. Delete behaviour for related records needs lead confirmation.
4. Category values are not confirmed; do not create a fixed enum yet.
5. SLA due-time rules need confirmation.
6. Comment visibility default needs confirmation.

### Index Review

Index selection is deferred to Task 3. No indexes are finalized in this task.

### Open Questions

1. Are ticket categories fixed or configurable?
2. Can comments be internal or public, and who can view them?
3. What attachment file types and size limits are allowed?
4. Which actions must be recorded in AuditLog?
5. How is SLA due time calculated?
6. What happens to related records when a user or ticket is deleted?
7. Can tickets be reassigned between agents?

### Review Status

This is an AI-assisted proposal based on the proposed SupportDesk PRD v0.1. It is not lead-approved. Pending decisions must be confirmed before final schema implementation.

## Task 3 — Index and Query Performance Review

### Main Queries Identified

1. Find tickets created by a specific customer.
2. Find tickets assigned to a specific agent.
3. Filter tickets by status and priority.
4. Load comments for a specific ticket.
5. Find tags associated with a ticket.
6. Load audit history for a specific target.
7. Find tickets approaching or exceeding their SLA due time.

### Index Decisions

| Query / Use Case | Proposed Index | Reason | Trade-off / Decision |
|---|---|---|---|
| Customer's tickets | Ticket(creatorId) | Helps find tickets created by a user | Extra storage and write overhead; proposed |
| Agent's assigned tickets | Ticket(assigneeId) | Helps find tickets assigned to an agent | Extra storage and write overhead; proposed |
| Filter by status and priority | Ticket(status, priority) | May help queries filtering by both fields | Confirm actual query pattern and column order before finalizing |
| Load ticket comments | Comment(ticketId) | Helps retrieve comments belonging to a ticket | Extra storage and write overhead; proposed |
| Load tags for a ticket | TicketTag(ticketId, tagId) | Helps find tags linked to a ticket | Consider a unique constraint on the pair; avoid a duplicate index |
| Find tickets for a tag | TicketTag(tagId, ticketId) | May help reverse lookup from tag to tickets | Add only if this query is required and the existing index does not support it |
| Load audit history | AuditLog(targetType, targetId) | Could help find history for a particular target | Pending: target fields and query requirements must be confirmed |
| Find tickets by SLA due time | Ticket(slaDueAt) | Could help find tickets due soon or overdue | Pending: confirm SLA query and due-time rules |

### Redundant Index Review

- A unique constraint on (ticketId, tagId) can provide an index for that column order.
- Do not create another identical index on (ticketId, tagId).
- The reverse index (tagId, ticketId) is a separate candidate and should be added only if tag-based ticket lookup is required.
- Do not add indexes without a confirmed query requirement.

### Pending Questions

1. Will tickets commonly be filtered by status and priority together, or separately?
2. Must users search tickets by tag?
3. What exact fields identify an AuditLog target?
4. What is the expected SLA due-time query?
5. Are sorting, pagination or date-range filters required for ticket lists?

### Review Status

These are proposed index decisions based on the proposed SupportDesk PRD v0.1 and identified query patterns. They are not final or lead-approved. Final indexes must be checked against actual queries and the approved schema. No Prisma schema changes have been made in this task.
