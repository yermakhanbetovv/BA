import { ArtifactType, UserRole } from '@prisma/client';
import type { Bot, Context } from 'grammy';

import type { ArtifactActionService } from '../ai/artifact-action.service';
import type { ArtifactGenerationService } from '../ai/artifact-generation.service';
import type { IntentDetectionService } from '../ai/intent-detection.service';
import type { ArtifactsService } from '../artifacts/artifacts.service';
import type { BotSessionsService } from '../bot-sessions/bot-sessions.service';
import type { ProjectContextsService } from '../project-contexts/project-contexts.service';
import type { SettingsService } from '../settings/settings.service';
import type { UsersService } from '../users/users.service';
import { BotService } from './bot.service';

interface BotServicePrivate {
  attachGlobalErrorHandler(bot: Pick<Bot, 'catch'>): void;
  registerHandlers(bot: Pick<Bot, 'command' | 'callbackQuery' | 'on'>): void;
  safeAnswerCallbackQuery(ctx: Context, text?: string): Promise<void>;
}

type CallbackHandler = (ctx: Context & { match: RegExpMatchArray }) => Promise<void>;

describe('BotService callback resilience', () => {
  const user = {
    id: 'user-id',
    telegramId: 123n,
    username: 'ba_user',
    firstName: 'BA',
    lastName: 'User',
    telegramLanguageCode: 'ru',
    role: UserRole.USER,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSeenAt: new Date(),
  };

  const projectContext = {
    id: 'context-id',
    key: 'personal',
    name: 'Personal',
    description: 'desc',
    context: 'context',
    isDefault: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const createService = () =>
    new BotService(
      { get: jest.fn() } as never,
      {
        upsertTelegramUser: jest.fn().mockResolvedValue(user),
      } as unknown as UsersService,
      {
        getOrCreateForUser: jest.fn(),
        updateLanguage: jest.fn(),
        updateTone: jest.fn(),
        updateDetailLevel: jest.fn(),
      } as unknown as SettingsService,
      {
        selectForUser: jest.fn().mockResolvedValue(projectContext),
      } as unknown as ProjectContextsService,
      {} as unknown as ArtifactsService,
      {} as unknown as BotSessionsService,
      {} as unknown as IntentDetectionService,
      {} as unknown as ArtifactGenerationService,
      {} as unknown as ArtifactActionService,
    );

  it('expired answerCallbackQuery does not throw', async () => {
    const service = createService() as unknown as BotServicePrivate;
    const ctx = {
      callbackQuery: { id: 'old-query-id' },
      answerCallbackQuery: jest
        .fn()
        .mockRejectedValue(
          new Error(
            "Call to 'answerCallbackQuery' failed! 400: Bad Request: query is too old and response timeout expired or query ID is invalid",
          ),
        ),
    } as unknown as Context;

    await expect(service.safeAnswerCallbackQuery(ctx)).resolves.toBeUndefined();
  });

  it('configures bot.catch without rethrowing', () => {
    const service = createService() as unknown as BotServicePrivate;
    const fakeBot = {
      catch: jest.fn(),
    } as unknown as Pick<Bot, 'catch'>;

    service.attachGlobalErrorHandler(fakeBot);

    expect(fakeBot.catch).toHaveBeenCalledTimes(1);
    const handler = jest.mocked(fakeBot.catch).mock.calls[0]?.[0];

    expect(() =>
      handler?.({
        error: new Error('telegram api failed'),
      } as never),
    ).not.toThrow();
  });

  it('callback handler continues when answerCallbackQuery fails', async () => {
    const service = createService() as unknown as BotServicePrivate;
    const callbacks: Array<{ trigger: RegExp; handler: CallbackHandler }> = [];
    const fakeBot = {
      command: jest.fn(),
      callbackQuery: jest.fn((trigger: RegExp, handler: CallbackHandler) => {
        callbacks.push({ trigger, handler });
      }),
      on: jest.fn(),
    } as unknown as Pick<Bot, 'command' | 'callbackQuery' | 'on'>;

    service.registerHandlers(fakeBot);
    const projectHandler = callbacks.find((callback) =>
      callback.trigger.test('project:set:personal'),
    )?.handler;
    const ctx = {
      callbackQuery: { id: 'old-query-id' },
      from: { id: 123, username: 'ba_user' },
      match: ['project:set:personal', 'personal'],
      answerCallbackQuery: jest
        .fn()
        .mockRejectedValue(new Error('query is too old')),
      editMessageText: jest.fn().mockResolvedValue(true),
      reply: jest.fn().mockResolvedValue(true),
    } as unknown as Context & { match: RegExpMatchArray };

    await expect(projectHandler?.(ctx)).resolves.toBeUndefined();
    expect(ctx.editMessageText).toHaveBeenCalledWith(
      'Контекст проекта изменён на: Personal',
      undefined,
    );
  });

  it('manual artifact type callback is still registered', () => {
    const service = createService() as unknown as BotServicePrivate;
    const callbacks: Array<{ trigger: RegExp; handler: CallbackHandler }> = [];
    const fakeBot = {
      command: jest.fn(),
      callbackQuery: jest.fn((trigger: RegExp, handler: CallbackHandler) => {
        callbacks.push({ trigger, handler });
      }),
      on: jest.fn(),
    } as unknown as Pick<Bot, 'command' | 'callbackQuery' | 'on'>;

    service.registerHandlers(fakeBot);

    expect(
      callbacks.some((callback) =>
        callback.trigger.test(`generate:type:${ArtifactType.BUG}`),
      ),
    ).toBe(true);
  });
});
