export const INTENT_PROMPT = `Определи intent текста пользователя.

Верни строго JSON без markdown:
{
  "intent": "BUG | USER_STORY | TASK | FRONT_BACK_SPLIT | DAILY | JIRA_COMMENT | QUESTIONS | CHECKLIST | REQUIREMENTS_REVIEW | GOST34 | UNKNOWN",
  "confidence": 0.0,
  "shortReason": "короткая причина"
}

Правила:
- Ошибка, баг, не работает, не отображается, пустые поля, неправильный результат => BUG.
- "Нужно сделать", "добавить возможность", "как пользователь", "я хочу" => USER_STORY или TASK.
- Разделить на фронт/бэк => FRONT_BACK_SPLIT.
- Дейлик, отчет, что сделал, жду фидбек => DAILY.
- Комментарий в Jira => JIRA_COMMENT.
- Что уточнить, какие вопросы задать => QUESTIONS.
- Чек-лист или проверки => CHECKLIST.
- Проверить описание задачи или требования => REQUIREMENTS_REVIEW.
- ГОСТ 34 или ТЗ => GOST34.
- Если уверенность низкая => UNKNOWN.`;
