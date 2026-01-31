import { OAuth2Client, OAuth2Token } from 'homey-oauth2app';
import {
  OAUTH_DOMAIN,
  OAUTH_AUTH_PATH,
  OAUTH_TOKEN_PATH,
  OAUTH_CLIENT_ID,
  OAUTH_REDIRECT_URI,
  OAUTH_SCOPE,
  OAUTH_BROWSER_VERIFIER,
  OAUTH_BROWSER_CHALLENGE,
  BOSCHCOM_DOMAIN,
} from './utils/constants';
import https from 'https';

interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  token_type?: string;
  expires_in?: number;
}

export class BoschHomeComOAuth2Client extends OAuth2Client {
  // Required static properties for homey-oauth2app
  static API_URL = BOSCHCOM_DOMAIN;
  static TOKEN_URL = `${OAUTH_DOMAIN}${OAUTH_TOKEN_PATH}`;
  static AUTHORIZATION_URL = `${OAUTH_DOMAIN}${OAUTH_AUTH_PATH}`;
  static SCOPES = [OAUTH_SCOPE];

  /**
   * Make an HTTPS request (Homey compatible)
   */
  private doHttpRequest(url: string, options: {
    method: string;
    headers: Record<string, string>;
    body?: string;
  }): Promise<{ status: number; body: string }> {
    return new Promise((resolve, reject) => {
      const urlObj = new URL(url);
      const req = https.request({
        hostname: urlObj.hostname,
        port: 443,
        path: urlObj.pathname + urlObj.search,
        method: options.method,
        headers: options.headers,
      }, (res) => {
        let data = '';
        res.on('data', chunk => { data += chunk; });
        res.on('end', () => {
          resolve({ status: res.statusCode || 500, body: data });
        });
      });

      req.on('error', reject);

      if (options.body) {
        req.write(options.body);
      }
      req.end();
    });
  }

  /**
   * Get the authorization URL for manual login flow
   * User needs to open this URL in browser, login, and copy the code
   */
  getManualAuthorizationUrl(): string {
    return 'https://singlekey-id.com/auth/connect/authorize?state=nKqS17oMAxqUsQpMznajIr&nonce=5yPvyTqMS3iPb4c8RfGJg1&code_challenge=Fc6eY3uMBJkFqa4VqcULuLuKC5Do70XMw7oa_Pxafw0&redirect_uri=com.bosch.tt.dashtt.pointt://app/login&client_id=762162C0-FA2D-4540-AE66-6489F189FADC&response_type=code&prompt=login&scope=openid+email+profile+offline_access+pointt.gateway.claiming+pointt.gateway.removal+pointt.gateway.list+pointt.gateway.users+pointt.gateway.resource.dashapp+pointt.castt.flow.token-exchange+bacon+hcc.tariff.read&code_challenge_method=S256&style_id=tt_bsch';
  }

  /**
   * Exchange authorization code for tokens using the fixed code_verifier
   * This is used for the manual login flow
   */
  async exchangeCodeForToken(code: string): Promise<OAuth2Token> {
    const body = new URLSearchParams();
    body.set('grant_type', 'authorization_code');
    body.set('client_id', OAUTH_CLIENT_ID);
    body.set('redirect_uri', OAUTH_REDIRECT_URI);
    body.set('code', code);
    body.set('code_verifier', OAUTH_BROWSER_VERIFIER);

    const response = await this.doHttpRequest(BoschHomeComOAuth2Client.TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
    });

    if (response.status !== 200) {
      let errorMessage = 'Token exchange failed';
      try {
        const errorData = JSON.parse(response.body);
        errorMessage = errorData.error_description || errorData.error || errorMessage;
      } catch {
        errorMessage = response.body || errorMessage;
      }
      throw new Error(errorMessage);
    }

    const tokenData: TokenResponse = JSON.parse(response.body);

    return new OAuth2Token({
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      token_type: tokenData.token_type || 'Bearer',
      expires_in: tokenData.expires_in,
    });
  }

  /**
   * Override to use manual flow - this prevents the default OAuth2 redirect
   */
  onHandleAuthorizationURL(): string {
    // Return the manual auth URL instead of using Athom's callback
    return this.getManualAuthorizationUrl();
  }

  /**
   * Override to use the fixed code_verifier
   */
  async onGetTokenByCode({ code }: { code: string }): Promise<OAuth2Token> {
    return this.exchangeCodeForToken(code);
  }

  /**
   * Override token refresh
   */
  async onRefreshToken(): Promise<OAuth2Token> {
    const token = this.getToken();
    if (!token?.refresh_token) {
      throw new Error('No refresh token available');
    }

    const body = new URLSearchParams();
    body.set('grant_type', 'refresh_token');
    body.set('client_id', OAUTH_CLIENT_ID);
    body.set('refresh_token', token.refresh_token);

    const response = await this.doHttpRequest(BoschHomeComOAuth2Client.TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
    });

    if (response.status !== 200) {
      let errorMessage = 'Token refresh failed';
      try {
        const errorData = JSON.parse(response.body);
        errorMessage = errorData.error_description || errorData.error || errorMessage;
      } catch {
        errorMessage = response.body || errorMessage;
      }
      throw new Error(errorMessage);
    }

    const tokenData: TokenResponse = JSON.parse(response.body);

    return new OAuth2Token({
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token || token.refresh_token,
      token_type: tokenData.token_type || 'Bearer',
      expires_in: tokenData.expires_in,
    });
  }
}
