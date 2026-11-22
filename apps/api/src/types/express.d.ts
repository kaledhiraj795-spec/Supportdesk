import type { AuthIdentity } from "./auth";

declare global {
  namespace Express {
    interface Request {
      user?: AuthIdentity;
    }
  }
}

export {};
