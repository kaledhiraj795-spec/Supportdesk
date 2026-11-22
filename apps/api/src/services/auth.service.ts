import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { env } from "../config/env";
import { createCustomer, findUserByEmail } from "../repositories/auth.repository";
import type { PublicUser, UserRole } from "../types/auth";

const passwordRounds = 12;

const publicUser = (user: {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  createdAt: Date;
}): PublicUser => ({
  id: user.id,
  name: user.name,
  email: user.email,
  role: user.role,
  createdAt: user.createdAt
});

const isUniqueConstraintError = (error: unknown): boolean =>
  typeof error === "object" &&
  error !== null &&
  "code" in error &&
  error.code === "P2002";

export class DuplicateEmailError extends Error {
  constructor() {
    super("An account with this email already exists");
    this.name = "DuplicateEmailError";
  }
}

export class InvalidCredentialsError extends Error {
  constructor() {
    super("Invalid email or password");
    this.name = "InvalidCredentialsError";
  }
}

export const register = async (input: {
  name: string;
  email: string;
  password: string;
}): Promise<PublicUser> => {
  const passwordHash = await bcrypt.hash(input.password, passwordRounds);

  try {
    const user = await createCustomer({
      name: input.name,
      email: input.email,
      passwordHash
    });
    return publicUser(user);
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      throw new DuplicateEmailError();
    }
    throw error;
  }
};

export const login = async (email: string, password: string) => {
  const user = await findUserByEmail(email);
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    throw new InvalidCredentialsError();
  }

  const token = jwt.sign(
    { userId: user.id, role: user.role },
    env.JWT_SECRET,
    {
      algorithm: "HS256",
      expiresIn: env.JWT_EXPIRES_IN_SECONDS
    }
  );

  return {
    token,
    user: publicUser(user)
  };
};
