export class AiFeatureError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number
  ) {
    super(message);
    this.name = "AiFeatureError";
  }
}
