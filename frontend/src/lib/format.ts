export function formatSignal(value?: number): string {
  if (value === undefined || Number.isNaN(value) || !Number.isFinite(value)) {
    return "—";
  }
  return `${value.toFixed(2)} dBm`;
}

export type RxSignalTone = "success" | "warning" | "danger" | "muted";

export function getRxSignalTone(value?: number, status?: string): RxSignalTone {
  const normalizedStatus = normalizeOnuStatus(status);
  if (normalizedStatus === "los") return "danger";

  if (value === undefined || Number.isNaN(value) || !Number.isFinite(value)) {
    return "muted";
  }

  // RX value biasanya negatif, jadi dipetakan berdasarkan loss absolut.
  const loss = Math.abs(value);
  if (loss <= 20) return "success";
  if (loss <= 25) return "warning";
  return "danger";
}

export function formatDistance(value?: number): string {
  if (value === undefined || Number.isNaN(value)) return "—";
  return `${value} m`;
}

export function formatUptime(value?: string): string {
  if (!value) return "—";
  return value;
}

export function titleCase(input: string): string {
  if (!input) return "";
  return input
    .split(/\s|_/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function formatStatus(status?: string): string {
  if (!status) return "Unknown";
  return titleCase(status);
}

export function normalizeOnuStatus(status?: string): string {
  const normalized = (status || "").toLowerCase();
  if (!normalized) return "unknown";
  if (normalized === "up" || normalized === "online") return "online";
  if (normalized === "down" || normalized === "offline") return "down";
  if (normalized === "poweroff" || normalized === "powerdown") return "powerdown";
  if (normalized === "los") return "los";
  return normalized;
}
