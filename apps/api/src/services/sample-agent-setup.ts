import bcrypt from "bcryptjs";

export type SampleAgent = {
  id: string;
  email: string;
  role: string;
  passwordHash: string;
};

export type SampleAgentStore = {
  findByEmail(email: string): Promise<SampleAgent | null>;
  create(data: {
    name: string;
    email: string;
    passwordHash: string;
  }): Promise<void>;
};

export type SampleAgentSetupResult = "created" | "unchanged";

const sampleAgentEmail = "day8.agent@supportdesk.test";

export function validateSampleAgentPassword(password: string | undefined): string {
  if (
    !password ||
    password.length < 12 ||
    Buffer.byteLength(password, "utf8") > 72 ||
    /^(replace|placeholder|change-me)/i.test(password)
  ) {
    throw new Error(
      "SUPPORTDESK_SEED_AGENT_PASSWORD must be a non-placeholder password of 12 to 72 UTF-8 bytes."
    );
  }
  return password;
}

export function validateLoopbackDatabaseUrl(connectionString: string | undefined): string {
  if (!connectionString) {
    throw new Error("DATABASE_URL is not configured.");
  }

  let url: URL;
  try {
    url = new URL(connectionString);
  } catch {
    throw new Error("DATABASE_URL must be a valid PostgreSQL URL.");
  }

  if (
    !["postgres:", "postgresql:"].includes(url.protocol) ||
    !["localhost", "127.0.0.1", "::1", "[::1]"].includes(url.hostname)
  ) {
    throw new Error("Sample agent setup is restricted to loopback PostgreSQL databases.");
  }
  return connectionString;
}

export async function configureSampleAgent(
  store: SampleAgentStore,
  password: string
): Promise<SampleAgentSetupResult> {
  const existing = await store.findByEmail(sampleAgentEmail);

  if (existing) {
    if (existing.role !== "agent") {
      throw new Error("The sample agent email is already assigned a different role.");
    }

    if (await bcrypt.compare(password, existing.passwordHash)) {
      return "unchanged";
    }

    throw new Error(
      "The sample agent already exists with a different password. No password was changed."
    );
  }

  await store.create({
    name: "Sample Support Agent",
    email: sampleAgentEmail,
    passwordHash: await bcrypt.hash(password, 12)
  });
  return "created";
}
