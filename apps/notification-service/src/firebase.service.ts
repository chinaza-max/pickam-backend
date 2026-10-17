import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { initializeApp, cert, getApps, App, ServiceAccount } from 'firebase-admin/app';
import { getMessaging, Message, MulticastMessage } from 'firebase-admin/messaging';
import * as path from 'path';
import * as fs from 'fs';

@Injectable()
export class FirebaseService implements OnModuleInit {
  private readonly logger = new Logger(FirebaseService.name);
  private app: App | null = null;

  onModuleInit() {
    this.init();
  }

  private init() {
    // Try env var first (base64-encoded JSON), then fall back to file
    const envKey = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
    const candidatePaths = [
      path.resolve(process.cwd(), 'apps/notification-service/firebase-service-account.json'),
      path.resolve(process.cwd(), 'movie-59f48-firebase-adminsdk-elwb3-e073042467.json'),
      path.resolve(__dirname, 'firebase-service-account.json'),
      path.resolve(__dirname, '../firebase-service-account.json'),
      path.resolve(__dirname, '../../../apps/notification-service/firebase-service-account.json'),
      path.resolve(__dirname, '../../../../movie-59f48-firebase-adminsdk-elwb3-e073042467.json'),
    ];

    try {
      let serviceAccount: ServiceAccount;

      if (envKey) {
        this.logger.log('Loading Firebase credentials from FIREBASE_SERVICE_ACCOUNT_JSON env var');
        serviceAccount = JSON.parse(
          Buffer.from(envKey, 'base64').toString('utf8'),
        ) as ServiceAccount;
      } else {
        const foundPath = candidatePaths.find((p) => fs.existsSync(p));
        if (foundPath) {
          this.logger.log(`Loading Firebase credentials from ${foundPath}`);
          serviceAccount = JSON.parse(
            fs.readFileSync(foundPath, 'utf8'),
          ) as ServiceAccount;
        } else {
          this.logger.warn(
            'Firebase service account file not found and FIREBASE_SERVICE_ACCOUNT_JSON env var not set. Push notifications will be disabled.',
          );
          return;
        }
      }

      const existingApps = getApps();
      if (existingApps.length === 0) {
        this.app = initializeApp({
          credential: cert(serviceAccount),
        });
        this.logger.log('Firebase Admin SDK initialized successfully');
      } else {
        this.app = existingApps[0]!;
        this.logger.log('Reusing existing Firebase Admin app instance');
      }
    } catch (err: any) {
      this.logger.error(`Failed to initialize Firebase Admin SDK: ${err.message}`);
    }
  }

  get isAvailable(): boolean {
    return this.app !== null;
  }

  /**
   * Send a push notification to a single FCM token.
   * Returns true on success, false on failure (e.g. invalid token).
   */
  async sendToToken(
    fcmToken: string,
    title: string,
    body: string,
    data?: Record<string, string>,
  ): Promise<boolean> {
    if (!this.app || !fcmToken) return false;

    try {
      const message: Message = {
        token: fcmToken,
        notification: { title, body },
        data: data || {},
        android: {
          priority: 'high',
          notification: {
            sound: 'default',
            channelId: 'pickam_default',
          },
        },
        apns: {
          payload: {
            aps: {
              sound: 'default',
              badge: 1,
            },
          },
        },
      };

      const response = await getMessaging(this.app).send(message);
      this.logger.log(`FCM push sent to token ...${fcmToken.slice(-8)} → messageId: ${response}`);
      return true;
    } catch (err: any) {
      // Common non-fatal errors: token expired / app uninstalled
      const isTokenError =
        err.code === 'messaging/registration-token-not-registered' ||
        err.code === 'messaging/invalid-registration-token';

      if (isTokenError) {
        this.logger.warn(`FCM token invalid/expired (token: ...${fcmToken.slice(-8)}): ${err.code}`);
      } else {
        this.logger.error(`FCM send error: ${err.message}`);
      }
      return false;
    }
  }

  /**
   * Send a push notification to multiple FCM tokens at once (batch).
   */
  async sendToMultipleTokens(
    fcmTokens: string[],
    title: string,
    body: string,
    data?: Record<string, string>,
  ): Promise<{ successCount: number; failureCount: number }> {
    if (!this.app || fcmTokens.length === 0) {
      return { successCount: 0, failureCount: fcmTokens.length };
    }

    const message: MulticastMessage = {
      tokens: fcmTokens,
      notification: { title, body },
      data: data || {},
      android: {
        priority: 'high',
        notification: { sound: 'default', channelId: 'pickam_default' },
      },
      apns: {
        payload: { aps: { sound: 'default', badge: 1 } },
      },
    };

    try {
      const response = await getMessaging(this.app).sendEachForMulticast(message);
      this.logger.log(
        `FCM multicast: ${response.successCount} sent, ${response.failureCount} failed out of ${fcmTokens.length}`,
      );
      return {
        successCount: response.successCount,
        failureCount: response.failureCount,
      };
    } catch (err: any) {
      this.logger.error(`FCM multicast error: ${err.message}`);
      return { successCount: 0, failureCount: fcmTokens.length };
    }
  }

  /**
   * Subscribe a token to a topic (e.g. "broadcast" for admin announcements).
   */
  async subscribeToTopic(fcmToken: string, topic: string): Promise<void> {
    if (!this.app || !fcmToken) return;
    try {
      await getMessaging(this.app).subscribeToTopic([fcmToken], topic);
      this.logger.log(`Subscribed token to topic "${topic}"`);
    } catch (err: any) {
      this.logger.warn(`Topic subscribe error: ${err.message}`);
    }
  }

  /**
   * Broadcast to a topic (e.g. send to all riders or all customers).
   */
  async sendToTopic(
    topic: string,
    title: string,
    body: string,
    data?: Record<string, string>,
  ): Promise<boolean> {
    if (!this.app) return false;
    try {
      const message: Message = {
        topic,
        notification: { title, body },
        data: data || {},
        android: {
          priority: 'high',
          notification: { sound: 'default', channelId: 'pickam_default' },
        },
        apns: {
          payload: { aps: { sound: 'default', badge: 1 } },
        },
      };
      await getMessaging(this.app).send(message);
      this.logger.log(`FCM topic "${topic}" notification sent`);
      return true;
    } catch (err: any) {
      this.logger.error(`FCM topic send error: ${err.message}`);
      return false;
    }
  }
}
