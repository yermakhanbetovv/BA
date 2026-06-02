import { Injectable } from '@nestjs/common';
import { ArtifactType } from '@prisma/client';

import { ArtifactsService } from '../artifacts/artifacts.service';
import { AiClientService } from './ai-client.service';
import { ArtifactAction, ArtifactGenerationResult, SettingsWithProjectContext } from './ai.types';
import { PromptBuilderService } from './prompt-builder.service';

const ACTION_INSTRUCTIONS: Record<ArtifactAction, string> = {
  shorten: 'Сократи результат. Сохрани смысл, убери лишнее, оставь готовый рабочий текст.',
  formalize: 'Сделай текст формальнее и аккуратнее. Не добавляй факты.',
  simplify: 'Сделай текст проще и понятнее. Не теряй важные детали.',
  addAcceptanceCriteria:
    'Добавь Acceptance Criteria к текущему результату. Не переписывай всё без необходимости.',
  generateChecklist:
    'На основе исходного текста и результата сделай практичный чек-лист тестирования.',
  splitFrontBack:
    'Раздели задачу на frontend и backend. Если одна часть не нужна, явно напиши это.',
  regenerate: 'Перегенерируй результат заново, улучшив структуру и точность.',
};

@Injectable()
export class ArtifactActionService {
  constructor(
    private readonly aiClient: AiClientService,
    private readonly artifactsService: ArtifactsService,
    private readonly promptBuilder: PromptBuilderService,
  ) {}

  async runAction(input: {
    artifactId: string;
    action: ArtifactAction;
    userSettings: SettingsWithProjectContext;
  }): Promise<ArtifactGenerationResult> {
    const sourceArtifact = await this.artifactsService.getArtifactById(
      input.artifactId,
    );
    const actionType = this.resolveActionType(sourceArtifact.type, input.action);
    const actionPrompt = this.promptBuilder.buildArtifactPrompt({
      artifactType: actionType,
      inputText: [
        `Исходный текст:\n${sourceArtifact.inputText}`,
        '',
        `Текущий результат:\n${sourceArtifact.outputText}`,
      ].join('\n'),
      userSettings: input.userSettings,
      projectContext: sourceArtifact.projectContext,
      actionInstruction: ACTION_INSTRUCTIONS[input.action],
    });
    const outputText = await this.aiClient.generateText([
      { role: 'user', content: actionPrompt },
    ]);
    const artifact = await this.artifactsService.createArtifact({
      userId: sourceArtifact.userId,
      projectContextId: sourceArtifact.projectContextId,
      type: actionType,
      inputText: sourceArtifact.inputText,
      outputText,
      metadata: {
        action: input.action,
        sourceArtifactId: sourceArtifact.id,
      },
    });

    return { artifact, outputText };
  }

  shorten(artifactId: string, userSettings: SettingsWithProjectContext) {
    return this.runAction({ artifactId, userSettings, action: 'shorten' });
  }

  formalize(artifactId: string, userSettings: SettingsWithProjectContext) {
    return this.runAction({ artifactId, userSettings, action: 'formalize' });
  }

  simplify(artifactId: string, userSettings: SettingsWithProjectContext) {
    return this.runAction({ artifactId, userSettings, action: 'simplify' });
  }

  addAcceptanceCriteria(
    artifactId: string,
    userSettings: SettingsWithProjectContext,
  ) {
    return this.runAction({
      artifactId,
      userSettings,
      action: 'addAcceptanceCriteria',
    });
  }

  generateChecklist(
    artifactId: string,
    userSettings: SettingsWithProjectContext,
  ) {
    return this.runAction({
      artifactId,
      userSettings,
      action: 'generateChecklist',
    });
  }

  splitFrontBack(artifactId: string, userSettings: SettingsWithProjectContext) {
    return this.runAction({
      artifactId,
      userSettings,
      action: 'splitFrontBack',
    });
  }

  regenerate(artifactId: string, userSettings: SettingsWithProjectContext) {
    return this.runAction({ artifactId, userSettings, action: 'regenerate' });
  }

  private resolveActionType(sourceType: ArtifactType, action: ArtifactAction) {
    if (action === 'generateChecklist') {
      return ArtifactType.CHECKLIST;
    }

    if (action === 'splitFrontBack') {
      return ArtifactType.FRONT_BACK_SPLIT;
    }

    return sourceType;
  }
}
