import { OAuth2Driver } from 'homey-oauth2app';
import type { FlowCardTriggerDevice } from 'homey';
import { BoschHomeComOAuth2Client } from '../../lib/BoschHomeComOAuth2Client';
import { HomeComApi } from '../../lib/api/HomeComApi';

interface StoredToken {
  access_token: string;
  refresh_token?: string;
  token_type?: string;
  expires_in?: number;
}

interface BoschHomeComApp {
  storeToken(token: StoredToken): void;
  getStoredToken(): StoredToken | null;
  getAccessToken(): string | null;
  hasValidToken(): boolean;
  clearToken(): void;
}

interface K30K40Device {
  api: HomeComApi;
  gatewayId: string;
  getCapabilityValue(capability: string): unknown;
  setCapabilityValue(capability: string, value: unknown): Promise<void>;
  startDhwCharge(durationMinutes?: number): Promise<void>;
  stopDhwCharge(): Promise<void>;
  triggerCapabilityListener(capability: string, value: unknown): Promise<void>;
}

interface PairSession {
  emit(event: string, data: unknown, callback: (err: Error | null, result?: unknown) => void): void;
  setHandler(event: string, handler: (data?: unknown) => Promise<unknown>): void;
  nextView(): Promise<void>;
  showView(viewId: string): Promise<void>;
}

class K30K40Driver extends OAuth2Driver<BoschHomeComOAuth2Client> {
  // Flow trigger cards
  public temperatureChangedTrigger!: FlowCardTriggerDevice;
  public outdoorTemperatureChangedTrigger!: FlowCardTriggerDevice;
  public dhwTemperatureChangedTrigger!: FlowCardTriggerDevice;
  public supplyTemperatureChangedTrigger!: FlowCardTriggerDevice;
  public returnTemperatureChangedTrigger!: FlowCardTriggerDevice;
  public heatDemandTrueTrigger!: FlowCardTriggerDevice;
  public heatDemandFalseTrigger!: FlowCardTriggerDevice;
  public dhwBoostTrueTrigger!: FlowCardTriggerDevice;
  public dhwBoostFalseTrigger!: FlowCardTriggerDevice;
  public thermostatModeChangedTrigger!: FlowCardTriggerDevice;
  public heatCoolModeChangedTrigger!: FlowCardTriggerDevice;
  public dhwModeChangedTrigger!: FlowCardTriggerDevice;
  public modulationChangedTrigger!: FlowCardTriggerDevice;
  public systemPressureChangedTrigger!: FlowCardTriggerDevice;
  public systemPressureLowTrigger!: FlowCardTriggerDevice;

  async onOAuth2Init(): Promise<void> {
    // Register Flow trigger cards
    this.temperatureChangedTrigger = this.homey.flow.getDeviceTriggerCard('temperature_changed');
    this.outdoorTemperatureChangedTrigger = this.homey.flow.getDeviceTriggerCard('outdoor_temperature_changed');
    this.dhwTemperatureChangedTrigger = this.homey.flow.getDeviceTriggerCard('dhw_temperature_changed');
    this.supplyTemperatureChangedTrigger = this.homey.flow.getDeviceTriggerCard('supply_temperature_changed');
    this.returnTemperatureChangedTrigger = this.homey.flow.getDeviceTriggerCard('return_temperature_changed');
    this.heatDemandTrueTrigger = this.homey.flow.getDeviceTriggerCard('heat_demand_true');
    this.heatDemandFalseTrigger = this.homey.flow.getDeviceTriggerCard('heat_demand_false');
    this.dhwBoostTrueTrigger = this.homey.flow.getDeviceTriggerCard('dhw_boost_true');
    this.dhwBoostFalseTrigger = this.homey.flow.getDeviceTriggerCard('dhw_boost_false');
    this.thermostatModeChangedTrigger = this.homey.flow.getDeviceTriggerCard('thermostat_mode_changed');
    this.heatCoolModeChangedTrigger = this.homey.flow.getDeviceTriggerCard('heat_cool_mode_changed');
    this.dhwModeChangedTrigger = this.homey.flow.getDeviceTriggerCard('dhw_mode_changed');
    this.modulationChangedTrigger = this.homey.flow.getDeviceTriggerCard('modulation_changed');
    this.systemPressureChangedTrigger = this.homey.flow.getDeviceTriggerCard('system_pressure_changed');
    this.systemPressureLowTrigger = this.homey.flow.getDeviceTriggerCard('system_pressure_low');

    // Register Flow action cards
    this.homey.flow.getActionCard('set_dhw_mode')
      .registerRunListener(async (args: { device: K30K40Device; dhw_mode: string }) => {
        await args.device.api.setDhwOperationMode(args.device.gatewayId, args.dhw_mode);
        await args.device.setCapabilityValue('dhw_operation_mode', args.dhw_mode);
      });

    this.homey.flow.getActionCard('dhw_charge_start')
      .registerRunListener(async (args: { device: K30K40Device; duration: number }) => {
        await args.device.startDhwCharge(args.duration);
      });

    this.homey.flow.getActionCard('dhw_charge_stop')
      .registerRunListener(async (args: { device: K30K40Device }) => {
        await args.device.stopDhwCharge();
      });

    // Register Flow condition cards
    this.homey.flow.getConditionCard('dhw_mode_is')
      .registerRunListener(async (args: { device: K30K40Device; dhw_mode: string }) => {
        return args.device.getCapabilityValue('dhw_operation_mode') === args.dhw_mode;
      });

    // Temperature conditions
    this.homey.flow.getConditionCard('temperature_above')
      .registerRunListener(async (args: { device: K30K40Device; temperature: number }) => {
        const current = args.device.getCapabilityValue('measure_temperature') as number;
        return current > args.temperature;
      });

    this.homey.flow.getConditionCard('outdoor_temperature_above')
      .registerRunListener(async (args: { device: K30K40Device; temperature: number }) => {
        const current = args.device.getCapabilityValue('measure_temperature.outdoor') as number;
        return current > args.temperature;
      });

    this.homey.flow.getConditionCard('dhw_temperature_above')
      .registerRunListener(async (args: { device: K30K40Device; temperature: number }) => {
        const current = args.device.getCapabilityValue('measure_temperature.dhw') as number;
        return current > args.temperature;
      });

    // Status conditions
    this.homey.flow.getConditionCard('heat_demand_is')
      .registerRunListener(async (args: { device: K30K40Device }) => {
        return args.device.getCapabilityValue('heat_demand') === true;
      });

    this.homey.flow.getConditionCard('dhw_boost_is')
      .registerRunListener(async (args: { device: K30K40Device }) => {
        return args.device.getCapabilityValue('dhw_boost') === true;
      });

    this.homey.flow.getConditionCard('thermostat_mode_is')
      .registerRunListener(async (args: { device: K30K40Device; mode: string }) => {
        return args.device.getCapabilityValue('thermostat_mode') === args.mode;
      });

    this.homey.flow.getConditionCard('heat_cool_mode_is')
      .registerRunListener(async (args: { device: K30K40Device; mode: string }) => {
        return args.device.getCapabilityValue('heat_cool_mode') === args.mode;
      });

    // System conditions
    this.homey.flow.getConditionCard('modulation_above')
      .registerRunListener(async (args: { device: K30K40Device; modulation: number }) => {
        const current = args.device.getCapabilityValue('modulation') as number;
        return current > args.modulation;
      });

    this.homey.flow.getConditionCard('system_pressure_above')
      .registerRunListener(async (args: { device: K30K40Device; pressure: number }) => {
        const current = args.device.getCapabilityValue('system_pressure') as number;
        return current > args.pressure;
      });

    // Register new action cards
    this.homey.flow.getActionCard('set_thermostat_mode')
      .registerRunListener(async (args: { device: K30K40Device; mode: string }) => {
        await args.device.triggerCapabilityListener('thermostat_mode', args.mode);
      });

    this.homey.flow.getActionCard('set_target_temperature')
      .registerRunListener(async (args: { device: K30K40Device; temperature: number }) => {
        await args.device.triggerCapabilityListener('target_temperature', args.temperature);
      });
  }

  async onPair(session: PairSession): Promise<void> {
    const app = this.homey.app as unknown as BoschHomeComApp;
    let oAuth2Client: BoschHomeComOAuth2Client | null = null;
    let accessToken: string | null = null;
    let OAuth2SessionId: string | null = null;
    let OAuth2ConfigId: string | null = null;

    const createClientWithStoredToken = async (): Promise<boolean> => {
      const storedToken = app.getStoredToken();
      if (!storedToken?.access_token) return false;

      try {
        OAuth2ConfigId = this.getOAuth2ConfigId();
        OAuth2SessionId = Math.random().toString(36).substring(2);

        oAuth2Client = await this.homey.app.createOAuth2Client({
          sessionId: OAuth2SessionId,
          configId: OAuth2ConfigId,
        }) as BoschHomeComOAuth2Client;

        const { OAuth2Token } = require('homey-oauth2app');
        const token = new OAuth2Token({
          access_token: storedToken.access_token,
          refresh_token: storedToken.refresh_token,
          token_type: storedToken.token_type || 'Bearer',
          expires_in: storedToken.expires_in,
        });

        (oAuth2Client as any).setToken({ token });
        await oAuth2Client.save();

        accessToken = storedToken.access_token;
        return true;
      } catch (error) {
        this.error('Failed to create OAuth2Client with stored token:', error);
        return false;
      }
    };

    session.setHandler('checkToken', async () => {
      if (app.hasValidToken()) {
        const success = await createClientWithStoredToken();
        if (success) {
          return { hasToken: true };
        }
      }
      return { hasToken: false };
    });

    session.setHandler('getAuthUrl', async () => {
      OAuth2ConfigId = this.getOAuth2ConfigId();
      OAuth2SessionId = Math.random().toString(36).substring(2);

      oAuth2Client = await this.homey.app.createOAuth2Client({
        sessionId: OAuth2SessionId,
        configId: OAuth2ConfigId,
      }) as BoschHomeComOAuth2Client;

      return oAuth2Client.getManualAuthorizationUrl();
    });

    session.setHandler('login', async (data) => {
      if (!oAuth2Client) {
        throw new Error('OAuth2 client not initialized');
      }

      const loginData = data as { code: string };
      const code = loginData.code.trim();
      if (!code) {
        throw new Error('Authorization code is required');
      }

      try {
        const token = await oAuth2Client.exchangeCodeForToken(code);
        accessToken = token.access_token;
        app.storeToken(token);

        (oAuth2Client as any).setToken({ token });
        await oAuth2Client.save();
        return true;
      } catch (error) {
        this.error('Login failed:', error);
        throw error;
      }
    });

    session.setHandler('list_devices', async () => {
      if (!accessToken) {
        accessToken = app.getAccessToken();
      }

      if (!accessToken) {
        throw new Error('Not logged in');
      }

      try {
        const api = new HomeComApi(accessToken);
        const gateways = await api.getDevices();

        const devices: Array<{
          name: string;
          data: { id: string };
          store: { gatewayId: string; OAuth2SessionId: string; OAuth2ConfigId: string };
        }> = [];

        for (const gateway of gateways) {
          let deviceType = gateway.deviceType || 'generic';
          if (deviceType === 'generic') {
            deviceType = await api.getDeviceType(gateway.gatewayId);
          }

          if (deviceType === 'k40' || deviceType === 'k30') {
            devices.push({
              name: gateway.name || `Bosch Heat Pump ${gateway.gatewayId.slice(-4)}`,
              data: {
                id: gateway.gatewayId,
              },
              store: {
                gatewayId: gateway.gatewayId,
                OAuth2SessionId: OAuth2SessionId || 'stored',
                OAuth2ConfigId: OAuth2ConfigId || this.getOAuth2ConfigId(),
              },
            });
          }
        }

        return devices;
      } catch (error) {
        this.error('Failed to list devices:', error);
        throw error;
      }
    });
  }

  async onPairListDevices({ oAuth2Client }: { oAuth2Client: BoschHomeComOAuth2Client }): Promise<
    Array<{
      name: string;
      data: { id: string };
      store: { gatewayId: string };
    }>
  > {
    const api = new HomeComApi(oAuth2Client);
    const gateways = await api.getDevices();

    const devices: Array<{
      name: string;
      data: { id: string };
      store: { gatewayId: string };
    }> = [];

    for (const gateway of gateways) {
      let deviceType = gateway.deviceType || 'generic';
      if (deviceType === 'generic') {
        deviceType = await api.getDeviceType(gateway.gatewayId);
      }

      if (deviceType === 'k40' || deviceType === 'k30') {
        devices.push({
          name: gateway.name || `Bosch Heat Pump ${gateway.gatewayId.slice(-4)}`,
          data: {
            id: gateway.gatewayId,
          },
          store: {
            gatewayId: gateway.gatewayId,
          },
        });
      }
    }

    return devices;
  }
}

module.exports = K30K40Driver;
