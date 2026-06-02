import { Injectable, Logger } from '@nestjs/common';
import { ArtifactType, ProjectContext } from '@prisma/client';

import { AiClientService } from './ai-client.service';
import { AiConfigurationError } from './ai.errors';
import { IntentDetectionResult, SettingsWithProjectContext } from './ai.types';
import { INTENT_PROMPT } from './prompts/intent.prompt';

const SUPPORTED_INTENTS = new Set<string>(Object.values(ArtifactType));

@Injectable()
export class IntentDetectionService {
  private readonly logger = new Logger(IntentDetectionService.name);

  constructor(private readonly aiClient: AiClientService) {}

  async detectIntent(input: {
    inputText: string;
    userSettings: SettingsWithProjectContext;
    projectContext: ProjectContext;
  }): Promise<IntentDetectionResult> {
    const heuristic = this.detectWithHeuristics(input.inputText);

    try {
      const response = await this.aiClient.generateText([
        { role: 'system', content: INTENT_PROMPT },
        {
          role: 'user',
          content: [
            `Project context: ${input.projectContext.context}`,
            `Language: ${input.userSettings.language}`,
            `Text: ${input.inputText}`,
          ].join('\n'),
        },
      ]);
      const parsed = this.safeParseIntent(response);

      if (parsed.intent === ArtifactType.UNKNOWN && heuristic.confidence > 0) {
        return heuristic;
      }

      return parsed.confidence >= heuristic.confidence ? parsed : heuristic;
    } catch (error) {
      if (!(error instanceof AiConfigurationError)) {
        this.logger.warn(
          'Intent detection fell back to heuristics',
          error instanceof Error ? error.message : undefined,
        );
      }

      return heuristic;
    }
  }

  detectWithHeuristics(inputText: string): IntentDetectionResult {
    const text = inputText.toLowerCase();
    const checks: Array<[ArtifactType, number, RegExp, string]> = [
      [
        ArtifactType.FRONT_BACK_SPLIT,
        0.9,
        /(front|frontend|фронт|(^|\s)бек($|\s)|back|backend|раздел.*(front|back|фронт|бек))/i,
        'Пользователь просит разделить задачу на frontend/backend.',
      ],
      [
        ArtifactType.DAILY,
        0.86,
        /(дейли|daily|завел|завёл|жду фидбек|в процессе|сегодня|вчера)/i,
        'Текст похож на daily update.',
      ],
      [
        ArtifactType.JIRA_COMMENT,
        0.88,
        /(комментар|jira comment|коммент в jira|ответить в jira)/i,
        'Пользователь просит комментарий для Jira.',
      ],
      [
        ArtifactType.QUESTIONS,
        0.86,
        /(что уточнить|какие вопросы|вопросы задать|уточняющие вопросы)/i,
        'Пользователь просит вопросы на уточнение.',
      ],
      [
        ArtifactType.CHECKLIST,
        0.88,
        /(чек.?лист|checklist|проверки|тест.?кейс|протестировать)/i,
        'Пользователь просит чек-лист или проверки.',
      ],
      [
        ArtifactType.REQUIREMENTS_REVIEW,
        0.86,
        /(review|ревью|проверь.*требован|качество.*требован|проверь.*описание)/i,
        'Пользователь просит review требований.',
      ],
      [
        ArtifactType.GOST34,
        0.9,
        /(гост|гост 34|тз|техническ.*задан)/i,
        'Пользователь просит текст для ТЗ/ГОСТ 34.',
      ],
      [
        ArtifactType.BUG,
        0.9,
        /(баг|ошиб|не работает|не отображ|пуст|не видит|не приходит|не сохраня|не открыв|не груз)/i,
        'Текст описывает ошибку или неправильное поведение.',
      ],
      [
        ArtifactType.USER_STORY,
        0.78,
        /(как пользователь|я хочу|user story|истори|нужно.*возможность|добавить возможность)/i,
        'Текст похож на пользовательскую историю.',
      ],
      [
        ArtifactType.TASK,
        0.76,
        /(нужно|надо|сделать|добавить|изменить|переименовать|реализовать)/i,
        'Текст похож на задачу.',
      ],
    ];

    for (const [intent, confidence, pattern, shortReason] of checks) {
      if (pattern.test(text)) {
        return { intent, confidence, shortReason };
      }
    }

    return {
      intent: ArtifactType.UNKNOWN,
      confidence: 0,
      shortReason: 'Intent не определен уверенно.',
    };
  }

  private safeParseIntent(raw: string): IntentDetectionResult {
    try {
      const normalized = raw.replace(/^```json\s*/i, '').replace(/```$/u, '');
      const parsed = JSON.parse(normalized) as Partial<IntentDetectionResult>;
      const intent = parsed.intent;
      const confidence = Number(parsed.confidence);

      if (
        typeof intent !== 'string' ||
        !SUPPORTED_INTENTS.has(intent) ||
        !Number.isFinite(confidence)
      ) {
        return this.unknown();
      }

      return {
        intent: intent as ArtifactType,
        confidence: Math.max(0, Math.min(1, confidence)),
        shortReason:
          typeof parsed.shortReason === 'string'
            ? parsed.shortReason
            : 'Intent определен AI.',
      };
    } catch {
      return this.unknown();
    }
  }

  private unknown(): IntentDetectionResult {
    return {
      intent: ArtifactType.UNKNOWN,
      confidence: 0,
      shortReason: 'Не удалось распарсить intent detection.',
    };
  }
}
