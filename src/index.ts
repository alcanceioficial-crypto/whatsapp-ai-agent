import { getAppConfig, getAIServiceConfig } from './config';
import { WhatsAppService } from './services/whatsapp.service';
import { AIService } from './services/ai.service';
import { ChatHistoryService } from './services/chat-history.service';
import { WebSocketService } from './services/websocket.service';
import { ChatbotService } from './services/chatbot.service';
import { logger } from './utils/logger';

/**
 * Main application class
 */
class WhatsAppAIChatbot {
  private chatbotService: ChatbotService | null = null;

  constructor() {
    logger.info('WhatsApp AI Chatbot starting...');
  }

  async initialize(): Promise<void> {
    try {
      const appConfig = getAppConfig();
      const aiConfig = getAIServiceConfig();

      logger.info('Configuration loaded', {
        port: appConfig.port,
        aiProvider: aiConfig.provider,
        model: aiConfig.model, // <-- Log do modelo correto
        maxHistoryLength: appConfig.maxHistoryLength,
      });

      const whatsappService = new WhatsAppService();
      const aiService = new AIService(aiConfig);
      const chatHistoryService = new ChatHistoryService(appConfig.maxHistoryLength);
      const webSocketService = new WebSocketService(appConfig.port);

      this.chatbotService = new ChatbotService(
        whatsappService,
        aiService,
        chatHistoryService,
        webSocketService,
        appConfig.responseDelay
      );

      await this.chatbotService.initialize();

      logger.info('WhatsApp AI Chatbot initialized successfully! 🚀');
      this.logStartupInfo();

    } catch (error) {
      logger.error('Failed to initialize application', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      process.exit(1);
    }
  }

  private logStartupInfo(): void {
    if (!this.chatbotService) return;

    const status = this.chatbotService.getStatus();
    
    console.log('\n' + '='.repeat(60));
    console.log('🤖 WhatsApp AI Chatbot is running!');
    console.log('='.repeat(60));
    console.log('📱 WhatsApp Status:', status.whatsappConnected ? '✅ Connected' : '❌ Disconnected');
    console.log('🧠 AI Service:', status.aiServiceConnected ? '✅ Connected' : '❌ Disconnected');
    console.log('🌐 WebSocket Clients:', status.webSocketClients);
    console.log('💬 Active Chats:', status.totalChats);
    console.log('📝 Total Messages:', status.totalMessages);
    console.log('='.repeat(60));
    console.log('🔗 WebSocket Server: ws://localhost:8080');
    console.log('📋 Scan the QR code above to connect WhatsApp');
    console.log('⏹️  Press Ctrl+C to stop the bot');
    console.log('='.repeat(60) + '\n');
  }

  async start(): Promise<void> {
    await this.initialize();

    process.on('SIGINT', async () => {
      logger.info('Received SIGINT, shutting down gracefully...');
      await this.shutdown();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      logger.info('Received SIGTERM, shutting down gracefully...');
      await this.shutdown();
      process.exit(0);
    });

    process.on('uncaughtException', (error) => {
      logger.error('Uncaught Exception', {
        error: error.message,
        stack: error.stack,
      });
      this.shutdown().finally(() => process.exit(1));
    });

    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled Rejection', {
        reason: reason instanceof Error ? reason.message : reason,
        promise,
      });
      this.shutdown().finally(() => process.exit(1));
    });
  }

  async shutdown(): Promise<void> {
    if (this.chatbotService) {
      await this.chatbotService.shutdown();
    }
    logger.info('Application shutdown completed');
  }

  getStatus() {
    return this.chatbotService?.getStatus() || null;
  }
}

/**
 * Main function
 */
async function main(): Promise<void> {
  const app = new WhatsAppAIChatbot();
  await app.start();
}

if (require.main === module) {
  main().catch((error) => {
    logger.error('Application failed to start', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    process.exit(1);
  });
}

export { WhatsAppAIChatbot };
