export type AiProviderErrorDetails = {
  upstreamStatusCode?: number;
  upstreamReason?: string;
};

const knownReasons = new Set([
  "API_KEY_INVALID",
  "SERVICE_DISABLED",
  "NOT_FOUND",
  "RESOURCE_EXHAUSTED",
  "INVALID_ARGUMENT",
  "PERMISSION_DENIED",
  "UNAUTHENTICATED",
  "FAILED_PRECONDITION",
  "INTERNAL",
  "UNAVAILABLE",
  "DEADLINE_EXCEEDED",
  "UNKNOWN"
]);

const recordOf = (value: unknown): Record<string, unknown> | undefined =>
  typeof value === "object" && value !== null
    ? value as Record<string, unknown>
    : undefined;

const getStatusCode = (value: unknown): number | undefined => {
  if (typeof value === "number" && Number.isInteger(value) && value >= 100 && value <= 599) {
    return value;
  }
  if (typeof value === "string" && /^\d{3}$/.test(value)) {
    return Number(value);
  }
  return undefined;
};

const getReason = (value: unknown): string | undefined =>
  typeof value === "string" && knownReasons.has(value) ? value : undefined;

const parseProviderErrorMessage = (message: string): unknown => {
  if (message.length > 16_384) return undefined;
  const jsonStart = message.indexOf("{");
  if (jsonStart < 0) return undefined;
  try {
    return JSON.parse(message.slice(jsonStart));
  } catch {
    return undefined;
  }
};

export function getAiProviderErrorDetails(error: unknown): AiProviderErrorDetails {
  const pending: unknown[] = [error];
  const visited = new Set<object>();
  let upstreamStatusCode: number | undefined;
  let upstreamReason: string | undefined;
  let upstreamStatusReason: string | undefined;

  let processed = 0;
  while (pending.length > 0 && processed < 50) {
    const record = recordOf(pending.shift());
    if (!record || visited.has(record)) continue;
    visited.add(record);
    processed += 1;

    upstreamStatusCode ??=
      getStatusCode(record.status) ??
      getStatusCode(record.statusCode) ??
      getStatusCode(record.code);
    upstreamReason ??= getReason(record.reason);
    upstreamStatusReason ??=
      getReason(record.status) ??
      getReason(record.code);

    if (typeof record.message === "string") {
      const parsedMessage = parseProviderErrorMessage(record.message);
      if (parsedMessage !== undefined) pending.push(parsedMessage);
    }

    for (const key of ["error", "response", "data", "errorDetails", "details"]) {
      const child = record[key];
      if (Array.isArray(child)) {
        pending.push(...child.slice(0, 10));
      } else if (child !== undefined) {
        pending.push(child);
      }
    }
  }

  return {
    ...(upstreamStatusCode === undefined ? {} : { upstreamStatusCode }),
    ...((upstreamReason ?? upstreamStatusReason) === undefined
      ? {}
      : { upstreamReason: upstreamReason ?? upstreamStatusReason })
  };
}
