import type { Context, MiddlewareFn } from 'grammy';
import type { Logger } from '../core/Logger.js';

export class AuthMiddleware {
  private readonly allowed: Set<string>;

  constructor(adminChatIds: bigint[], private readonly logger: Logger) {
    this.allowed = new Set(adminChatIds.map((id) => id.toString()));
  }

  middleware(): MiddlewareFn<Context> {
    return async (ctx, next) => {
      const chatId = ctx.chat?.id;
      if (chatId === undefined || !this.allowed.has(chatId.toString())) {
        this.logger.warn('auth_denied', {
          chatIdHash: chatId !== undefined ? this.hash(String(chatId)) : 'none',
        });
        return;
      }
      await next();
    };
  }

  private hash(s: string): string {
    let h = 0;
    for (let i = 0; i < s.length; i++) {
      h = (h * 31 + s.charCodeAt(i)) | 0;
    }
    return `h${(h >>> 0).toString(16)}`;
  }
}
