import { OAuth2Device } from 'homey-oauth2app';
import type { BoschHomeComOAuth2Client } from '../../lib/BoschHomeComOAuth2Client';
import { HomeComApi } from '../../lib/api/HomeComApi';
import { DEFAULT_POLL_INTERVAL, ENDPOINTS } from '../../lib/utils/constants';

// Sentinel value for "open sensor" (no sensor connected)
const OPEN_SENSOR_VALUE = -32768;

// Threshold for system pressure low alarm (bar)
const SYSTEM_PRESSURE_LOW_THRESHOLD = 1.0;

interface K30K40Driver {
  systemPressureLowTrigger: { trigger: (device: K30K40Device, tokens: Record<string, unknown>) => Promise<void> };
}

class K30K40Device extends OAuth2Device<BoschHomeComOAuth2Client> {
  public api!: HomeComApi;
  public gatewayId!: string;
  private pollInterval: NodeJS.Timeout | null = null;
  private previousSystemPressure: number | null = null;
  private isSyncing: boolean = false;
  private isUpdatingFromSync: boolean = false;

  async onOAuth2Init(): Promise<void> {
    this.api = new HomeComApi(this.oAuth2Client);
    this.gatewayId = this.getStoreValue('gatewayId') as string;

    // Add new capabilities if not present (for devices paired before this update)
    const newCapabilities = [
      'dhw_boost',
      'measure_temperature.supply',
      'measure_temperature.return',
      'heat_cool_mode',
      'modulation',
      'system_pressure',
      'heat_demand',
      'working_hours',
      'dhw_charge_remaining',
    ];
    for (const cap of newCapabilities) {
      if (!this.hasCapability(cap)) {
        await this.addCapability(cap).catch(this.error);
      }
    }

    // Remove deprecated capabilities
    if (this.hasCapability('measure_humidity')) {
      await this.removeCapability('measure_humidity').catch(this.error);
    }
    if (this.hasCapability('alarm_generic.away')) {
      await this.removeCapability('alarm_generic.away').catch(this.error);
    }

    // Register capability listeners
    this.registerCapabilityListener<string>('thermostat_mode', this.onThermostatModeChanged.bind(this));
    this.registerCapabilityListener<number>('target_temperature', this.onTargetTemperatureChanged.bind(this));
    this.registerCapabilityListener<string>('dhw_operation_mode', this.onDhwModeChanged.bind(this));
    this.registerCapabilityListener<number>('target_temperature.dhw', this.onDhwTemperatureChanged.bind(this));
    this.registerCapabilityListener<boolean>('dhw_boost', this.onDhwBoostChanged.bind(this));

    // Initial sync
    await this.syncDeviceState();

    // Start polling
    this.startPolling();
  }

  async onOAuth2Deleted(): Promise<void> {
    this.stopPolling();
  }

  private startPolling(): void {
    const interval = (this.getSetting('poll_interval') as number) || DEFAULT_POLL_INTERVAL;
    this.pollInterval = setInterval(() => {
      this.syncDeviceState().catch(this.error);
    }, interval);
  }

  private stopPolling(): void {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
  }

  /**
   * Check if a sensor value is valid (not an "open sensor" sentinel)
   */
  private isValidSensorValue(value: number | undefined): boolean {
    return value !== undefined && value !== OPEN_SENSOR_VALUE;
  }

  /**
   * Map K30/K40 operation mode to Homey thermostat_mode
   */
  private mapOperationModeToHomey(operationMode: string): string {
    const modeMap: Record<string, string> = {
      manual: 'heat',
      auto: 'auto',
      off: 'off',
    };
    return modeMap[operationMode] || 'auto';
  }

  /**
   * Map Homey thermostat_mode to K30/K40 operation mode
   */
  private mapHomeyModeToOperation(homeyMode: string): string {
    const modeMap: Record<string, string> = {
      heat: 'manual',
      auto: 'auto',
      off: 'manual',
    };
    return modeMap[homeyMode] || 'auto';
  }

  private async syncDeviceState(): Promise<void> {
    if (this.isSyncing) {
      this.log(`[SYNC] syncDeviceState SKIPPED (already syncing)`);
      return;
    }

    this.isSyncing = true;
    this.isUpdatingFromSync = true;
    this.log(`[SYNC] syncDeviceState STARTED (isUpdatingFromSync=true)`);
    try {
      const data = await this.api.getK40Data(this.gatewayId);
      this.log(`[SYNC] Got data from API: dhwCircuits=${!!data.dhwCircuits}, heatingCircuits=${!!data.heatingCircuits}`);
      const driver = this.driver as unknown as K30K40Driver;

      // Update heating circuit data
      if (data.heatingCircuits?.[0]) {
        const hc = data.heatingCircuits[0];

        if (this.isValidSensorValue(hc.roomTemperature?.value)) {
          await this.setCapabilityValue('measure_temperature', hc.roomTemperature!.value).catch(this.error);
        }

        if (hc.heatCoolMode?.value) {
          await this.setCapabilityValue('heat_cool_mode', hc.heatCoolMode.value).catch(this.error);
        }

        if (hc.currentRoomSetpoint?.value !== undefined) {
          await this.setCapabilityValue('target_temperature', hc.currentRoomSetpoint.value).catch(this.error);
        } else if (hc.manualRoomSetpoint?.value !== undefined) {
          await this.setCapabilityValue('target_temperature', hc.manualRoomSetpoint.value).catch(this.error);
        }

        if (hc.operationMode?.value) {
          const homeyMode = this.mapOperationModeToHomey(hc.operationMode.value);
          await this.setCapabilityValue('thermostat_mode', homeyMode).catch(this.error);
        }
      }

      // Update DHW data
      if (data.dhwCircuits?.[0]) {
        const dhw = data.dhwCircuits[0];

        if (dhw.operationMode?.value) {
          await this.setCapabilityValue('dhw_operation_mode', dhw.operationMode.value).catch(this.error);
        }

        if (dhw.actualTemp?.value !== undefined) {
          await this.setCapabilityValue('measure_temperature.dhw', dhw.actualTemp.value).catch(this.error);
        }

        if (dhw.temperatureLevelEco?.value !== undefined) {
          await this.setCapabilityValue('target_temperature.dhw', dhw.temperatureLevelEco.value).catch(this.error);
        } else if (dhw.currentSetpoint?.value !== undefined) {
          await this.setCapabilityValue('target_temperature.dhw', dhw.currentSetpoint.value).catch(this.error);
        }

        if (dhw.charge?.value !== undefined) {
          const isCharging = dhw.charge.value === 'start';
          await this.setCapabilityValue('dhw_boost', isCharging).catch(this.error);
        }

        if (dhw.remainingChargeTime?.value !== undefined) {
          await this.setCapabilityValue('dhw_charge_remaining', dhw.remainingChargeTime.value).catch(this.error);
        }
      }

      // Update system modes
      if (data.systemModes?.outdoorTemperature?.value !== undefined) {
        await this.setCapabilityValue('measure_temperature.outdoor', data.systemModes.outdoorTemperature.value).catch(this.error);
      }

      // Update heat source data
      if (data.heatSources?.[0]) {
        const hs = data.heatSources[0];

        if (hs.actualSupply?.value !== undefined) {
          await this.setCapabilityValue('measure_temperature.supply', hs.actualSupply.value).catch(this.error);
        }

        if (hs.actualReturn?.value !== undefined) {
          await this.setCapabilityValue('measure_temperature.return', hs.actualReturn.value).catch(this.error);
        }

        if (hs.modulation?.value !== undefined) {
          await this.setCapabilityValue('modulation', hs.modulation.value).catch(this.error);
        }

        if (hs.systemPressure?.value !== undefined) {
          const newValue = hs.systemPressure.value;
          await this.setCapabilityValue('system_pressure', newValue).catch(this.error);
          // Check for low pressure alarm (special threshold trigger - keep manual)
          if (this.previousSystemPressure !== null &&
              this.previousSystemPressure >= SYSTEM_PRESSURE_LOW_THRESHOLD &&
              newValue < SYSTEM_PRESSURE_LOW_THRESHOLD) {
            await driver.systemPressureLowTrigger.trigger(this, { pressure: newValue }).catch(this.error);
          }
          this.previousSystemPressure = newValue;
        }

        const heatDemandRaw = hs.heatDemand as unknown as { values?: string[] } | undefined;
        if (heatDemandRaw?.values !== undefined) {
          const isActive = heatDemandRaw.values.length > 0 && heatDemandRaw.values[0] !== '';
          await this.setCapabilityValue('heat_demand', isActive).catch(this.error);
        }

        if (hs.workingTime?.value !== undefined) {
          const hours = Math.round(hs.workingTime.value / 3600);
          await this.setCapabilityValue('working_hours', hours).catch(this.error);
        }
      }

      await this.setAvailable();
      this.log(`[SYNC] syncDeviceState COMPLETED`);
    } catch (error) {
      this.error('Failed to sync device state:', error);

      // Check if this is an auth error
      const errorMessage = error instanceof Error ? error.message : String(error);
      const isAuthError = errorMessage.includes('401') ||
                          errorMessage.includes('403') ||
                          errorMessage.includes('Unauthorized') ||
                          errorMessage.includes('token') ||
                          errorMessage.includes('expired');

      if (isAuthError) {
        await this.setUnavailable('Authenticatie verlopen. Ga naar apparaat instellingen → Repareren om opnieuw in te loggen.');
      } else {
        await this.setUnavailable('Kan niet communiceren met apparaat');
      }
    } finally {
      this.isUpdatingFromSync = false;
      this.isSyncing = false;
      this.log(`[SYNC] syncDeviceState FINISHED (isUpdatingFromSync=false)`);
    }
  }

  private async onThermostatModeChanged(value: string): Promise<void> {
    if (this.isUpdatingFromSync) {
      return;
    }

    let success = false;
    if (value === 'off') {
      success = await this.api.setEndpoint(this.gatewayId, ENDPOINTS.HC_OPERATION_MODE, 'manual');
      if (success) {
        success = await this.api.setEndpoint(this.gatewayId, ENDPOINTS.HC_MANUAL_SETPOINT, 5);
      }
    } else if (value === 'heat') {
      success = await this.api.setEndpoint(this.gatewayId, ENDPOINTS.HC_OPERATION_MODE, 'manual');
    } else if (value === 'auto') {
      success = await this.api.setEndpoint(this.gatewayId, ENDPOINTS.HC_OPERATION_MODE, 'auto');
    }

    if (!success) {
      throw new Error(`Failed to set thermostat mode to ${value}`);
    }

    await this.syncDeviceState();
  }

  private async onTargetTemperatureChanged(value: number): Promise<void> {
    if (this.isUpdatingFromSync) {
      return;
    }

    const success = await this.api.setHcRoomSetpoint(this.gatewayId, value);
    if (!success) {
      throw new Error(`Failed to set target temperature to ${value}`);
    }
    await this.syncDeviceState();
  }

  private async onDhwModeChanged(value: string): Promise<void> {
    if (this.isUpdatingFromSync) {
      return;
    }

    const success = await this.api.setDhwOperationMode(this.gatewayId, value);
    if (!success) {
      throw new Error(`Failed to set DHW mode to ${value}`);
    }
    await this.syncDeviceState();

    const actualValue = this.getCapabilityValue('dhw_operation_mode');
    if (actualValue !== value) {
      throw new Error(`Failed to set DHW mode to ${value}`);
    }
  }

  private async onDhwTemperatureChanged(value: number): Promise<void> {
    if (this.isUpdatingFromSync) {
      return;
    }

    const success = await this.api.setDhwTemperatureLevel(this.gatewayId, 'eco', value);
    if (!success) {
      throw new Error(`Failed to set DHW temperature to ${value}`);
    }
    await this.syncDeviceState();
  }

  private async onDhwBoostChanged(value: boolean): Promise<void> {
    if (this.isUpdatingFromSync) {
      return;
    }

    if (value) {
      await this.startDhwCharge();
    } else {
      await this.stopDhwCharge();
    }
    await this.syncDeviceState();
  }

  async startDhwCharge(durationMinutes?: number): Promise<void> {
    this.log(`[API] startDhwCharge called with duration=${durationMinutes}`);
    if (durationMinutes !== undefined) {
      await this.api.setEndpoint(this.gatewayId, ENDPOINTS.DHW_CHARGE_DURATION, durationMinutes);
    }

    const success = await this.api.setEndpoint(this.gatewayId, ENDPOINTS.DHW_CHARGE, 'start');
    if (!success) {
      throw new Error('Failed to start DHW charge');
    }
    this.log(`[API] startDhwCharge SUCCESS`);
  }

  async stopDhwCharge(): Promise<void> {
    this.log(`[API] stopDhwCharge called`);
    const success = await this.api.setEndpoint(this.gatewayId, ENDPOINTS.DHW_CHARGE, 'stop');
    if (!success) {
      throw new Error('Failed to stop DHW charge');
    }
    this.log(`[API] stopDhwCharge SUCCESS`);
  }

  async startDhwChargeWithSettings(durationMinutes: number, temperature: number): Promise<void> {
    const durationSuccess = await this.api.setEndpoint(this.gatewayId, ENDPOINTS.DHW_CHARGE_DURATION, durationMinutes);
    if (!durationSuccess) {
      throw new Error('Failed to set charge duration');
    }

    const tempSuccess = await this.api.setEndpoint(this.gatewayId, ENDPOINTS.DHW_CHARGE_SETPOINT, temperature);
    if (!tempSuccess) {
      throw new Error('Failed to set charge temperature');
    }

    const chargeSuccess = await this.api.setEndpoint(this.gatewayId, ENDPOINTS.DHW_CHARGE, 'start');
    if (!chargeSuccess) {
      throw new Error('Failed to start DHW charge');
    }
  }

  async onSettings({
    newSettings,
  }: {
    oldSettings: Record<string, unknown>;
    newSettings: Record<string, unknown>;
    changedKeys: string[];
  }): Promise<void> {
    if (newSettings.poll_interval) {
      this.stopPolling();
      this.startPolling();
    }
  }

  /**
   * Trigger a capability listener programmatically (for flow actions)
   */
  async triggerCapabilityListener(capability: string, value: unknown): Promise<void> {
    if (capability === 'thermostat_mode') {
      await this.onThermostatModeChanged(value as string);
    } else if (capability === 'target_temperature') {
      await this.onTargetTemperatureChanged(value as number);
    } else if (capability === 'dhw_operation_mode') {
      await this.onDhwModeChanged(value as string);
    } else if (capability === 'target_temperature.dhw') {
      await this.onDhwTemperatureChanged(value as number);
    } else if (capability === 'dhw_boost') {
      await this.onDhwBoostChanged(value as boolean);
    }
  }
}

module.exports = K30K40Device;
