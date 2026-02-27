import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Loader2, ShieldAlert } from "lucide-react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { checkDeviceConnection, normalizeBaseUrl } from "@/lib/api";

export interface DeviceFormValues {
  name: string;
  ip: string;
  port: number;
  model: string;
  username: string;
  password: string;
}

interface DeviceFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial?: Partial<DeviceFormValues>;
  submitLabel: string;
  requireConnectionCheck?: boolean;
  loading?: boolean;
  onSubmit: (values: DeviceFormValues) => void;
}

const defaultValues: DeviceFormValues = {
  name: "",
  ip: "",
  port: 80,
  model: "",
  username: "",
  password: "",
};

export default function DeviceFormDialog({
  open,
  onOpenChange,
  initial,
  submitLabel,
  requireConnectionCheck = false,
  loading,
  onSubmit,
}: DeviceFormDialogProps) {
  const [values, setValues] = useState<DeviceFormValues>(defaultValues);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [checkingConnection, setCheckingConnection] = useState(false);
  const [connectionState, setConnectionState] = useState<
    "idle" | "success" | "error"
  >("idle");
  const [connectionMessage, setConnectionMessage] = useState("");
  const [lastCheckedSignature, setLastCheckedSignature] = useState("");

  const isUpdateMode = useMemo(
    () => submitLabel.toLowerCase().includes("update"),
    [submitLabel]
  );

  useEffect(() => {
    if (open) {
      setValues({ ...defaultValues, ...initial });
      setErrors({});
      setCheckingConnection(false);
      setConnectionState("idle");
      setConnectionMessage("");
      setLastCheckedSignature("");
    }
  }, [open, initial]);

  const handleChange = (field: keyof DeviceFormValues, value: string) => {
    setValues((prev) => {
      const next = {
        ...prev,
        [field]: field === "port" ? Number(value) : value,
      };

      const nextSignature = buildConnectionSignature(next);
      if (nextSignature !== lastCheckedSignature) {
        setConnectionState("idle");
        setConnectionMessage("");
      }

      return next;
    });
  };

  const validateAndNormalize = () => {
    const nextErrors: Record<string, string> = {};
    if (!values.name.trim()) nextErrors.name = "Nama wajib diisi";
    if (!values.ip.trim()) nextErrors.ip = "IP wajib diisi";
    if (!values.username.trim()) nextErrors.username = "Username wajib diisi";

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return null;
    }

    const normalized = normalizeBaseUrl(values.ip);
    let baseUrl = normalized;
    let port = values.port || 80;
    try {
      const parsed = new URL(normalized);
      baseUrl = `${parsed.protocol}//${parsed.hostname}`;
      if (parsed.port) {
        port = Number(parsed.port);
      }
    } catch {
      // Keep normalized base URL if parsing fails.
    }

    const payload: DeviceFormValues = {
      ...values,
      ip: baseUrl,
      port,
    };

    setErrors({});
    return payload;
  };

  const runConnectionCheck = async (payload: DeviceFormValues) => {
    setCheckingConnection(true);
    setConnectionState("idle");
    setConnectionMessage("");

    try {
      const result = await checkDeviceConnection({
        base_url: payload.ip,
        port: payload.port,
        username: payload.username,
        password: payload.password,
      });

      const success = Boolean(result.reachable) && (!result.auth_checked || Boolean(result.authenticated));
      const message = success
        ? "Koneksi OLT berhasil."
        : result.error || "Koneksi gagal.";

      setConnectionState(success ? "success" : "error");
      setConnectionMessage(message);
      setLastCheckedSignature(buildConnectionSignature(payload));

      if (success) {
        toast.success(message);
      } else {
        toast.error(message);
      }

      return success;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Gagal cek koneksi OLT";
      setConnectionState("error");
      setConnectionMessage(message);
      toast.error(message);
      return false;
    } finally {
      setCheckingConnection(false);
    }
  };

  const handleManualCheck = async () => {
    const payload = validateAndNormalize();
    if (!payload) return;
    await runConnectionCheck(payload);
  };

  const handleSubmit = async () => {
    const payload = validateAndNormalize();
    if (!payload) return;

    const signature = buildConnectionSignature(payload);
    const alreadyChecked =
      connectionState === "success" && lastCheckedSignature === signature;

    if (requireConnectionCheck && !alreadyChecked) {
      const success = await runConnectionCheck(payload);
      if (!success) return;
    }

    onSubmit(payload);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>OLT Configuration</DialogTitle>
          <DialogDescription>
            Tambahkan atau edit informasi OLT di jaringan.
          </DialogDescription>
        </DialogHeader>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Nama OLT</Label>
            <Input
              value={values.name}
              onChange={(event) => handleChange("name", event.target.value)}
              placeholder="OLT Central"
            />
            {errors.name && (
              <p className="text-xs text-danger">{errors.name}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label>Model</Label>
            <Input
              value={values.model}
              onChange={(event) => handleChange("model", event.target.value)}
              placeholder="HIOSO OLT 8P"
            />
          </div>
          <div className="space-y-2">
            <Label>IP / Base URL</Label>
            <Input
              value={values.ip}
              onChange={(event) => handleChange("ip", event.target.value)}
              placeholder="192.168.1.100"
            />
            {errors.ip && <p className="text-xs text-danger">{errors.ip}</p>}
          </div>
          <div className="space-y-2">
            <Label>Port</Label>
            <Input
              type="number"
              value={values.port}
              onChange={(event) => handleChange("port", event.target.value)}
              placeholder="80"
            />
          </div>
          <div className="space-y-2">
            <Label>Username</Label>
            <Input
              value={values.username}
              onChange={(event) => handleChange("username", event.target.value)}
              placeholder="admin"
            />
            {errors.username && (
              <p className="text-xs text-danger">{errors.username}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label>Password</Label>
            <Input
              type="password"
              value={values.password}
              onChange={(event) => handleChange("password", event.target.value)}
              placeholder={
                isUpdateMode
                  ? "Biarkan kosong jika tidak diubah"
                  : "••••••"
              }
            />
          </div>
        </div>
        {(connectionState !== "idle" || checkingConnection) && (
          <div
            className={`mt-4 flex items-center gap-2 text-xs ${
              connectionState === "success"
                ? "text-success"
                : connectionState === "error"
                  ? "text-danger"
                  : "text-slate-500"
            }`}
          >
            {checkingConnection ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : connectionState === "success" ? (
              <CheckCircle2 className="h-3.5 w-3.5" />
            ) : (
              <ShieldAlert className="h-3.5 w-3.5" />
            )}
            <span>{checkingConnection ? "Mengecek koneksi OLT..." : connectionMessage}</span>
          </div>
        )}
        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <Button
            variant="outline"
            onClick={handleManualCheck}
            disabled={loading || checkingConnection}
          >
            {checkingConnection ? "Checking..." : "Check Connection"}
          </Button>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading || checkingConnection}>
            {loading ? "Processing..." : submitLabel}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function buildConnectionSignature(values: DeviceFormValues): string {
  const normalized = normalizeBaseUrl(values.ip);
  let protocol = "http:";
  let host = normalized;
  let resolvedPort = values.port || 80;

  try {
    const parsed = new URL(normalized);
    protocol = parsed.protocol || "http:";
    host = parsed.hostname || host;
    if (parsed.port) {
      resolvedPort = Number(parsed.port);
    }
  } catch {
    // Keep fallback values.
  }

  if (!resolvedPort) {
    resolvedPort = protocol === "https:" ? 443 : 80;
  }

  return [
    `${protocol}//${host}`.toLowerCase(),
    String(resolvedPort),
    values.username.trim().toLowerCase(),
    values.password,
  ].join("|");
}
