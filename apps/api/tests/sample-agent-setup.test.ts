import bcrypt from "bcryptjs";
import { describe, expect, it, vi } from "vitest";
import {
  configureSampleAgent,
  type SampleAgent,
  type SampleAgentStore,
  validateLoopbackDatabaseUrl,
  validateSampleAgentPassword
} from "../src/services/sample-agent-setup";

const password = "local-agent-password";
const agentId = "11111111-1111-4111-8111-111111111111";

const existingAgent = async (existingPassword = "another-local-password"): Promise<SampleAgent> => ({
  id: agentId,
  email: "day8.agent@supportdesk.test",
  role: "agent",
  passwordHash: await bcrypt.hash(existingPassword, 4)
});

const makeStore = (agent: SampleAgent | null): SampleAgentStore => ({
  findByEmail: vi.fn().mockResolvedValue(agent),
  create: vi.fn().mockResolvedValue(undefined)
});

describe("sample agent setup", () => {
  it("creates an absent agent with a bcrypt hash", async () => {
    const store = makeStore(null);

    const result = await configureSampleAgent(store, password);

    expect(result).toBe("created");
    const [data] = vi.mocked(store.create).mock.calls[0];
    expect(data.email).toBe("day8.agent@supportdesk.test");
    expect(data.passwordHash).not.toBe(password);
    expect(await bcrypt.compare(password, data.passwordHash)).toBe(true);
  });

  it("is a no-op when the existing bcrypt password matches", async () => {
    const store = makeStore(await existingAgent(password));

    const result = await configureSampleAgent(store, password);

    expect(result).toBe("unchanged");
    expect(store.create).not.toHaveBeenCalled();
  });

  it("fails safely when the existing password differs", async () => {
    const store = makeStore(await existingAgent());

    await expect(configureSampleAgent(store, password)).rejects.toThrow(
      /No password was changed/
    );

    expect(store.create).not.toHaveBeenCalled();
  });

  it("refuses to modify an account with the sample email that is not an agent", async () => {
    const store = makeStore({ ...(await existingAgent()), role: "customer" });

    await expect(configureSampleAgent(store, password)).rejects.toThrow(
      /different role/
    );
    expect(store.create).not.toHaveBeenCalled();
  });

  it("accepts only valid local seed passwords", () => {
    expect(validateSampleAgentPassword(password)).toBe(password);
    expect(() => validateSampleAgentPassword(undefined)).toThrow(/12 to 72/);
    expect(() => validateSampleAgentPassword("replace-with-a-real-password")).toThrow(
      /non-placeholder/
    );
    expect(() => validateSampleAgentPassword("a".repeat(73))).toThrow(/12 to 72/);
  });

  it("accepts only loopback PostgreSQL URLs", () => {
    const localUrl = "postgresql://test:test@localhost:5432/supportdesk";
    expect(validateLoopbackDatabaseUrl(localUrl)).toBe(localUrl);
    expect(() => validateLoopbackDatabaseUrl(undefined)).toThrow(/DATABASE_URL/);
    expect(() => validateLoopbackDatabaseUrl("postgresql://db.example:5432/supportdesk"))
      .toThrow(/loopback/);
    expect(validateLoopbackDatabaseUrl("postgresql://test:test@[::1]:5432/supportdesk"))
      .toContain("[::1]");
    expect(() => validateLoopbackDatabaseUrl("mysql://localhost:3306/supportdesk"))
      .toThrow(/loopback/);
  });
});
