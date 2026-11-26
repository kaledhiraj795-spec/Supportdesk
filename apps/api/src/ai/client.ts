import { GoogleGenAI } from "@google/genai";
import { env } from "../config/env";
import { AiFeatureError } from "./errors";

let client: GoogleGenAI | undefined;

export function getGeminiClient(): GoogleGenAI {
  if (!env.GEMINI_API_KEY) {
    throw new AiFeatureError("AI features are not configured.", 503);
  }
  const options = { httpOptions: { timeout: env.GEMINI_REQUEST_TIMEOUT_MS } };
  client ??= env.GEMINI_API_MODE === "vertex"
    ? new GoogleGenAI({ ...options, vertexai: true, apiKey: env.GEMINI_API_KEY })
    : new GoogleGenAI({ ...options, apiKey: env.GEMINI_API_KEY });
  return client;
}
