process.env.NODE_ENV = "test";
process.env.PORT = "3000";
process.env.DATABASE_URL = "postgresql://test:test@localhost:5432/supportdesk_test";
process.env.JWT_SECRET = "test-only-secret-that-is-at-least-32-characters";
process.env.JWT_EXPIRES_IN_SECONDS = "3600";
process.env.CORS_ORIGINS = "http://localhost:5173,http://127.0.0.1:5173";
