import {
  Injectable,
  Logger,
  NotFoundException,
  OnApplicationShutdown,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  Artifact,
  ArtifactType,
  BotSessionMode,
  DetailLevel,
  Language,
  ProjectContext,
  Tone,
  User,
  UserSettings,
} from '@prisma/client';
import { Bot, Context, InlineKeyboard } from 'grammy';

import { AiConfigurationError } from '../ai/ai.errors';
import { ArtifactActionService } from '../ai/artifact-action.service';
import { ArtifactGenerationService } from '../ai/artifact-generation.service';
import { IntentDetectionService } from '../ai/intent-detection.service';
import { ArtifactsService } from '../artifacts/artifacts.service';
import { BotSessionsService } from '../bot-sessions/bot-sessions.service';
import { ProjectContextsService } from '../project-contexts/project-contexts.service';
import { SettingsService } from '../settings/settings.service';
import { UsersService } from '../users/users.service';
import { sendLongMessage } from './utils/telegram-message.util';

type SettingsWithProjectContext = UserSettings & {
  defaultProjectContext: ProjectContext | null;
};

type ArtifactWithProjectContext = Artifact & {
  projectContext: ProjectContext;
};

interface TextMessageOptions {
  reply_markup?: InlineKeyboard;
}

interface TelegramUserProfile {
  id: number;
  username?: string;
  first_name?: string;
  last_name?: string;
  language_code?: string;
}

const MODE_TO_ARTIFACT_TYPE: Partial<Record<BotSessionMode, ArtifactType>> = {
  [BotSessionMode.WAITING_BUG]: ArtifactType.BUG,
  [BotSessionMode.WAITING_STORY]: ArtifactType.USER_STORY,
  [BotSessionMode.WAITING_TASK]: ArtifactType.TASK,
  [BotSessionMode.WAITING_SPLIT]: ArtifactType.FRONT_BACK_SPLIT,
  [BotSessionMode.WAITING_DAILY]: ArtifactType.DAILY,
  [BotSessionMode.WAITING_COMMENT]: ArtifactType.JIRA_COMMENT,
  [BotSessionMode.WAITING_QUESTIONS]: ArtifactType.QUESTIONS,
  [BotSessionMode.WAITING_CHECKLIST]: ArtifactType.CHECKLIST,
  [BotSessionMode.WAITING_REVIEW]: ArtifactType.REQUIREMENTS_REVIEW,
  [BotSessionMode.WAITING_GOST]: ArtifactType.GOST34,
};

const COMMAND_MODES: Array<{
  command: string;
  mode: BotSessionMode;
  prompt: string;
  description: string;
}> = [
  {
    command: 'bug',
    mode: BotSessionMode.WAITING_BUG,
    prompt: 'Опиши баг одним сообщением. Я оформлю Bug Report.',
    description: 'Bug Report',
  },
  {
    command: 'story',
    mode: BotSessionMode.WAITING_STORY,
    prompt: 'Опиши потребность или фичу. Я оформлю User Story.',
    description: 'User Story',
  },
  {
    command: 'task',
    mode: BotSessionMode.WAITING_TASK,
    prompt: 'Опиши задачу. Я оформлю Task.',
    description: 'Task',
  },
  {
    command: 'split',
    mode: BotSessionMode.WAITING_SPLIT,
    prompt: 'Отправь задачу. Я разделю ее на Frontend и Backend.',
    description: 'Front/Back split',
  },
  {
    command: 'daily',
    mode: BotSessionMode.WAITING_DAILY,
    prompt: 'Отправь черновик дейли. Я сделаю рабочий daily update.',
    description: 'Daily Update',
  },
  {
    command: 'comment',
    mode: BotSessionMode.WAITING_COMMENT,
    prompt: 'Отправь мысль для комментария. Я оформлю Jira Comment.',
    description: 'Jira Comment',
  },
  {
    command: 'questions',
    mode: BotSessionMode.WAITING_QUESTIONS,
    prompt: 'Отправь описание задачи. Я подготовлю вопросы на уточнение.',
    description: 'Clarification Questions',
  },
  {
    command: 'checklist',
    mode: BotSessionMode.WAITING_CHECKLIST,
    prompt: 'Отправь задачу. Я сделаю чек-лист тестирования.',
    description: 'Testing Checklist',
  },
  {
    command: 'review',
    mode: BotSessionMode.WAITING_REVIEW,
    prompt: 'Отправь описание требований. Я проверю качество.',
    description: 'Requirements Review',
  },
  {
    command: 'gost',
    mode: BotSessionMode.WAITING_GOST,
    prompt: 'Отправь мысль или раздел. Я оформлю фрагмент ТЗ по ГОСТ 34.',
    description: 'GOST 34',
  },
];

@Injectable()
export class BotService implements OnModuleInit, OnApplicationShutdown {
  private readonly logger = new Logger(BotService.name);
  private bot?: Bot;

  constructor(
    private readonly config: ConfigService,
    private readonly usersService: UsersService,
    private readonly settingsService: SettingsService,
    private readonly projectContextsService: ProjectContextsService,
    private readonly artifactsService: ArtifactsService,
    private readonly botSessionsService: BotSessionsService,
    private readonly intentDetectionService: IntentDetectionService,
    private readonly artifactGenerationService: ArtifactGenerationService,
    private readonly artifactActionService: ArtifactActionService,
  ) {}

  async onModuleInit(): Promise<void> {
    const enabled = this.config.get<boolean>('telegram.enabled') ?? false;
    const token = this.config.get<string>('telegram.token');

    if (!enabled) {
      this.logger.log('Telegram bot is disabled');
      return;
    }

    if (!token) {
      this.logger.warn('Telegram bot is enabled but token is not configured');
      return;
    }

    this.bot = new Bot(token);
    this.registerHandlers(this.bot);
    this.attachGlobalErrorHandler(this.bot);

    await this.bot.api.setMyCommands([
      { command: 'start', description: 'Запустить бота' },
      { command: 'help', description: 'Показать справку' },
      { command: 'bug', description: 'Создать Bug Report' },
      { command: 'story', description: 'Создать User Story' },
      { command: 'task', description: 'Создать Task' },
      { command: 'split', description: 'Разделить Front/Back' },
      { command: 'daily', description: 'Создать Daily Update' },
      { command: 'comment', description: 'Создать Jira Comment' },
      { command: 'questions', description: 'Вопросы на уточнение' },
      { command: 'checklist', description: 'Чек-лист тестирования' },
      { command: 'review', description: 'Review требований' },
      { command: 'gost', description: 'ТЗ по ГОСТ 34' },
      { command: 'project', description: 'Выбрать проектный контекст' },
      { command: 'settings', description: 'Показать настройки' },
      { command: 'history', description: 'Показать историю' },
    ]);

    void this.bot.start().catch((error: unknown) => {
      this.logger.error(
        'Telegram bot polling failed',
        error instanceof Error ? error.stack : undefined,
      );
    });
    this.logger.log('Telegram bot started');
  }

  async onApplicationShutdown(): Promise<void> {
    await this.bot?.stop();
  }

  private registerHandlers(bot: Bot): void {
    bot.command('start', async (ctx) => this.handleStart(ctx));
    bot.command('help', async (ctx) => this.handleHelp(ctx));
    bot.command('project', async (ctx) => this.handleProject(ctx));
    bot.command('settings', async (ctx) => this.handleSettings(ctx));
    bot.command('history', async (ctx) => this.handleHistory(ctx));

    for (const commandMode of COMMAND_MODES) {
      bot.command(commandMode.command, async (ctx) => {
        const user = await this.resolveUser(ctx);

        if (!user) {
          return;
        }

        const settings = await this.settingsService.getOrCreateForUser(user.id);
        const payload = this.getCommandPayload(ctx, commandMode.command);

        if (payload) {
          await this.botSessionsService.setLastInputText(user.id, payload);
          await this.generateAndSend(
            ctx,
            user,
            payload,
            MODE_TO_ARTIFACT_TYPE[commandMode.mode] ?? ArtifactType.UNKNOWN,
            settings,
            await this.resolveProjectContext(settings),
          );
          return;
        }

        await this.botSessionsService.setMode(user.id, commandMode.mode);
        this.logger.log(`User ${user.id} selected /${commandMode.command}`);
        await ctx.reply(commandMode.prompt);
      });
    }

    bot.callbackQuery(/^project:set:([a-z0-9_-]+)$/, async (ctx) => {
      await this.safeAnswerCallbackQuery(ctx);
      await this.handleProjectSelection(ctx, ctx.match[1]);
    });

    bot.callbackQuery(/^settings:language:(RU|EN)$/, async (ctx) => {
      await this.safeAnswerCallbackQuery(ctx, 'Язык сохранён.');
      await this.handleLanguageSelection(ctx, ctx.match[1] as Language);
    });

    bot.callbackQuery(
      /^settings:tone:(SIMPLE|FORMAL|JIRA_READY|GOST_FORMAL)$/,
      async (ctx) => {
        await this.safeAnswerCallbackQuery(ctx, 'Тон сохранён.');
        await this.handleToneSelection(ctx, ctx.match[1] as Tone);
      },
    );

    bot.callbackQuery(
      /^settings:detail:(SHORT|MEDIUM|DETAILED)$/,
      async (ctx) => {
        await this.safeAnswerCallbackQuery(ctx, 'Детализация сохранена.');
        await this.handleDetailSelection(ctx, ctx.match[1] as DetailLevel);
      },
    );

    bot.callbackQuery(/^generate:type:([A-Z_0-9]+)$/, async (ctx) => {
      await this.safeAnswerCallbackQuery(ctx, 'Генерирую результат...');
      await this.handleManualTypeSelection(ctx, ctx.match[1] as ArtifactType);
    });

    bot.callbackQuery(/^artifact:action:([a-zA-Z]+)$/, async (ctx) => {
      await this.safeAnswerCallbackQuery(
        ctx,
        ctx.match[1] === 'history' ? undefined : 'Готовлю результат...',
      );
      await this.handleArtifactAction(ctx, ctx.match[1]);
    });

    bot.callbackQuery(/^history:open:([0-9a-f-]+)$/, async (ctx) => {
      await this.safeAnswerCallbackQuery(ctx);
      await this.handleOpenHistory(ctx, ctx.match[1]);
    });

    bot.on('message:text', async (ctx) => {
      const text = ctx.message.text.trim();

      if (text.startsWith('/')) {
        await ctx.reply('Не понял команду. Используй /help или отправь текст задачи.');
        return;
      }

      await this.handleFreeText(ctx, text);
    });
  }

  private async handleStart(ctx: Context): Promise<void> {
    const user = await this.resolveUser(ctx);

    if (!user) {
      return;
    }

    await this.settingsService.getOrCreateForUser(user.id);
    await this.botSessionsService.getOrCreateForUser(user.id);

    await ctx.reply(
      [
        'BA Copilot Bot запущен.',
        '',
        'Я помогу быстро оформить рабочие материалы для Jira, требований, дейли и документации.',
        '',
        'Основные команды:',
        '/bug - Bug Report',
        '/story - User Story',
        '/task - Task',
        '/split - Front/Back',
        '/daily - Daily Update',
        '/comment - Jira Comment',
        '/questions - вопросы на уточнение',
        '/checklist - чек-лист',
        '/review - review требований',
        '/gost - фрагмент ТЗ по ГОСТ 34',
        '/project - проектный контекст',
        '/settings - настройки',
        '/history - история',
      ].join('\n'),
    );
  }

  private async handleHelp(ctx: Context): Promise<void> {
    await ctx.reply(
      [
        'Команды:',
        '/bug - оформить Bug Report',
        '/story - оформить User Story',
        '/task - оформить Task',
        '/split - разделить задачу на Frontend / Backend',
        '/daily - сделать daily update',
        '/comment - подготовить комментарий для Jira',
        '/questions - вопросы на уточнение',
        '/checklist - чек-лист тестирования',
        '/review - review качества требований',
        '/gost - текст для ТЗ по ГОСТ 34',
        '/project - выбрать контекст',
        '/settings - настройки',
        '/history - последние результаты',
        '',
        'Можно отправить текст без команды. Я попробую определить формат автоматически.',
        '',
        'Примеры:',
        '/bug в админке документы пустые, фк не видит имя файла',
        '/story нужно отображать код продукта для всех банков',
        '/daily завел 2 бага, жду фидбек, параллельно тз',
        '/split переименовать код в ID в системе и добавить код продукта',
      ].join('\n'),
    );
  }

  private async handleProject(ctx: Context): Promise<void> {
    const user = await this.resolveUser(ctx);

    if (!user) {
      return;
    }

    await this.settingsService.getOrCreateForUser(user.id);
    await ctx.reply('Выберите проектный контекст:', {
      reply_markup: await this.buildProjectKeyboard(),
    });
  }

  private async handleSettings(ctx: Context): Promise<void> {
    const user = await this.resolveUser(ctx);

    if (!user) {
      return;
    }

    const settings = await this.settingsService.getOrCreateForUser(user.id);

    await ctx.reply(this.formatSettings(settings), {
      reply_markup: this.buildSettingsKeyboard(),
    });
  }

  private async handleHistory(ctx: Context): Promise<void> {
    const user = await this.resolveUser(ctx);

    if (!user) {
      return;
    }

    await this.sendHistory(ctx, user.id);
  }

  private async handleFreeText(ctx: Context, text: string): Promise<void> {
    const user = await this.resolveUser(ctx);

    if (!user) {
      return;
    }

    const settings = await this.settingsService.getOrCreateForUser(user.id);
    const session = await this.botSessionsService.getOrCreateForUser(user.id);
    const projectContext = await this.resolveProjectContext(settings);
    const modeType = MODE_TO_ARTIFACT_TYPE[session.mode];

    await this.botSessionsService.setLastInputText(user.id, text);

    if (modeType) {
      await this.botSessionsService.resetMode(user.id);
      await this.generateAndSend(ctx, user, text, modeType, settings, projectContext);
      return;
    }

    const intent = await this.intentDetectionService.detectIntent({
      inputText: text,
      userSettings: settings,
      projectContext,
    });
    this.logger.log(
      `Intent for user ${user.id}: ${intent.intent} (${intent.confidence})`,
    );

    if (intent.intent !== ArtifactType.UNKNOWN && intent.confidence >= 0.7) {
      await this.generateAndSend(
        ctx,
        user,
        text,
        intent.intent,
        settings,
        projectContext,
      );
      return;
    }

    await ctx.reply('Не уверен, как оформить текст. Выберите формат:', {
      reply_markup: this.buildManualTypeKeyboard(),
    });
  }

  private async handleProjectSelection(
    ctx: Context,
    key: string,
  ): Promise<void> {
    const user = await this.resolveUser(ctx);

    if (!user) {
      return;
    }

    const projectContext = await this.projectContextsService.selectForUser(
      user.id,
      key,
    );

    await this.safeEditMessageText(
      ctx,
      `Контекст проекта изменён на: ${projectContext.name}`,
    );
  }

  private async handleLanguageSelection(
    ctx: Context,
    language: Language,
  ): Promise<void> {
    const user = await this.resolveUser(ctx);

    if (!user) {
      return;
    }

    const settings = await this.settingsService.updateLanguage(user.id, language);

    await this.safeEditMessageText(ctx, this.formatSettings(settings), {
      reply_markup: this.buildSettingsKeyboard(),
    });
  }

  private async handleToneSelection(ctx: Context, tone: Tone): Promise<void> {
    const user = await this.resolveUser(ctx);

    if (!user) {
      return;
    }

    const settings = await this.settingsService.updateTone(user.id, tone);

    await this.safeEditMessageText(ctx, this.formatSettings(settings), {
      reply_markup: this.buildSettingsKeyboard(),
    });
  }

  private async handleDetailSelection(
    ctx: Context,
    detailLevel: DetailLevel,
  ): Promise<void> {
    const user = await this.resolveUser(ctx);

    if (!user) {
      return;
    }

    const settings = await this.settingsService.updateDetailLevel(
      user.id,
      detailLevel,
    );

    await this.safeEditMessageText(ctx, this.formatSettings(settings), {
      reply_markup: this.buildSettingsKeyboard(),
    });
  }

  private async handleManualTypeSelection(
    ctx: Context,
    artifactType: ArtifactType,
  ): Promise<void> {
    const user = await this.resolveUser(ctx);

    if (!user) {
      return;
    }

    const session = await this.botSessionsService.getOrCreateForUser(user.id);

    if (!session.lastInputText) {
      await ctx.reply('Не найден исходный текст. Отправь задачу ещё раз.');
      return;
    }

    const settings = await this.settingsService.getOrCreateForUser(user.id);
    const projectContext = await this.resolveProjectContext(settings);

    await this.generateAndSend(
      ctx,
      user,
      session.lastInputText,
      artifactType,
      settings,
      projectContext,
    );
  }

  private async handleArtifactAction(
    ctx: Context,
    action: string,
  ): Promise<void> {
    const user = await this.resolveUser(ctx);

    if (!user) {
      return;
    }

    if (action === 'history') {
      await this.sendHistory(ctx, user.id);
      return;
    }

    const settings = await this.settingsService.getOrCreateForUser(user.id);

    try {
      const artifactId = await this.botSessionsService.getLastArtifactId(user.id);
      const result = await this.artifactActionService.runAction({
        artifactId,
        userSettings: settings,
        action: this.normalizeAction(action),
      });

      await this.botSessionsService.setLastArtifact(user.id, result.artifact.id);
      await sendLongMessage(
        ctx,
        result.outputText,
        this.buildAfterGenerationKeyboard(),
      );
    } catch (error) {
      if (error instanceof NotFoundException) {
        await ctx.reply('Нет последнего результата для обработки.');
        return;
      }

      await this.handleGenerationError(ctx, error);
    }
  }

  private async handleOpenHistory(ctx: Context, artifactId: string): Promise<void> {
    try {
      const artifact = await this.artifactsService.getArtifactById(artifactId);

      await sendLongMessage(ctx, artifact.outputText);
    } catch {
      await ctx.reply('Артефакт не найден.');
    }
  }

  private async generateAndSend(
    ctx: Context,
    user: User,
    inputText: string,
    artifactType: ArtifactType,
    settings: SettingsWithProjectContext,
    projectContext: ProjectContext,
  ): Promise<void> {
    try {
      const result = await this.artifactGenerationService.generateArtifact({
        userId: user.id,
        inputText,
        artifactType,
        userSettings: settings,
        projectContext,
      });

      await this.botSessionsService.setLastArtifact(user.id, result.artifact.id);
      await sendLongMessage(
        ctx,
        result.outputText,
        this.buildAfterGenerationKeyboard(),
      );
    } catch (error) {
      await this.handleGenerationError(ctx, error);
    }
  }

  private async handleGenerationError(
    ctx: Context,
    error: unknown,
  ): Promise<void> {
    if (error instanceof AiConfigurationError) {
      await ctx.reply('AI-генерация недоступна: не настроен GEMINI_API_KEY.');
      return;
    }

    this.logger.error(
      'Telegram generation flow failed',
      error instanceof Error ? error.stack : undefined,
    );
    await ctx.reply(
      'Не удалось сгенерировать ответ из-за ошибки AI-сервиса. Попробуй ещё раз.',
    );
  }

  private async sendHistory(ctx: Context, userId: string): Promise<void> {
    const artifacts = await this.artifactsService.getLastArtifactsByUser(userId, 10);

    if (artifacts.length === 0) {
      await ctx.reply('История пока пустая.');
      return;
    }

    await ctx.reply(this.formatHistory(artifacts), {
      reply_markup: this.buildHistoryKeyboard(artifacts),
    });
  }

  private async resolveUser(ctx: Context): Promise<User | undefined> {
    if (!ctx.from) {
      await ctx.reply('Не удалось определить пользователя Telegram.');
      return undefined;
    }

    return this.upsertTelegramUser(ctx.from);
  }

  private upsertTelegramUser(from: TelegramUserProfile): Promise<User> {
    return this.usersService.upsertTelegramUser({
      telegramId: from.id.toString(),
      username: from.username,
      firstName: from.first_name,
      lastName: from.last_name,
      languageCode: from.language_code,
    });
  }

  private async resolveProjectContext(
    settings: SettingsWithProjectContext,
  ): Promise<ProjectContext> {
    if (settings.defaultProjectContext) {
      return settings.defaultProjectContext;
    }

    return this.projectContextsService.getDefaultContext();
  }

  private async buildProjectKeyboard(): Promise<InlineKeyboard> {
    const projectContexts = await this.projectContextsService.findAll();
    const keyboard = new InlineKeyboard();

    for (const projectContext of projectContexts) {
      keyboard
        .text(projectContext.name, `project:set:${projectContext.key}`)
        .row();
    }

    return keyboard;
  }

  private buildSettingsKeyboard(): InlineKeyboard {
    return new InlineKeyboard()
      .text('RU', 'settings:language:RU')
      .text('EN', 'settings:language:EN')
      .row()
      .text('Простой', 'settings:tone:SIMPLE')
      .text('Формальный', 'settings:tone:FORMAL')
      .row()
      .text('Jira-ready', 'settings:tone:JIRA_READY')
      .text('ГОСТ', 'settings:tone:GOST_FORMAL')
      .row()
      .text('Коротко', 'settings:detail:SHORT')
      .text('Средне', 'settings:detail:MEDIUM')
      .text('Подробно', 'settings:detail:DETAILED');
  }

  private buildManualTypeKeyboard(): InlineKeyboard {
    return new InlineKeyboard()
      .text('Оформить как Bug', `generate:type:${ArtifactType.BUG}`)
      .row()
      .text('Оформить как User Story', `generate:type:${ArtifactType.USER_STORY}`)
      .row()
      .text('Оформить как Task', `generate:type:${ArtifactType.TASK}`)
      .row()
      .text('Разделить Front/Back', `generate:type:${ArtifactType.FRONT_BACK_SPLIT}`)
      .row()
      .text('Daily', `generate:type:${ArtifactType.DAILY}`)
      .text('Jira Comment', `generate:type:${ArtifactType.JIRA_COMMENT}`)
      .row()
      .text('Вопросы', `generate:type:${ArtifactType.QUESTIONS}`)
      .text('Чек-лист', `generate:type:${ArtifactType.CHECKLIST}`)
      .row()
      .text('Review', `generate:type:${ArtifactType.REQUIREMENTS_REVIEW}`)
      .text('ГОСТ 34', `generate:type:${ArtifactType.GOST34}`);
  }

  private buildAfterGenerationKeyboard(): InlineKeyboard {
    return new InlineKeyboard()
      .text('Сократить', 'artifact:action:shorten')
      .text('Сделать формальнее', 'artifact:action:formalize')
      .row()
      .text('Сделать проще', 'artifact:action:simplify')
      .text('Добавить AC', 'artifact:action:addAcceptanceCriteria')
      .row()
      .text('Сделать чек-лист', 'artifact:action:generateChecklist')
      .row()
      .text('Разделить Front/Back', 'artifact:action:splitFrontBack')
      .row()
      .text('Перегенерировать', 'artifact:action:regenerate')
      .text('История', 'artifact:action:history');
  }

  private buildHistoryKeyboard(
    artifacts: ArtifactWithProjectContext[],
  ): InlineKeyboard {
    const keyboard = new InlineKeyboard();

    for (const [index, artifact] of artifacts.entries()) {
      keyboard.text(`Открыть ${index + 1}`, `history:open:${artifact.id}`);

      if ((index + 1) % 2 === 0) {
        keyboard.row();
      }
    }

    return keyboard;
  }

  private formatSettings(settings: SettingsWithProjectContext): string {
    return [
      'Настройки:',
      '',
      `Язык: ${settings.language}`,
      `Тон: ${settings.tone}`,
      `Детализация: ${settings.detailLevel}`,
      `Проект: ${settings.defaultProjectContext?.name ?? 'не выбран'}`,
    ].join('\n');
  }

  private formatHistory(artifacts: ArtifactWithProjectContext[]): string {
    return artifacts
      .map((artifact, index) =>
        [
          `${index + 1}. ${artifact.type} — ${this.formatDate(artifact.createdAt)}`,
          `   ${this.getShortText(artifact.outputText)}`,
        ].join('\n'),
      )
      .join('\n\n');
  }

  private formatDate(date: Date): string {
    const parts = new Intl.DateTimeFormat('en-CA', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      hourCycle: 'h23',
      timeZone: 'Asia/Almaty',
    }).formatToParts(date);
    const getPart = (type: string) =>
      parts.find((part) => part.type === type)?.value ?? '00';

    return `${getPart('year')}-${getPart('month')}-${getPart('day')} ${getPart('hour')}:${getPart('minute')}`;
  }

  private getShortText(text: string): string {
    const normalized = text.replace(/\s+/g, ' ').trim();

    if (normalized.length <= 100) {
      return normalized;
    }

    return `${normalized.slice(0, 97)}...`;
  }

  private normalizeAction(action: string) {
    const allowedActions = [
      'shorten',
      'formalize',
      'simplify',
      'addAcceptanceCriteria',
      'generateChecklist',
      'splitFrontBack',
      'regenerate',
    ] as const;
    const normalized = allowedActions.find((allowed) => allowed === action);

    if (!normalized) {
      return 'regenerate';
    }

    return normalized;
  }

  private getCommandPayload(ctx: Context, command: string): string | undefined {
    const text = ctx.message?.text;

    if (!text) {
      return undefined;
    }

    const pattern = new RegExp(`^/${command}(?:@\\w+)?\\s+`, 'i');
    const payload = text.replace(pattern, '').trim();

    return payload === text ? undefined : payload;
  }

  private attachGlobalErrorHandler(bot: Bot): void {
    bot.catch((err) => {
      this.logger.error('Telegram bot error', this.toLogMessage(err.error));
    });
  }

  private async safeAnswerCallbackQuery(
    ctx: Context,
    text?: string,
  ): Promise<void> {
    if (!ctx.callbackQuery) {
      return;
    }

    try {
      await ctx.answerCallbackQuery(text ? { text } : undefined);
    } catch (error) {
      const message = this.toLogMessage(error);

      if (
        message.includes('query is too old') ||
        message.includes('response timeout expired') ||
        message.includes('query ID is invalid')
      ) {
        this.logger.warn('Ignored expired callback query');
        return;
      }

      this.logger.warn(`Failed to answer callback query: ${message}`);
    }
  }

  private async safeEditMessageText(
    ctx: Context,
    text: string,
    options?: TextMessageOptions,
  ): Promise<void> {
    try {
      await ctx.editMessageText(text, options);
    } catch (error) {
      this.logger.warn(`Failed to edit message: ${this.toLogMessage(error)}`);
      await ctx.reply(text, options).catch((replyError: unknown) => {
        this.logger.warn(
          `Failed to reply fallback: ${this.toLogMessage(replyError)}`,
        );
      });
    }
  }

  private toLogMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }

    return String(error);
  }
}
