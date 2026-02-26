import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const statusMap: Record<
  string,
  { label: string; variant: "success" | "danger" | "warning" | "info" }
> = {
  online: { label: "Online", variant: "success" },
  up: { label: "Online", variant: "success" },
  reachable: { label: "Online", variant: "success" },
  offline: { label: "Down", variant: "danger" },
  down: { label: "Down", variant: "danger" },
  los: { label: "LOS", variant: "danger" },
  poweroff: { label: "Powerdown", variant: "warning" },
  powerdown: { label: "Powerdown", variant: "warning" },
  unknown: { label: "Unknown", variant: "info" },
};

export default function StatusBadge({ status }: { status?: string }) {
  const normalized = status?.toLowerCase() || "unknown";
  const mapped = statusMap[normalized] || statusMap.unknown;
  const isOnline = normalized === "online" || normalized === "reachable";
  return (
    <Badge variant={mapped.variant} className="gap-2">
      <span
        className={cn(
          isOnline ? "status-pulse" : "inline-flex h-2.5 w-2.5 rounded-full",
          mapped.variant === "success" && "text-success bg-success",
          mapped.variant === "danger" && "text-danger bg-danger",
          mapped.variant === "warning" && "text-warning bg-warning",
          mapped.variant === "info" && "text-primary bg-primary"
        )}
      />
      {mapped.label}
    </Badge>
  );
}
