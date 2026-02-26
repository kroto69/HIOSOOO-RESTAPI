import { useEffect, useState } from "react";
import { RefreshCw, Zap } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import StatusBadge from "@/components/StatusBadge";
import type { OnuDetail } from "@/types/api";
import {
  formatSignal,
  formatUptime,
  getRxSignalTone,
  normalizeOnuStatus,
} from "@/lib/format";

interface OnuDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  detail?: OnuDetail;
  loading?: boolean;
  onRefresh?: () => void;
  refreshing?: boolean;
  onReboot?: () => void;
  rebooting?: boolean;
  onSaveName?: (name: string) => void;
  savingName?: boolean;
}

export default function OnuDetailDialog({
  open,
  onOpenChange,
  detail,
  loading,
  onRefresh,
  refreshing,
  onReboot,
  rebooting,
  onSaveName,
  savingName,
}: OnuDetailDialogProps) {
  const [nameValue, setNameValue] = useState("");

  useEffect(() => {
    if (open) {
      setNameValue(detail?.name || "");
    }
  }, [open, detail?.name]);

  const trimmedName = nameValue.trim();
  const canSave =
    !!onSaveName && !!detail && trimmedName !== (detail.name || "");
  const rxTone = getRxSignalTone(detail?.optical_module?.rx_power, detail?.status);
  const rxTextClass =
    rxTone === "success"
      ? "text-success"
      : rxTone === "warning"
        ? "text-warning"
        : rxTone === "danger"
          ? "text-danger"
          : "text-slate-900";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[92dvh] max-w-2xl flex-col overflow-hidden p-0">
        <div className="border-b border-slate-100 px-4 py-4 sm:px-6">
          <DialogHeader>
            <DialogTitle>ONU Detail</DialogTitle>
            <DialogDescription>
              Informasi ONU dan aksi cepat dalam satu panel.
            </DialogDescription>
          </DialogHeader>
        </div>
        {loading && (
          <div className="space-y-3 px-4 py-5 sm:px-6">
            <div className="h-4 w-1/3 animate-pulse rounded bg-slate-200" />
            <div className="h-4 w-2/3 animate-pulse rounded bg-slate-200" />
            <div className="h-32 animate-pulse rounded-xl bg-slate-100" />
          </div>
        )}
        {!loading && detail && (
          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4 sm:px-6">
            <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
              <div className="grid gap-3 text-sm sm:grid-cols-2">
                <div>
                  <p className="text-xs font-semibold uppercase text-slate-400">
                    ONU ID
                  </p>
                  <p className="mt-1 font-semibold text-slate-900">{detail.onu_id}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase text-slate-400">
                    Status
                  </p>
                  <div className="mt-1">
                    <StatusBadge status={normalizeOnuStatus(detail.status)} />
                  </div>
                </div>
                <div className="sm:col-span-2">
                  <p className="text-xs font-semibold uppercase text-slate-400">
                    MAC Address
                  </p>
                  <p className="mt-1 break-all font-semibold text-slate-900">
                    {detail.mac_address}
                  </p>
                </div>
                <div className="sm:col-span-2">
                  <p className="text-xs font-semibold uppercase text-slate-400">
                    Name
                  </p>
                  <Input
                    value={nameValue}
                    onChange={(event) => setNameValue(event.target.value)}
                    placeholder="Nama ONU"
                    className="mt-1"
                  />
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase text-slate-400">
                Optical Module
              </p>
              <div className="mt-3 grid grid-cols-2 gap-3">
                <div className="rounded-lg bg-white p-3">
                  <p className="text-[11px] uppercase text-slate-400">Rx Power</p>
                  <p className={["mt-1 font-semibold", rxTextClass].join(" ")}>
                    {formatSignal(detail.optical_module?.rx_power)}
                  </p>
                </div>
                <div className="rounded-lg bg-white p-3">
                  <p className="text-[11px] uppercase text-slate-400">Tx Power</p>
                  <p className="mt-1 font-semibold text-slate-900">
                    {formatSignal(detail.optical_module?.tx_power)}
                  </p>
                </div>
                <div className="rounded-lg bg-white p-3">
                  <p className="text-[11px] uppercase text-slate-400">Temperature</p>
                  <p className="mt-1 font-semibold text-slate-900">
                    {detail.optical_module?.temperature ?? "—"}
                  </p>
                </div>
                <div className="rounded-lg bg-white p-3">
                  <p className="text-[11px] uppercase text-slate-400">Bias Current</p>
                  <p className="mt-1 font-semibold text-slate-900">
                    {detail.optical_module?.bias_current ?? "—"}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase text-slate-400">
                Uptime History
              </p>
              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                <div className="rounded-lg bg-white p-3">
                  <p className="text-[11px] uppercase text-slate-400">First</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">
                    {formatUptime(detail.first_uptime)}
                  </p>
                </div>
                <div className="rounded-lg bg-white p-3">
                  <p className="text-[11px] uppercase text-slate-400">Last</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">
                    {formatUptime(detail.last_uptime)}
                  </p>
                </div>
                <div className="rounded-lg bg-white p-3">
                  <p className="text-[11px] uppercase text-slate-400">Last Off</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">
                    {formatUptime(detail.last_offtime)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
        {!loading && !detail && (
          <div className="px-4 py-5 text-sm text-slate-500 sm:px-6">
            No detail data.
          </div>
        )}
        <div className="border-t border-slate-100 bg-white px-4 py-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] sm:px-6">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="danger"
                  disabled={!onReboot || rebooting}
                  className="col-span-2 order-1 w-full sm:col-span-1 sm:order-3"
                >
                  <Zap className="h-4 w-4" />
                  {rebooting ? "Rebooting..." : "Reboot"}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Konfirmasi reboot ONU</AlertDialogTitle>
                  <AlertDialogDescription>
                    ONU akan di-reboot dan dapat menyebabkan downtime singkat.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Batal</AlertDialogCancel>
                  <AlertDialogAction onClick={onReboot}>Reboot</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            <Button
              onClick={() => onSaveName?.(trimmedName)}
              disabled={!canSave || savingName}
              className="order-2 w-full sm:order-1"
            >
              {savingName ? "Saving..." : "Save"}
            </Button>
            <Button
              variant="outline"
              onClick={onRefresh}
              disabled={loading || !onRefresh || refreshing}
              className="order-3 w-full sm:order-2"
            >
              <RefreshCw
                className={["h-4 w-4", refreshing ? "animate-spin" : ""].join(
                  " "
                )}
              />
              {refreshing ? "Refreshing..." : "Refresh"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
