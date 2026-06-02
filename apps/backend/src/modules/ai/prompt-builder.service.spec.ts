import { ArtifactType, DetailLevel, Language, Tone } from '@prisma/client';

import { PromptBuilderService } from './prompt-builder.service';

describe('PromptBuilderService', () => {
  it('adds project context to prompt', () => {
    const service = new PromptBuilderService();
    const prompt = service.buildArtifactPrompt({
      artifactType: ArtifactType.BUG,
      inputText: 'не отображается имя файла',
      userSettings: {
        id: 'settings-id',
        userId: 'user-id',
        language: Language.RU,
        tone: Tone.JIRA_READY,
        detailLevel: DetailLevel.MEDIUM,
        defaultProjectContextId: 'context-id',
        createdAt: new Date(),
        updatedAt: new Date(),
        defaultProjectContext: null,
      },
      projectContext: {
        id: 'context-id',
        key: 'allur_finance',
        name: 'Allur Finance',
        description: 'desc',
        context: 'Учитывать автокредитование',
        isDefault: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    expect(prompt).toContain('Учитывать автокредитование');
    expect(prompt).toContain('не отображается имя файла');
  });
});
