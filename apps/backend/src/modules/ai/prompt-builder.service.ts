import { Injectable } from '@nestjs/common';
import { ArtifactType, ProjectContext } from '@prisma/client';

import { SettingsWithProjectContext } from './ai.types';
import { ARTIFACT_PROMPTS } from './prompts';
import { SYSTEM_PROMPT } from './prompts/system.prompt';

@Injectable()
export class PromptBuilderService {
  buildArtifactPrompt(input: {
    artifactType: ArtifactType;
    inputText: string;
    userSettings: SettingsWithProjectContext;
    projectContext: ProjectContext;
    actionInstruction?: string;
  }): string {
    return [
      SYSTEM_PROMPT,
      '',
      `Project context:\n${input.projectContext.context}`,
      '',
      `Language: ${input.userSettings.language}`,
      `Tone: ${input.userSettings.tone}`,
      `Detail level: ${input.userSettings.detailLevel}`,
      '',
      input.actionInstruction
        ? `Action instruction:\n${input.actionInstruction}`
        : ARTIFACT_PROMPTS[input.artifactType],
      '',
      `User input:\n${input.inputText}`,
    ].join('\n');
  }
}
