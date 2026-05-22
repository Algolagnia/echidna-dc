import { Bot } from 'grammy';
import type { AuthMiddleware } from './AuthMiddleware.js';
import type { CommandRouter } from './CommandRouter.js';
import type { Logger } from '../core/Logger.js';

export interface TelegramConfig {
  token: string;
}

export class TelegramBot {
  private readonly bot: Bot;

  constructor(
    config: TelegramConfig,
    auth: AuthMiddleware,
    router: CommandRouter,
    private readonly logger: Logger,
  ) {
    this.bot = new Bot(config.token);
    this.bot.use(auth.middleware());
    router.register(this.bot);

    this.bot.catch((err) => {
      this.logger.error('telegram_handler_error', {
        message: err.error instanceof Error ? err.error.message : 'unknown',
      });
    });
  }

  async start(): Promise<void> {
    this.logger.info('telegram_starting');
    void this.bot.start({
      onStart: () => this.logger.info('telegram_started'),
    });
  }

  async stop(): Promise<void> {
    await this.bot.stop();
    this.logger.info('telegram_stopped');
  }
}
