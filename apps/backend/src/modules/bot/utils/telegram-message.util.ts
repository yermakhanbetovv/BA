import type { Context, InlineKeyboard } from 'grammy';

const TELEGRAM_SAFE_MESSAGE_LIMIT = 3900;

export function splitLongMessage(text: string): string[] {
  if (text.length <= TELEGRAM_SAFE_MESSAGE_LIMIT) {
    return [text];
  }

  const chunks: string[] = [];
  let remaining = text;

  while (remaining.length > TELEGRAM_SAFE_MESSAGE_LIMIT) {
    const slice = remaining.slice(0, TELEGRAM_SAFE_MESSAGE_LIMIT);
    const splitAt = Math.max(
      slice.lastIndexOf('\n\n'),
      slice.lastIndexOf('\n'),
      slice.lastIndexOf('. '),
    );
    const chunkEnd = splitAt > 1000 ? splitAt + 1 : TELEGRAM_SAFE_MESSAGE_LIMIT;

    chunks.push(remaining.slice(0, chunkEnd).trim());
    remaining = remaining.slice(chunkEnd).trim();
  }

  if (remaining.length > 0) {
    chunks.push(remaining);
  }

  return chunks;
}

export async function sendLongMessage(
  ctx: Context,
  text: string,
  replyMarkup?: InlineKeyboard,
): Promise<void> {
  const chunks = splitLongMessage(text);

  for (const [index, chunk] of chunks.entries()) {
    await ctx.reply(chunk, {
      reply_markup: index === chunks.length - 1 ? replyMarkup : undefined,
    });
  }
}
