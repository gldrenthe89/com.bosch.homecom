import { OAuth2App, OAuth2Token } from 'homey-oauth2app';
import { BoschHomeComOAuth2Client } from './lib/BoschHomeComOAuth2Client';

interface StoredToken {
  access_token: string;
  refresh_token?: string;
  token_type?: string;
  expires_in?: number;
  stored_at?: number;
}

class BoschHomeComApp extends OAuth2App {
  static OAUTH2_CLIENT = BoschHomeComOAuth2Client;
  static OAUTH2_DEBUG = false;
  static OAUTH2_MULTI_SESSION = false;

  async onOAuth2Init(): Promise<void> {
    // App initialization complete
  }

  /**
   * Store the OAuth2 token in app settings
   */
  storeToken(token: OAuth2Token): void {
    const tokenData: StoredToken = {
      access_token: token.access_token,
      refresh_token: token.refresh_token,
      token_type: token.token_type,
      expires_in: token.expires_in,
      stored_at: Date.now(),
    };
    this.homey.settings.set('oauth_token', JSON.stringify(tokenData));
  }

  /**
   * Get the stored OAuth2 token from app settings
   */
  getStoredToken(): StoredToken | null {
    try {
      const tokenJson = this.homey.settings.get('oauth_token');
      if (!tokenJson) return null;
      return JSON.parse(tokenJson) as StoredToken;
    } catch {
      return null;
    }
  }

  /**
   * Get the access token (for API calls)
   */
  getAccessToken(): string | null {
    const token = this.getStoredToken();
    return token?.access_token || null;
  }

  /**
   * Check if we have a valid stored token
   */
  hasValidToken(): boolean {
    const token = this.getStoredToken();
    if (!token?.access_token) return false;

    // Check if token might be expired (if we have expires_in)
    if (token.expires_in && token.stored_at) {
      const expiresAt = token.stored_at + (token.expires_in * 1000);
      // Give 5 minute buffer
      if (Date.now() > expiresAt - 300000) {
        return false;
      }
    }

    return true;
  }

  /**
   * Clear the stored token
   */
  clearToken(): void {
    this.homey.settings.unset('oauth_token');
  }
}

module.exports = BoschHomeComApp;
