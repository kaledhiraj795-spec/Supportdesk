import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, UserRole } from "../generated/prisma/client";
import {
  configureSampleAgent,
  validateLoopbackDatabaseUrl,
  validateSampleAgentPassword
} from "../src/services/sample-agent-setup";

async function main(): Promise<void> {
  if (process.argv.length > 2) {
    throw new Error("This command does not accept additional options.");
  }

  const password = validateSampleAgentPassword(
    process.env.SUPPORTDESK_SEED_AGENT_PASSWORD
  );
  const connectionString = validateLoopbackDatabaseUrl(process.env.DATABASE_URL);
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString })
  });

  try {
    const result = await configureSampleAgent(
      {
        findByEmail: async (email) => {
          const user = await prisma.user.findUnique({ where: { email } });
          return user
            ? {
                id: user.id,
                email: user.email,
                role: user.role,
                passwordHash: user.passwordHash
              }
            : null;
        },
        create: async (data) => {
          await prisma.user.create({
            data: { ...data, role: UserRole.agent }
          });
        },
      },
      password
    );

    if (result === "created") {
      console.log("Created the sample agent with a bcrypt password hash.");
    } else {
      console.log("The sample agent already uses the configured password; no changes made.");
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(
    "Sample agent setup failed:",
    error instanceof Error ? error.message : "Unexpected setup error."
  );
  process.exitCode = 1;
});
