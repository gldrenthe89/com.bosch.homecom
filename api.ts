import Homey from 'homey/lib/Homey';
import { exchangeCodeForToken } from './lib/BoschHomeComOAuth2Client';
import { addDebugLogEntry, clearDebugLog, createDebugLogFn, sanitizeErrorMessage } from './lib/utils/DebugLog';

interface BoschHomeComApp {
  storeToken(token: { access_token: string; refresh_token?: string; token_type?: string; expires_in?: number }): void;
}

module.exports = {
  async reauthorize({ homey, body }: { homey: Homey; body: { code: string } }): Promise<boolean> {
    const app = homey.app as unknown as BoschHomeComApp;
    const debugLog = createDebugLogFn(homey);

    const code = body.code?.trim();
    if (!code) {
      throw new Error('Authorization code is required');
    }

    debugLog('info', '[AUTH] Reauthorization started (settings page)');

    try {
      const token = await exchangeCodeForToken(code, debugLog);
      app.storeToken({
        access_token: token.access_token,
        refresh_token: token.refresh_token,
        token_type: token.token_type,
        expires_in: token.expires_in,
      });

      debugLog('info', '[AUTH] Reauthorization succeeded');
      return true;
    } catch (error) {
      const msg = sanitizeErrorMessage(error instanceof Error ? error.message : 'Unknown error');
      addDebugLogEntry(homey, 'error', `[AUTH] Reauthorization failed: ${msg}`);
      throw new Error(`Reauthorization failed: ${msg}`);
    }
  },

  async clearDebugLog({ homey }: { homey: Homey }): Promise<boolean> {
    clearDebugLog(homey);
    return true;
  },
};
