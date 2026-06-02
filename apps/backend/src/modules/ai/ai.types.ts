import type {
  Artifact,
  ArtifactType,
  Prisma,
  ProjectContext,
  UserSettings,
} from '@prisma/client';

export interface AiMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface IntentDetectionResult {
  intent: ArtifactType;
  confidence: number;
  shortReason: string;
}

export type SettingsWithProjectContext = UserSettings & {
  defaultProjectContext: ProjectContext | null;
};

export interface ArtifactGenerationInput {
  userId: string;
  inputText: string;
  artifactType: ArtifactType;
  userSettings: SettingsWithProjectContext;
  projectContext: ProjectContext;
  metadata?: Prisma.InputJsonValue;
}

export interface ArtifactGenerationResult {
  artifact: Artifact;
  outputText: string;
}

export type ArtifactAction =
  | 'shorten'
  | 'formalize'
  | 'simplify'
  | 'addAcceptanceCriteria'
  | 'generateChecklist'
  | 'splitFrontBack'
  | 'regenerate';
