import { OAuth2Client } from 'homey-oauth2app';
import https from 'https';
import {
  BOSCHCOM_DOMAIN,
  BOSCHCOM_GATEWAYS_PATH,
  BOSCHCOM_BULK_PATH,
  ENDPOINTS,
} from '../utils/constants';
import type {
  Gateway,
  ApiResponse,
  K40DeviceData,
  BulkRequest,
  BulkResponse,
  DeviceType,
} from './models';

export class HomeComApi {
  private oAuth2Client?: OAuth2Client;
  private directAccessToken?: string;

  constructor(oAuth2ClientOrToken: OAuth2Client | string) {
    if (typeof oAuth2ClientOrToken === 'string') {
      this.directAccessToken = oAuth2ClientOrToken;
    } else {
      this.oAuth2Client = oAuth2ClientOrToken;
    }
  }

  private getAccessToken(): string {
    if (this.directAccessToken) {
      return this.directAccessToken;
    }

    const token = this.oAuth2Client?.getToken();
    if (!token?.access_token) {
      throw new Error('No access token available');
    }
    return token.access_token;
  }

  private async refreshToken(): Promise<void> {
    if (!this.oAuth2Client) {
      throw new Error('Cannot refresh token: no OAuth2Client available');
    }
    await this.oAuth2Client.refreshToken();
  }

  private httpRequest<T>(
    method: string,
    url: string,
    accessToken: string,
    body?: unknown
  ): Promise<{ statusCode: number; data: T }> {
    return new Promise((resolve, reject) => {
      const urlObj = new URL(url);
      const bodyStr = body ? JSON.stringify(body) : undefined;

      const req = https.request(
        {
          hostname: urlObj.hostname,
          port: 443,
          path: urlObj.pathname + urlObj.search,
          method,
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            ...(bodyStr ? { 'Content-Length': Buffer.byteLength(bodyStr) } : {}),
          },
        },
        (res) => {
          let data = '';
          res.on('data', (chunk) => {
            data += chunk;
          });
          res.on('end', () => {
            const statusCode = res.statusCode || 500;
            if (statusCode >= 200 && statusCode < 300) {
              try {
                resolve({ statusCode, data: data ? JSON.parse(data) : ({} as T) });
              } catch {
                reject(new Error(`Failed to parse response: ${data}`));
              }
            } else {
              resolve({ statusCode, data: data as unknown as T });
            }
          });
        }
      );

      req.on('error', reject);

      if (bodyStr) {
        req.write(bodyStr);
      }
      req.end();
    });
  }

  private async get<T>(path: string): Promise<T> {
    const url = `${BOSCHCOM_DOMAIN}${path}`;

    let accessToken = this.getAccessToken();
    let result = await this.httpRequest<T>('GET', url, accessToken);

    if (result.statusCode === 401 && this.oAuth2Client) {
      await this.refreshToken();
      accessToken = this.getAccessToken();
      result = await this.httpRequest<T>('GET', url, accessToken);
    }

    if (result.statusCode < 200 || result.statusCode >= 300) {
      throw new Error(`API request failed: ${result.statusCode} - ${JSON.stringify(result.data)}`);
    }

    return result.data;
  }

  private async put<T>(path: string, body: unknown): Promise<T> {
    const url = `${BOSCHCOM_DOMAIN}${path}`;

    let accessToken = this.getAccessToken();
    let result = await this.httpRequest<T>('PUT', url, accessToken, body);

    if (result.statusCode === 401 && this.oAuth2Client) {
      await this.refreshToken();
      accessToken = this.getAccessToken();
      result = await this.httpRequest<T>('PUT', url, accessToken, body);
    }

    if (result.statusCode < 200 || result.statusCode >= 300) {
      throw new Error(`API request failed: ${result.statusCode} - ${JSON.stringify(result.data)}`);
    }

    return result.data;
  }

  private async bulk(gatewayId: string, paths: string[]): Promise<BulkResponse> {
    const body: BulkRequest = {
      resourcePaths: paths.map(p => `${BOSCHCOM_GATEWAYS_PATH}${gatewayId}${p}`),
    };
    return this.put<BulkResponse>(BOSCHCOM_BULK_PATH, body);
  }

  async getDevices(): Promise<Array<{ gatewayId: string; name?: string; deviceType?: string }>> {
    const response = await this.get<Gateway[] | { gateways: Gateway[] }>(BOSCHCOM_GATEWAYS_PATH);

    let gateways: Gateway[];
    if (Array.isArray(response)) {
      gateways = response;
    } else {
      gateways = response.gateways || [];
    }

    return gateways
      .map(gw => ({
        gatewayId: gw.gatewayId || gw.deviceId || '',
        name: gw.name,
        deviceType: gw.deviceType?.toLowerCase(),
      }))
      .filter(gw => gw.gatewayId !== '');
  }

  async getDeviceType(gatewayId: string): Promise<DeviceType> {
    try {
      const info = await this.get<ApiResponse<string>>(
        `${BOSCHCOM_GATEWAYS_PATH}${gatewayId}${ENDPOINTS.SYSTEM_INFO}`
      );

      const type = info.value?.toLowerCase() || '';
      if (type.includes('k40')) return 'k40';
      if (type.includes('k30')) return 'k30';
      return 'generic';
    } catch {
      return 'generic';
    }
  }

  async getFirmware(gatewayId: string): Promise<string | null> {
    try {
      const response = await this.get<ApiResponse<string>>(
        `${BOSCHCOM_GATEWAYS_PATH}${gatewayId}${ENDPOINTS.FIRMWARE}`
      );
      return response.value || null;
    } catch {
      return null;
    }
  }

  async getEndpoint<T>(gatewayId: string, endpoint: string): Promise<ApiResponse<T> | null> {
    try {
      return await this.get<ApiResponse<T>>(
        `${BOSCHCOM_GATEWAYS_PATH}${gatewayId}${endpoint}`
      );
    } catch {
      return null;
    }
  }

  async setEndpoint<T = unknown>(gatewayId: string, endpoint: string, value: T): Promise<boolean> {
    try {
      await this.put(
        `${BOSCHCOM_GATEWAYS_PATH}${gatewayId}${endpoint}`,
        { value }
      );
      return true;
    } catch {
      return false;
    }
  }

  async getK40Data(gatewayId: string): Promise<K40DeviceData> {
    const data: K40DeviceData = {
      heatingCircuits: [{}],
      dhwCircuits: [{}],
      heatSources: [{}],
      systemModes: {},
    };

    // Get heating circuit data
    try {
      const hc = data.heatingCircuits![0];
      hc.roomTemperature = await this.getEndpoint(gatewayId, ENDPOINTS.HC_ROOM_TEMP);
      hc.roomHumidity = await this.getEndpoint(gatewayId, ENDPOINTS.HC_ROOM_HUMIDITY);
      hc.currentRoomSetpoint = await this.getEndpoint(gatewayId, ENDPOINTS.HC_CURRENT_SETPOINT);
      hc.manualRoomSetpoint = await this.getEndpoint(gatewayId, ENDPOINTS.HC_MANUAL_SETPOINT);
      hc.operationMode = await this.getEndpoint(gatewayId, ENDPOINTS.HC_OPERATION_MODE);
      hc.heatCoolMode = await this.getEndpoint(gatewayId, ENDPOINTS.HC_HEAT_COOL_MODE);
    } catch { /* ignore */ }

    // Get DHW data
    try {
      const dhw = data.dhwCircuits![0];
      dhw.operationMode = await this.getEndpoint(gatewayId, ENDPOINTS.DHW_OPERATION_MODE);
      dhw.actualTemp = await this.getEndpoint(gatewayId, ENDPOINTS.DHW_ACTUAL_TEMP);
      dhw.currentSetpoint = await this.getEndpoint(gatewayId, ENDPOINTS.DHW_CURRENT_TEMP_LEVEL);
      dhw.temperatureLevelEco = await this.getEndpoint(gatewayId, ENDPOINTS.DHW_TEMP_LEVEL_ECO);
      dhw.temperatureLevelComfort = await this.getEndpoint(gatewayId, ENDPOINTS.DHW_TEMP_LEVEL_COMFORT);
      dhw.temperatureLevelEcoPlus = await this.getEndpoint(gatewayId, ENDPOINTS.DHW_TEMP_LEVEL_ECOPLUS);
      dhw.charge = await this.getEndpoint(gatewayId, ENDPOINTS.DHW_CHARGE);
      dhw.chargeDuration = await this.getEndpoint(gatewayId, ENDPOINTS.DHW_CHARGE_DURATION);
      dhw.remainingChargeTime = await this.getEndpoint(gatewayId, ENDPOINTS.DHW_REMAINING_CHARGE_TIME);
      await this.getEndpoint(gatewayId, ENDPOINTS.DHW_CHARGE_SETPOINT);
    } catch { /* ignore */ }

    // Get system modes
    try {
      data.systemModes!.outdoorTemperature = await this.getEndpoint(gatewayId, ENDPOINTS.OUTDOOR_TEMP);
    } catch { /* ignore */ }

    // Get heat source data
    try {
      const hs = data.heatSources![0];
      hs.actualSupply = await this.getEndpoint(gatewayId, ENDPOINTS.HEAT_SOURCE_SUPPLY_TEMP);
      hs.actualReturn = await this.getEndpoint(gatewayId, ENDPOINTS.HEAT_SOURCE_RETURN_TEMP);
      hs.modulation = await this.getEndpoint(gatewayId, ENDPOINTS.HEAT_SOURCE_MODULATION);
      hs.systemPressure = await this.getEndpoint(gatewayId, ENDPOINTS.HEAT_SOURCE_SYSTEM_PRESSURE);
      hs.heatDemand = await this.getEndpoint(gatewayId, ENDPOINTS.HEAT_SOURCE_HEAT_DEMAND);
      hs.workingTime = await this.getEndpoint(gatewayId, ENDPOINTS.HEAT_SOURCE_WORKING_TIME);
    } catch { /* ignore */ }

    return data;
  }

  async setHcRoomSetpoint(gatewayId: string, temperature: number): Promise<boolean> {
    return this.setEndpoint(gatewayId, ENDPOINTS.HC_MANUAL_SETPOINT, temperature);
  }

  async setDhwOperationMode(gatewayId: string, mode: string): Promise<boolean> {
    return this.setEndpoint(gatewayId, ENDPOINTS.DHW_OPERATION_MODE, mode);
  }

  async setDhwTemperatureLevel(gatewayId: string, level: 'eco' | 'comfort' | 'ecoPlus', temperature: number): Promise<boolean> {
    const endpoints: Record<string, string> = {
      eco: ENDPOINTS.DHW_TEMP_LEVEL_ECO,
      comfort: ENDPOINTS.DHW_TEMP_LEVEL_COMFORT,
      ecoPlus: ENDPOINTS.DHW_TEMP_LEVEL_ECOPLUS,
    };
    return this.setEndpoint(gatewayId, endpoints[level], temperature);
  }

  async setDhwCharge(gatewayId: string, charge: boolean): Promise<boolean> {
    return this.setEndpoint(gatewayId, ENDPOINTS.DHW_CHARGE, charge);
  }

  async setDhwChargeDuration(gatewayId: string, minutes: number): Promise<boolean> {
    return this.setEndpoint(gatewayId, ENDPOINTS.DHW_CHARGE_DURATION, minutes);
  }
}
