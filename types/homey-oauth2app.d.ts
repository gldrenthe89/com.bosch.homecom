declare module 'homey-oauth2app' {
  import Homey from 'homey';

  export class OAuth2Token {
    constructor(options: {
      access_token: string;
      refresh_token?: string;
      token_type?: string;
      expires_in?: number;
    });
    access_token: string;
    refresh_token?: string;
    token_type?: string;
    expires_in?: number;
  }

  export class OAuth2Client {
    static API_URL: string;
    static TOKEN_URL: string;
    static AUTHORIZATION_URL: string;
    static SCOPES: string[];

    homey: Homey.Homey;

    getToken(): OAuth2Token | null;
    setToken(token: OAuth2Token): Promise<void>;
    refreshToken(): Promise<void>;
    save(): Promise<void>;
    getSessionId(): string;
    getConfigId(): string;

    onHandleAuthorizationURL(options: { scopes: string[]; state: string }): string;
    onGetTokenByCode(options: { code: string }): Promise<OAuth2Token>;
    onRefreshToken(): Promise<OAuth2Token>;

    get<T = unknown>(options: {
      path: string;
      query?: Record<string, string>;
      headers?: Record<string, string>;
    }): Promise<T>;

    put<T = unknown>(options: {
      path: string;
      json?: unknown;
      headers?: Record<string, string>;
    }): Promise<T>;

    post<T = unknown>(options: {
      path: string;
      json?: unknown;
      body?: string;
      headers?: Record<string, string>;
    }): Promise<T>;
  }

  export interface OAuth2AppCreateClientOptions {
    sessionId: string;
    configId?: string;
  }

  export class OAuth2App extends Homey.App {
    static OAUTH2_CLIENT: typeof OAuth2Client;
    static OAUTH2_DEBUG: boolean;
    static OAUTH2_MULTI_SESSION: boolean;

    onOAuth2Init(): Promise<void>;
    createOAuth2Client(options: OAuth2AppCreateClientOptions): Promise<OAuth2Client>;
    getFirstSavedOAuth2Client(): OAuth2Client | null;
  }

  export class OAuth2Driver<TClient extends OAuth2Client = OAuth2Client> extends Homey.Driver {
    homey: Homey.Homey & { app: OAuth2App };

    onOAuth2Init(): Promise<void>;
    onPairListDevices(options: { oAuth2Client: TClient }): Promise<
      Array<{
        name: string;
        data: Record<string, unknown>;
        store?: Record<string, unknown>;
      }>
    >;
    getOAuth2ConfigId(): string;
  }

  export class OAuth2Device<TClient extends OAuth2Client = OAuth2Client> extends Homey.Device {
    oAuth2Client: TClient;
    homey: Homey.Homey;

    onOAuth2Init(): Promise<void>;
    onOAuth2Deleted(): Promise<void>;
    onOAuth2Uninit(): Promise<void>;

    log(...args: unknown[]): void;
    error(...args: unknown[]): void;

    getStoreValue(key: string): unknown;
    setStoreValue(key: string, value: unknown): Promise<void>;

    getSetting(key: string): unknown;
    setSettings(settings: Record<string, unknown>): Promise<void>;

    getCapabilityValue<T = unknown>(capability: string): T;
    setCapabilityValue<T = unknown>(capability: string, value: T): Promise<void>;
    registerCapabilityListener<T = unknown>(capability: string, listener: (value: T) => Promise<void>): void;

    setAvailable(): Promise<void>;
    setUnavailable(message?: string): Promise<void>;
  }
}
