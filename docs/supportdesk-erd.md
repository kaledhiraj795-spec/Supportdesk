
# SupportDesk Entity Relationship Diagram

```mermaid
erDiagram
    User {
        UUID id PK
        String name
        String email UK
        String passwordHash
        UserRole role
        DateTime createdAt
        DateTime updatedAt
    }

    Ticket {
        UUID id PK
        String title
        String description
        TicketStatus status
        TicketPriority priority
        String category
        UUID creatorId FK
        UUID assigneeId FK
        DateTime slaDueAt
        DateTime createdAt
        DateTime updatedAt
    }

    Comment {
        UUID id PK
        UUID ticketId FK
        UUID authorId FK
        String body
        Boolean isInternal
        DateTime createdAt
    }

    Tag {
        UUID id PK
        String name UK
    }

    TicketTag {
        UUID ticketId PK, FK
        UUID tagId PK, FK
    }

    Attachment {
        UUID id PK
        UUID ticketId FK
        String fileName
        DateTime createdAt
    }

    AuditLog {
        UUID id PK
        UUID actorId FK
        String action
        String targetType
        UUID targetId
        DateTime timestamp
    }

    User ||--o{ Ticket : creates
    User o|--o{ Ticket : assigned_to
    User ||--o{ Comment : writes
    User ||--o{ AuditLog : performs
    Ticket ||--o{ Comment : has
    Ticket ||--o{ Attachment : contains
    Ticket ||--o{ TicketTag : has
    Tag ||--o{ TicketTag : categorizes
    ```