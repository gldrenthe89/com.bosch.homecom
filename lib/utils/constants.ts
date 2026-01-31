// OAuth2 Configuration (from homecom_alt library)
export const OAUTH_DOMAIN = 'https://singlekey-id.com';
export const OAUTH_AUTH_PATH = '/auth/connect/authorize';
export const OAUTH_TOKEN_PATH = '/auth/connect/token';
export const OAUTH_CLIENT_ID = '762162C0-FA2D-4540-AE66-6489F189FADC';
export const OAUTH_REDIRECT_URI = 'com.bosch.tt.dashtt.pointt://app/login';
export const OAUTH_SCOPE = 'openid email profile offline_access pointt.gateway.claiming pointt.gateway.removal pointt.gateway.list pointt.gateway.users pointt.gateway.resource.dashapp pointt.castt.flow.token-exchange bacon hcc.tariff.read';

// Fixed PKCE code_verifier from homecom_alt (used for browser-based auth)
export const OAUTH_BROWSER_VERIFIER = 'AZbpLzMvXigq_jz7_riwNDV8BQYT30prXGDyRHdQMo0GYre3si9YJfG4b1U-QWERtOiX_9mCJE2SAPvJMeM2yA';

// Pre-computed code_challenge for OAUTH_BROWSER_VERIFIER (S256)
export const OAUTH_BROWSER_CHALLENGE = 'Fc6eY3uMBJkFqa4VqcULuLuKC5Do70XMw7oa_Pxafw0';

// Bosch API Configuration
export const BOSCHCOM_DOMAIN = 'https://pointt-api.bosch-thermotechnology.com';
export const BOSCHCOM_GATEWAYS_PATH = '/pointt-api/api/v1/gateways/';
export const BOSCHCOM_BULK_PATH = '/pointt-api/api/v1/bulk';

// Device Endpoints
export const ENDPOINTS = {
  // System
  FIRMWARE: '/resource/gateway/versionFirmware',
  SYSTEM_INFO: '/resource/system/info',
  NOTIFICATIONS: '/resource/notifications',

  // Heating Circuits
  HC_LIST: '/resource/heatingCircuits',
  HC_OPERATION_MODE: '/resource/heatingCircuits/hc1/operationMode',
  HC_CONTROL_TYPE: '/resource/heatingCircuits/hc1/controlType',
  HC_SUMMER_WINTER: '/resource/heatingCircuits/hc1/currentSuWiMode',
  HC_HEAT_COOL_MODE: '/resource/heatingCircuits/hc1/heatCoolMode',
  HC_ROOM_TEMP: '/resource/heatingCircuits/hc1/roomtemperature',
  HC_ROOM_HUMIDITY: '/resource/heatingCircuits/hc1/actualHumidity',
  HC_CURRENT_SETPOINT: '/resource/heatingCircuits/hc1/currentRoomSetpoint',
  HC_MANUAL_SETPOINT: '/resource/heatingCircuits/hc1/manualRoomSetpoint',
  HC_COOLING_SETPOINT: '/resource/heatingCircuits/hc1/cooling/roomTempSetpoint',

  // DHW Circuits
  DHW_LIST: '/resource/dhwCircuits',
  DHW_OPERATION_MODE: '/resource/dhwCircuits/dhw1/operationMode',
  DHW_CURRENT_TEMP_LEVEL: '/resource/dhwCircuits/dhw1/currentTemperatureLevel',
  DHW_TEMP_LEVEL_ECO: '/resource/dhwCircuits/dhw1/temperatureLevels/eco',
  DHW_TEMP_LEVEL_COMFORT: '/resource/dhwCircuits/dhw1/temperatureLevels/comfort',
  DHW_TEMP_LEVEL_ECOPLUS: '/resource/dhwCircuits/dhw1/temperatureLevels/eco+',
  DHW_ACTUAL_TEMP: '/resource/dhwCircuits/dhw1/actualTemp',
  DHW_CHARGE: '/resource/dhwCircuits/dhw1/charge',
  DHW_CHARGE_DURATION: '/resource/dhwCircuits/dhw1/chargeDuration',
  DHW_REMAINING_CHARGE_TIME: '/resource/dhwCircuits/dhw1/chargeRemainingTime',
  DHW_CHARGE_SETPOINT: '/resource/dhwCircuits/dhw1/singleChargeSetpoint',

  // System Modes
  HOLIDAY_MODE: '/resource/holidayMode/activeModes',
  POWER_LIMITATION: '/resource/system/powerLimitation/active',
  OUTDOOR_TEMP: '/resource/system/sensors/temperatures/outdoor_t1',

  // Heat Sources
  HEAT_SOURCE_TOTAL_CONSUMPTION: '/resource/heatSources/emon/totalConsumption',
  HEAT_SOURCE_SUPPLY_TEMP: '/resource/heatSources/actualSupplyTemperature',
  HEAT_SOURCE_RETURN_TEMP: '/resource/heatSources/returnTemperature',
  HEAT_SOURCE_MODULATION: '/resource/heatSources/actualModulation',
  HEAT_SOURCE_SYSTEM_PRESSURE: '/resource/heatSources/systemPressure',
  HEAT_SOURCE_HEAT_DEMAND: '/resource/heatSources/actualHeatDemand',
  HEAT_SOURCE_TYPE: '/resource/heatSources/hs1/type',
  HEAT_SOURCE_PUMP_TYPE: '/resource/heatSources/hs1/heatPumpType',
  HEAT_SOURCE_STARTS: '/resource/heatSources/hs1/numberOfStarts',
  HEAT_SOURCE_WORKING_TIME: '/resource/heatSources/workingTime/totalSystem',
} as const;

// Default values
export const DEFAULT_TIMEOUT = 15000;
export const DEFAULT_POLL_INTERVAL = 60000; // 60 seconds
export const MIN_POLL_INTERVAL = 15000; // 15 seconds

// Device Types
export const DEVICE_TYPES = {
  K40: 'k40',
  K30: 'k30',
} as const;

// DHW Operation Modes (matches Bosch K30 API values)
export const DHW_OPERATION_MODES = {
  OFF: 'Off',
  ECO: 'eco',
  LOW: 'low',
  HIGH: 'high',
  OWN_PROGRAM: 'ownprogram',
} as const;

// K30/K40 HVAC Modes
export const K30_HVAC_MODES = {
  MANUAL: 'manual',
  AUTO: 'auto',
} as const;
