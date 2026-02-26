import type { ReactNode } from "react";

import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: string | number;
  icon?: ReactNode;
  trend?: string;
  accent?: "primary" | "success" | "danger" | "warning";
}

const accentMap: Record<
  NonNullable<StatCardProps["accent"]>,
  string
> = {
  primary: "text-primary",
  success: "text-success",
  danger: "text-danger",
  warning: "text-warning",
};

export default function StatCard({
  label,
  value,
  icon,
  trend,
  accent = "primary",
}: StatCardProps) {
  return (
    <Card className="card-hover p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            {label}
          </p>
          <p className="mt-2 text-2xl font-bold text-slate-900">{value}</p>
          {trend && (
            <p className={cn("mt-1 text-xs font-semibold", accentMap[accent])}>
              {trend}
            </p>
          )}
        </div>
        {icon && (
          <div
            className={cn(
              "flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100",
              accent === "primary" && "text-primary",
              accent === "success" && "text-success",
              accent === "danger" && "text-danger",
              accent === "warning" && "text-warning"
            )}
          >
            {icon}
          </div>
        )}
      </div>
    </Card>
  );
}
