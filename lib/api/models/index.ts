// Connection and Authentication Types
export interface ConnectionOptions {
  token?: string;
  refreshToken?: string;
}

// Device Types
export type DeviceType = 'k40' | 'k30' | 'generic';

// Base Gateway/Device Response
export interface Gateway {
  // API returns deviceId, but some responses use gatewayId
  deviceId?: string;
  gatewayId?: string;
  serialNumber?: string;
  name?: string;
  deviceType?: string;
  online?: boolean;
}

export interface GatewayListResponse {
  gateways: Gateway[];
}

// Generic API Response
export interface ApiResponse<T = unknown> {
  id?: string;
  type?: string;
  value?: T;
  writeable?: boolean;
  recordable?: boolean;
  used?: boolean;
  minValue?: number;
  maxValue?: number;
  allowedValues?: string[];
  stepSize?: number;
  unitOfMeasure?: string;
}

// Firmware Response
export interface FirmwareInfo {
  value: string;
}

// Notification
export interface Notification {
  id: string;
  type: string;
  timestamp: string;
  message?: string;
}

// K40/K30 (Heating) Types
export interface HeatingCircuit {
  operationMode?: ApiResponse<string> | null;
  controlType?: ApiResponse<string> | null;
  summerWinter?: ApiResponse<string> | null;
  heatCoolMode?: ApiResponse<string> | null;
  roomTemperature?: ApiResponse<number> | null;
  roomHumidity?: ApiResponse<number> | null;
  currentRoomSetpoint?: ApiResponse<number> | null;
  manualRoomSetpoint?: ApiResponse<number> | null;
  coolingRoomSetpoint?: ApiResponse<number> | null;
}

export interface DhwCircuit {
  operationMode?: ApiResponse<string> | null;
  currentSetpoint?: ApiResponse<number> | null;
  actualTemp?: ApiResponse<number> | null;
  temperatureLevelEco?: ApiResponse<number> | null;
  temperatureLevelComfort?: ApiResponse<number> | null;
  temperatureLevelEcoPlus?: ApiResponse<number> | null;
  charge?: ApiResponse<string> | null;  // "start" or "stop"
  chargeDuration?: ApiResponse<number> | null;
  remainingChargeTime?: ApiResponse<number> | null;
}

export interface HeatSource {
  type?: ApiResponse<string> | null;
  pumpType?: ApiResponse<string> | null;
  numberOfStarts?: ApiResponse<number> | null;
  workingTime?: ApiResponse<number> | null;
  heatDemand?: ApiResponse<boolean> | null;
  modulation?: ApiResponse<number> | null;
  systemPressure?: ApiResponse<number> | null;
  actualReturn?: ApiResponse<number> | null;
  actualSupply?: ApiResponse<number> | null;
  brineInflow?: ApiResponse<number> | null;
  brineOutflow?: ApiResponse<number> | null;
}

export interface SystemModes {
  holidayMode?: ApiResponse<{
    activated?: boolean;
    start?: string;
    end?: string;
  }> | null;
  powerLimitation?: ApiResponse<number> | null;
  outdoorTemperature?: ApiResponse<number> | null;
}

export interface K40DeviceData {
  device?: Gateway;
  firmware?: FirmwareInfo;
  notifications?: Notification[];
  heatingCircuits?: HeatingCircuit[];
  dhwCircuits?: DhwCircuit[];
  heatSources?: HeatSource[];
  systemModes?: SystemModes;
}

// Bulk Request/Response
export interface BulkRequest {
  resourcePaths: string[];
}

export interface BulkResponseItem {
  path: string;
  gatewayResponse: ApiResponse;
}

export interface BulkResponse {
  resourcePaths: BulkResponseItem[];
}

// Error Response
export interface ApiErrorResponse {
  error?: string;
  errorDescription?: string;
  statusCode?: number;
}
