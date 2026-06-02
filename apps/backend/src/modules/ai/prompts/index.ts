import { ArtifactType } from '@prisma/client';

import { BUG_PROMPT } from './bug.prompt';
import { CHECKLIST_PROMPT } from './checklist.prompt';
import { COMMENT_PROMPT } from './comment.prompt';
import { DAILY_PROMPT } from './daily.prompt';
import { GOST_PROMPT } from './gost.prompt';
import { QUESTIONS_PROMPT } from './questions.prompt';
import { REVIEW_PROMPT } from './review.prompt';
import { SPLIT_PROMPT } from './split.prompt';
import { STORY_PROMPT } from './story.prompt';
import { TASK_PROMPT } from './task.prompt';

export const ARTIFACT_PROMPTS: Record<ArtifactType, string> = {
  [ArtifactType.BUG]: BUG_PROMPT,
  [ArtifactType.USER_STORY]: STORY_PROMPT,
  [ArtifactType.TASK]: TASK_PROMPT,
  [ArtifactType.FRONT_BACK_SPLIT]: SPLIT_PROMPT,
  [ArtifactType.DAILY]: DAILY_PROMPT,
  [ArtifactType.JIRA_COMMENT]: COMMENT_PROMPT,
  [ArtifactType.QUESTIONS]: QUESTIONS_PROMPT,
  [ArtifactType.CHECKLIST]: CHECKLIST_PROMPT,
  [ArtifactType.REQUIREMENTS_REVIEW]: REVIEW_PROMPT,
  [ArtifactType.GOST34]: GOST_PROMPT,
  [ArtifactType.UNKNOWN]: TASK_PROMPT,
};
