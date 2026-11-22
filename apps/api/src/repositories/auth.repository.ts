import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../generated/prisma/client";
import { env } from "../config/env";

const adapter = new PrismaPg({
  connectionString: env.DATABASE_URL
});

const prisma = new PrismaClient({ adapter });

export const findUserByEmail = (email: string) => {
  return prisma.user.findUnique({ where: { email } });
};

export const createCustomer = (data: {
  name: string;
  email: string;
  passwordHash: string;
}) => {
  return prisma.user.create({
    data: {
      ...data,
      role: "customer"
    }
  });
};
