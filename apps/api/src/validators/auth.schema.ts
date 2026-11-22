import { z } from "zod";

export const registerSchema = z.object({
  name: z.string().trim().min(1).max(100),
  email: z.string().trim().email().max(254).transform((email) => email.toLowerCase()),
  password: z.string().min(12).max(128)
    .refine((password) => Buffer.byteLength(password, "utf8") <= 72,
      "Password must not exceed 72 UTF-8 bytes")
});

export const loginSchema = z.object({
  email: z.string().trim().email().max(254).transform((email) => email.toLowerCase()),
  password: z.string().min(1).max(128)
    .refine((password) => Buffer.byteLength(password, "utf8") <= 72,
      "Password must not exceed 72 UTF-8 bytes")
});
