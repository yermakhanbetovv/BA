import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { AiConfigurationError, AiServiceError } from './ai.errors';
import { AiMessage } from './ai.types';

interface GeminiGenerateContentResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
      }>;
    };
  }>;
  error?: {
    code?: number;
    message?: string;
    status?: string;
  };
}

@Injectable()
export class AiClientService {
  private readonly logger = new Logger(AiClientService.name);
  private readonly endpointBase =
    'https://generativelanguage.googleapis.com/v1beta/models';

  constructor(private readonly config: ConfigService) {}

  async generateText(messages: AiMessage[]): Promise<string> {
    const apiKey = this.config.get<string>('gemini.apiKey');

    if (!apiKey) {
      throw new AiConfigurationError();
    }

    const model = this.config.get<string>('gemini.model') ?? 'gemini-2.0-flash';
    const fallbackModel =
      this.config.get<string>('gemini.fallbackModel') ?? 'gemini-2.5-flash-lite';
    const prompt = this.messagesToPrompt(messages);

    try {
      return await this.generateWithModel(model, apiKey, prompt);
    } catch (error) {
      if (!this.shouldTryFallback(error, model, fallbackModel)) {
        throw error;
      }

      this.logger.warn(
        `Gemini model ${model} unavailable, retrying with fallback model ${fallbackModel}`,
      );
      return this.generateWithModel(fallbackModel, apiKey, prompt);
    }
  }

  private async generateWithModel(
    model: string,
    apiKey: string,
    prompt: string,
  ): Promise<string> {
    const response = await fetch(
      `${this.endpointBase}/${encodeURIComponent(model)}:generateContent`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey,
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: prompt }],
            },
          ],
        }),
      },
    );
    const payload = (await response.json().catch(() => ({}))) as
      | GeminiGenerateContentResponse
      | undefined;

    if (!response.ok) {
      this.handleGeminiError(response.status, payload);
    }

    const text = payload?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

    if (!text) {
      throw new AiServiceError('Gemini returned an empty response');
    }

    return text;
  }

  private handleGeminiError(
    httpStatus: number,
    payload?: GeminiGenerateContentResponse,
  ): never {
    const geminiStatus = payload?.error?.status;
    const message = payload?.error?.message;

    if (httpStatus === 401 || httpStatus === 403 || geminiStatus === 'PERMISSION_DENIED') {
      this.logger.error('Gemini API rejected the request. Check GEMINI_API_KEY.');
      throw new AiServiceError('Gemini API key is invalid or not allowed');
    }

    if (
      httpStatus === 503 ||
      httpStatus === 404 ||
      geminiStatus === 'UNAVAILABLE' ||
      geminiStatus === 'NOT_FOUND'
    ) {
      throw new AiServiceError('Gemini model is unavailable');
    }

    this.logger.error(
      `Gemini request failed with HTTP ${httpStatus}${geminiStatus ? ` / ${geminiStatus}` : ''}${message ? `: ${message}` : ''}`,
    );
    throw new AiServiceError('Gemini request failed');
  }

  private shouldTryFallback(
    error: unknown,
    model: string,
    fallbackModel: string,
  ): boolean {
    if (model === fallbackModel) {
      return false;
    }

    return (
      error instanceof AiServiceError &&
      error.message.toLowerCase().includes('unavailable')
    );
  }

  private messagesToPrompt(messages: AiMessage[]): string {
    return messages
      .map((message) => `${message.role.toUpperCase()}:\n${message.content}`)
      .join('\n\n');
  }
}
