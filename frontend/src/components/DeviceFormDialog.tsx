import { useEffect, useState } from "react";

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
import { normalizeBaseUrl } from "@/lib/api";

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
  loading,
  onSubmit,
}: DeviceFormDialogProps) {
  const [values, setValues] = useState<DeviceFormValues>(defaultValues);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (open) {
      setValues({ ...defaultValues, ...initial });
      setErrors({});
    }
  }, [open, initial]);

  const handleChange = (field: keyof DeviceFormValues, value: string) => {
    setValues((prev) => ({
      ...prev,
      [field]: field === "port" ? Number(value) : value,
    }));
  };

  const handleSubmit = () => {
    const nextErrors: Record<string, string> = {};
    if (!values.name.trim()) nextErrors.name = "Nama wajib diisi";
    if (!values.ip.trim()) nextErrors.ip = "IP wajib diisi";
    if (!values.username.trim()) nextErrors.username = "Username wajib diisi";

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
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
                submitLabel.toLowerCase().includes("update")
                  ? "Biarkan kosong jika tidak diubah"
                  : "••••••"
              }
            />
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? "Processing..." : submitLabel}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
