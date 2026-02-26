import axios from "axios";
import type {
  ApiResponse,
  AuthUser,
  Device,
  DeviceStatus,
  LoginResponse,
  Onu,
  OnuDetail,
  OnuTraffic,
  PonPort,
  SystemInfo,
} from "@/types/api";
import { useAuthStore } from "@/store/useAuthStore";

function resolveApiBaseUrl() {
  const configured = import.meta.env.VITE_API_BASE_URL?.trim();
  const browserHost =
    typeof window !== "undefined" ? window.location.hostname : "localhost";

  if (!configured) {
    return `http://${browserHost}:3000`;
  }

  try {
    const url = new URL(configured);
    const isLocalOnly =
      url.hostname === "localhost" || url.hostname === "127.0.0.1";
    const isRemoteBrowser =
      browserHost !== "localhost" && browserHost !== "127.0.0.1";

    // If dashboard is opened from another device, localhost must point to server host.
    if (isLocalOnly && isRemoteBrowser) {
      url.hostname = browserHost;
    }

    return url.toString().replace(/\/$/, "");
  } catch {
    return configured;
  }
}

const API_BASE_URL = resolveApiBaseUrl();

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
});

api.interceptors.request.use((request) => {
  const token = useAuthStore.getState().token;
  if (token) {
    if (request.headers && typeof request.headers.set === "function") {
      request.headers.set("Authorization", `Bearer ${token}`);
    } else {
      request.headers = {
        ...request.headers,
        Authorization: `Bearer ${token}`,
      };
    }
  }
  return request;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    if (status === 401) {
      useAuthStore.getState().clearSession();
      if (typeof window !== "undefined" && window.location.pathname !== "/login") {
        window.location.assign("/login");
      }
    }
    return Promise.reject(error);
  }
);

function unwrap<T>(response: ApiResponse<T>, fallback?: string): T {
  if (!response.success) {
    throw new Error(response.error || fallback || "Request failed");
  }
  if (response.data === undefined) {
    throw new Error(fallback || "Empty response data");
  }
  return response.data;
}

function unwrapVoid(response: ApiResponse<unknown>, fallback?: string): void {
  if (!response.success) {
    throw new Error(response.error || fallback || "Request failed");
  }
}

export function getApiErrorMessage(error: unknown, fallback = "Request failed"): string {
  if (axios.isAxiosError(error)) {
    if (!error.response) {
      return `Network error: tidak bisa terhubung ke ${API_BASE_URL}`;
    }
    const message = (error.response?.data as ApiResponse<unknown> | undefined)?.error;
    if (message) return message;
  }
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

export async function login(username: string, password: string): Promise<LoginResponse> {
  const { data } = await api.post<ApiResponse<LoginResponse>>("/api/v1/auth/login", {
    username,
    password,
  });
  return unwrap(data, "Failed to login");
}

export async function getMe(): Promise<AuthUser> {
  const { data } = await api.get<ApiResponse<AuthUser>>("/api/v1/auth/me");
  return unwrap(data, "Failed to fetch current user");
}

export async function changePassword(
  currentPassword: string,
  newPassword: string
): Promise<void> {
  const { data } = await api.post<ApiResponse<null>>("/api/v1/auth/change-password", {
    current_password: currentPassword,
    new_password: newPassword,
  });
  unwrapVoid(data, "Failed to update password");
}

export async function listUsers(): Promise<AuthUser[]> {
  const { data } = await api.get<ApiResponse<AuthUser[]>>("/api/v1/auth/users");
  return unwrap(data, "Failed to load users");
}

export async function createUser(payload: {
  username: string;
  password: string;
  role?: string;
}): Promise<AuthUser> {
  const { data } = await api.post<ApiResponse<AuthUser>>("/api/v1/auth/users", payload);
  return unwrap(data, "Failed to create user");
}

export async function resetUserPassword(
  userId: number,
  newPassword: string
): Promise<void> {
  const { data } = await api.put<ApiResponse<null>>(
    `/api/v1/auth/users/${userId}/password`,
    { new_password: newPassword }
  );
  unwrapVoid(data, "Failed to update user password");
}

export async function listDevices(): Promise<Device[]> {
  const { data } = await api.get<ApiResponse<Device[]>>("/api/v1/devices");
  return unwrap(data, "Failed to load devices");
}

export async function getDevice(id: string): Promise<Device> {
  const { data } = await api.get<ApiResponse<Device>>(`/api/v1/devices/${id}`);
  return unwrap(data, "Failed to load device");
}

export async function createDevice(payload: {
  id: string;
  name: string;
  base_url: string;
  port: number;
  username: string;
  password: string;
}): Promise<Device> {
  const { data } = await api.post<ApiResponse<Device>>(
    "/api/v1/devices",
    payload
  );
  return unwrap(data, "Failed to save device");
}

export async function updateDevice(
  id: string,
  payload: Partial<{
    name: string;
    base_url: string;
    port: number;
    username: string;
    password: string;
    status: string;
  }>
): Promise<Device> {
  const { data } = await api.put<ApiResponse<Device>>(
    `/api/v1/devices/${id}`,
    payload
  );
  return unwrap(data, "Failed to update device");
}

export async function deleteDevice(id: string): Promise<void> {
  const { data } = await api.delete<ApiResponse<null>>(`/api/v1/devices/${id}`);
  unwrapVoid(data, "Failed to delete device");
}

export async function getDeviceStatus(id: string): Promise<DeviceStatus> {
  const { data } = await api.get<ApiResponse<DeviceStatus>>(
    `/api/v1/devices/${id}/status`
  );
  return unwrap(data, "Failed to check device status");
}

export async function getPons(id: string): Promise<PonPort[]> {
  const { data } = await api.get<ApiResponse<PonPort[]>>(
    `/api/v1/devices/${id}/pons`
  );
  return unwrap(data, "Failed to load PON ports");
}

export async function getOnus(
  id: string,
  ponId: string,
  filter?: string
): Promise<Onu[]> {
  const params = new URLSearchParams({ pon_id: ponId });
  if (filter) {
    params.set("filter", filter);
  }
  const { data } = await api.get<ApiResponse<Onu[]>>(
    `/api/v1/devices/${id}/onus?${params.toString()}`
  );
  return unwrap(data, "Failed to load ONUs");
}

export async function getOnuDetail(
  id: string,
  onuId: string
): Promise<OnuDetail> {
  const normalized = simplifyOnuId(onuId);
  const { data } = await api.get<ApiResponse<OnuDetail>>(
    `/api/v1/devices/${id}/onus/${encodeURIComponent(normalized)}`
  );
  return unwrap(data, "Failed to load ONU detail");
}

export async function getOnuTraffic(
  id: string,
  onuId: string
): Promise<OnuTraffic> {
  const normalized = simplifyOnuId(onuId);
  const { data } = await api.get<ApiResponse<OnuTraffic>>(
    `/api/v1/devices/${id}/onus/${encodeURIComponent(normalized)}/traffic`
  );
  return unwrap(data, "Failed to load ONU traffic");
}

export async function rebootOnu(id: string, onuId: string): Promise<void> {
  const normalized = simplifyOnuId(onuId);
  const { data } = await api.post<ApiResponse<null>>(
    `/api/v1/devices/${id}/onus/${encodeURIComponent(normalized)}/action`,
    {
      action: "reboot",
    }
  );
  unwrap(data, "Failed to reboot ONU");
}

export async function updateOnuName(
  id: string,
  onuId: string,
  name: string
): Promise<void> {
  const normalized = simplifyOnuId(onuId);
  const { data } = await api.put<ApiResponse<null>>(
    `/api/v1/devices/${id}/onus/${encodeURIComponent(normalized)}`,
    { name }
  );
  unwrap(data, "Failed to update ONU name");
}

export async function getSystemInfo(id: string): Promise<SystemInfo> {
  const { data } = await api.get<ApiResponse<SystemInfo>>(
    `/api/v1/devices/${id}/system`
  );
  return unwrap(data, "Failed to load system info");
}

export function normalizeBaseUrl(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return trimmed;
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }
  return `http://${trimmed}`;
}

export function displayHost(baseUrl: string): string {
  return baseUrl.replace(/^https?:\/\//, "");
}

export function simplifyOnuId(onuId: string): string {
  if (!onuId) return onuId;
  const trimmed = onuId.trim();
  const segment = trimmed.includes("/") ? trimmed.split("/").pop() || trimmed : trimmed;
  if (segment.includes(":")) {
    const [pon, onu] = segment.split(":");
    const ponNum = Number.parseInt(pon, 10);
    const onuNum = Number.parseInt(onu, 10);
    if (!Number.isNaN(ponNum) && !Number.isNaN(onuNum)) {
      return `${ponNum}:${onuNum}`;
    }
  }
  return segment;
}
