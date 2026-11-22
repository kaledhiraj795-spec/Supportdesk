export type UserRole = "customer" | "agent" | "admin";

export type AuthIdentity = {
  id: string;
  role: string;
};

export type PublicUser = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  createdAt: Date;
};
