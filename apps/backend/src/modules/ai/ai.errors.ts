export class AiConfigurationError extends Error {
  constructor() {
    super('AI generation is unavailable: GEMINI_API_KEY is not configured');
    this.name = 'AiConfigurationError';
  }
}

export class AiServiceError extends Error {
  constructor(message = 'AI service request failed') {
    super(message);
    this.name = 'AiServiceError';
  }
}
