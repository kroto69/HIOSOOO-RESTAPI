export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
  device_id?: string;
  timestamp?: string;
}

export interface Device {
  id: string;
  name: string;
  base_url: string;
  port: number;
  username?: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface DeviceStatus {
  device_id: string;
  name: string;
  base_url: string;
  reachable: boolean;
  checked_at: string;
  error?: string;
}

export interface PonPort {
  pon_id: string;
  full_id: string;
  info: string;
}

export interface OnuMetrics {
  temperature: number;
  voltage: number;
  current: number;
  tx_power: number;
  rx_power: number;
}

export interface Onu {
  onu_id: string;
  name: string;
  mac_address: string;
  status: string;
  fw_version: string;
  chip_id: string;
  ports: number;
  distance_meters: number;
  ctc_status: string;
  ctc_version: string;
  is_activated: boolean;
  metrics: OnuMetrics;
}

export interface OpticalModuleInfo {
  temperature: number;
  voltage: number;
  bias_current: number;
  tx_power: number;
  rx_power: number;
}

export interface OnuDetail {
  onu_id: string;
  name: string;
  mac_address: string;
  status: string;
  fw_version: string;
  chip_id: string;
  ports: number;
  first_uptime: string;
  last_uptime: string;
  last_offtime: string;
  is_activated: boolean;
  optical_module?: OpticalModuleInfo;
}

export interface SystemInfo {
  system_name: string;
  switch_type: string;
  software_version: string;
  mac_address: string;
  ip_address: string;
  uptime: string;
  run_time?: string;
}

export interface OnuTraffic {
  port_id: string;
  rx_bytes: number;
  rx_unicast: number;
  rx_broadcast: number;
  rx_multicast: number;
  rx_error: number;
  tx_bytes: number;
  tx_unicast: number;
  tx_broadcast: number;
  tx_multicast: number;
  tx_error: number;
}

export interface AuthUser {
  id: number;
  username: string;
  role: string;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
  expires_at: string;
  user: AuthUser;
}
