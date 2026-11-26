import { env } from "../config/env";

const CONTROL_CHARACTERS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;
const UNTRUSTED_BOUNDARY = /(<\/?(?:ticket|ticket_description|customer_message|recent_comments)>)/gi;
const PASSWORD_VALUE = /\b(?:password|passwd|pwd|passcode|passphrase)\b\s*(?:is|was|:|=)\s*(?:"[^"\r\n]*"|'[^'\r\n]*'|[^\s]+)/i;
const OTP_VALUE = /\b(?:otp(?:\s+code)?|one[- ]time (?:password|code)|verification (?:code|otp)|security code|authentication code|login code|[2m]fa code)\b\s*(?:(?:is|:|=)\s*)?\d{4,8}\b/i;
const GOOGLE_API_KEY = /\bAIza[0-9A-Za-z_-]{20,}\b/i;

export const maskSensitiveText = (text: string): string =>
  text
    .replace(CONTROL_CHARACTERS, " ")
    .replace(UNTRUSTED_BOUNDARY, "[blocked-boundary]")
    .replace(new RegExp(PASSWORD_VALUE.source, "gi"), "[credential]")
    .replace(new RegExp(OTP_VALUE.source, "gi"), "[verification-code]")
    .replace(new RegExp(GOOGLE_API_KEY.source, "gi"), "[credential]")
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, "[email]")
    .replace(/(?<!\d)(?:\d[ -]?){12,18}\d(?!\d)/g, "[payment-card]")
    .replace(/(?<!\d)(?:\+?\d{1,3}[-.\s]?)?(?:\(?\d{2,4}\)?[-.\s]?)\d{3,4}[-.\s]?\d{4}(?!\d)/g, "[phone]")
    .replace(/\b\d{3}-?\d{2}-?\d{4}\b/g, "[personal-id]")
    .replace(/\b(?:sk|pk|rk|api)[_-]?key[=: ]+[A-Za-z0-9._-]{12,}\b/gi, "[credential]")
    .replace(/\b(?:bearer\s+[A-Za-z0-9._~+/=-]{12,}|gh[pousr]_[A-Za-z0-9]{20,})\b/gi, "[credential]");

export const truncateText = (text: string, limit: number): string => {
  if (text.length <= limit) return text;
  return `${text.slice(0, Math.max(0, limit - 14)).trimEnd()} [truncated]`;
};

export const prepareUntrustedText = (
  text: string,
  limit: number
): string => truncateText(maskSensitiveText(text), limit);

export const escapePromptText = (text: string): string =>
  maskSensitiveText(text).replace(/```/g, "'''");

export const containsUnsafeSecrets = (text: string): boolean =>
  /(?:system prompt|developer (?:prompt|instructions)|api[_ -]?key|private key|bearer\s+[A-Za-z0-9._~+/=-]{12,}|AQ[A-Za-z0-9_-]{10,}|I have (?:refunded|reset|changed|deleted|cancelled|sent)|action (?:was )?completed)/i.test(text) ||
  PASSWORD_VALUE.test(text) ||
  OTP_VALUE.test(text) ||
  GOOGLE_API_KEY.test(text);

