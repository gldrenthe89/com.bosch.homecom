import Homey from 'homey/lib/Homey';
import { exchangeCodeForToken } from './lib/BoschHomeComOAuth2Client';

interface BoschHomeComApp {
  storeToken(token: { access_token: string; refresh_token?: string; token_type?: string; expires_in?: number }): void;
}

module.exports = {
  async reauthorize({ homey, body }: { homey: Homey; body: { code: string } }): Promise<boolean> {
    const app = homey.app as unknown as BoschHomeComApp;

    const code = body.code?.trim();
    if (!code) {
      throw new Error('Authorization code is required');
    }

    try {
      const token = await exchangeCodeForToken(code);
      app.storeToken({
        access_token: token.access_token,
        refresh_token: token.refresh_token,
        token_type: token.token_type,
        expires_in: token.expires_in,
      });

      return true;
    } catch (error) {
      throw new Error(`Reauthorization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },
};
