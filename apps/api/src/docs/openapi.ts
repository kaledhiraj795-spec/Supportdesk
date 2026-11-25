export const openApiDocument = {
  openapi: "3.0.3",
  info: {
    title: "SupportDesk API",
    version: "1.0.0",
    description: "SupportDesk authentication, ticket querying and comment API"
  },
  servers: [{ url: "http://localhost:3000" }],
  components: {
    securitySchemes: {
      bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" }
    },
    schemas: {
      Envelope: {
        type: "object",
        properties: {
          data: {},
          error: { nullable: true, type: "object" },
          meta: { nullable: true, type: "object" }
        }
      },
      Ticket: {
        type: "object",
        required: ["id", "title", "description", "status", "priority", "category", "creatorId"],
        properties: {
          id: { type: "string", format: "uuid" },
          title: { type: "string" },
          description: { type: "string" },
          status: { type: "string", enum: ["open", "in_progress", "waiting_on_customer", "resolved", "closed"] },
          priority: { type: "string", enum: ["P1", "P2", "P3", "P4"] },
          category: { type: "string" },
          creatorId: { type: "string", format: "uuid" },
          assigneeId: { type: "string", format: "uuid", nullable: true }
        }
      },
      Comment: {
        type: "object",
        required: ["id", "ticketId", "authorId", "body", "isInternal", "createdAt"],
        properties: {
          id: { type: "string", format: "uuid" },
          ticketId: { type: "string", format: "uuid" },
          authorId: { type: "string", format: "uuid" },
          body: { type: "string" },
          isInternal: { type: "boolean" },
          createdAt: { type: "string", format: "date-time" }
        }
      },
      RegisterRequest: {
        type: "object",
        required: ["name", "email", "password"],
        properties: {
          name: { type: "string", minLength: 1, maxLength: 100 },
          email: { type: "string", format: "email", maxLength: 254 },
          password: { type: "string", minLength: 12, maxLength: 128 }
        }
      },
      LoginRequest: {
        type: "object",
        required: ["email", "password"],
        properties: {
          email: { type: "string", format: "email", maxLength: 254 },
          password: { type: "string", minLength: 1, maxLength: 128 }
        }
      },
      TicketCreateRequest: {
        type: "object",
        required: ["title", "description", "priority", "category"],
        properties: {
          title: { type: "string", minLength: 1 },
          description: { type: "string", minLength: 1 },
          priority: { type: "string", enum: ["P1", "P2", "P3", "P4"] },
          category: { type: "string", minLength: 1 },
          assigneeId: { type: "string", format: "uuid", nullable: true },
          status: { type: "string", enum: ["open", "in_progress", "waiting_on_customer", "resolved", "closed"] },
          slaDueAt: { type: "string", format: "date-time", nullable: true }
        }
      },
      TicketUpdateRequest: {
        type: "object",
        properties: {
          title: { type: "string", minLength: 1 },
          description: { type: "string", minLength: 1 },
          priority: { type: "string", enum: ["P1", "P2", "P3", "P4"] },
          category: { type: "string", minLength: 1 },
          assigneeId: { type: "string", format: "uuid", nullable: true },
          status: { type: "string", enum: ["open", "in_progress", "waiting_on_customer", "resolved", "closed"] },
          slaDueAt: { type: "string", format: "date-time", nullable: true }
        }
      }
    }
  },
  security: [{ bearerAuth: [] }],
  paths: {
    "/health": {
      get: {
        security: [],
        responses: { "200": { description: "Health status" } }
      }
    },
    "/auth/register": {
      post: {
        security: [],
        requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/RegisterRequest" } } } },
        responses: { "201": { description: "Customer registered" }, "400": { description: "Invalid input" }, "409": { description: "Duplicate email" } }
      }
    },
    "/auth/login": {
      post: {
        security: [],
        requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/LoginRequest" } } } },
        responses: { "200": { description: "Authenticated" }, "400": { description: "Invalid input" }, "401": { description: "Invalid credentials" }, "429": { description: "Rate limited" } }
      }
    },
    "/tickets": {
      get: {
        parameters: [
          { name: "page", in: "query", schema: { type: "integer", minimum: 1, default: 1 } },
          { name: "limit", in: "query", schema: { type: "integer", minimum: 1, maximum: 100, default: 20 } },
          { name: "status", in: "query", schema: { type: "string", enum: ["open", "in_progress", "waiting_on_customer", "resolved", "closed"] } },
          { name: "priority", in: "query", schema: { type: "string", enum: ["P1", "P2", "P3", "P4"] } },
          { name: "assigneeId", in: "query", schema: { type: "string", format: "uuid" } },
          { name: "search", in: "query", schema: { type: "string", maxLength: 200 } },
          { name: "sortBy", in: "query", schema: { type: "string", enum: ["createdAt", "updatedAt", "title", "status", "priority"], default: "createdAt" } },
          { name: "sortOrder", in: "query", schema: { type: "string", enum: ["asc", "desc"], default: "desc" } }
        ],
        responses: { "200": { description: "Ticket page" }, "400": { description: "Invalid query" }, "401": { description: "Authentication required" } }
      },
      post: {
        requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/TicketCreateRequest" } } } },
        responses: { "201": { description: "Ticket created" }, "400": { description: "Invalid input" }, "401": { description: "Authentication required" }, "403": { description: "Forbidden" } }
      }
    },
    "/tickets/{id}": {
      get: {
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        responses: { "200": { description: "Ticket" }, "400": { description: "Invalid ID" }, "404": { description: "Ticket not found" } }
      },
      patch: {
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/TicketUpdateRequest" } } } },
        responses: { "200": { description: "Ticket updated" }, "400": { description: "Invalid input" }, "404": { description: "Ticket not found" }, "403": { description: "Forbidden" } }
      }
    },
    "/tickets/{id}/ai/suggest-reply": {
      post: {
        summary: "Stream a reply draft for staff review",
        description: "Uses the server-side Gemini integration configured with GEMINI_API_KEY.",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        responses: {
          "200": { description: "Server-sent events containing draft text deltas", content: { "text/event-stream": { schema: { type: "string" } } } },
          "401": { description: "Authentication required" },
          "403": { description: "Staff access required" },
          "404": { description: "Ticket not found" },
          "502": { description: "AI provider request failed" },
          "503": { description: "AI features are not configured (GEMINI_API_KEY is unset)" }
        }
      }
    },
    "/tickets/{id}/ai/categorise": {
      post: {
        summary: "Suggest a ticket category and priority for staff review",
        description: "Uses the server-side Gemini integration configured with GEMINI_API_KEY.",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        responses: {
          "200": { description: "Validated category and priority suggestion" },
          "401": { description: "Authentication required" },
          "403": { description: "Staff access required" },
          "404": { description: "Ticket not found" },
          "502": { description: "AI provider response was invalid" },
          "503": { description: "AI features are not configured (GEMINI_API_KEY is unset)" }
        }
      }
    },
    "/tickets/{ticketId}/comments": {
      get: {
        parameters: [{ name: "ticketId", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        responses: { "200": { description: "Comments visible to the authenticated role" }, "400": { description: "Invalid ticket ID" }, "404": { description: "Ticket not found" } }
      },
      post: {
        parameters: [{ name: "ticketId", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["body"],
                properties: { body: { type: "string", minLength: 1, maxLength: 5000 }, isInternal: { type: "boolean" } }
              }
            }
          }
        },
        responses: { "201": { description: "Comment created" }, "400": { description: "Invalid input" }, "404": { description: "Ticket not found" } }
      }
    }
  }
};
