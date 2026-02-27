import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { KeyRound, Pencil, Plus, Trash2, UserPlus } from "lucide-react";
import { toast } from "sonner";

import {
  changePassword,
  createUser,
  createDevice,
  deleteDevice,
  displayHost,
  getApiErrorMessage,
  listAuditLogs,
  listDevices,
  listUsers,
  normalizeBaseUrl,
  resetUserPassword,
  updateDevice,
} from "@/lib/api";
import type { AuditLog, AuthUser, Device } from "@/types/api";
import ChangePasswordDialog from "@/components/ChangePasswordDialog";
import DeviceFormDialog, { DeviceFormValues } from "@/components/DeviceFormDialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { useAuthStore } from "@/store/useAuthStore";
import { useUiStore } from "@/store/useUiStore";

function slugify(input: string) {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function generateDeviceId(name: string, existing: Device[]) {
  const base = slugify(name) || "olt";
  let id = base;
  let counter = 1;
  const existingIds = new Set(existing.map((device) => device.id));
  while (existingIds.has(id)) {
    id = `${base}-${counter}`;
    counter += 1;
  }
  return id;
}

function formatAuditTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("id-ID", { hour12: false });
}

function summarizeAuditMetadata(metadata?: string) {
  if (!metadata) return "-";
  try {
    const parsed = JSON.parse(metadata) as Record<string, unknown>;
    const entries = Object.entries(parsed).slice(0, 3);
    if (entries.length === 0) return "-";
    return entries
      .map(([key, value]) => `${key}: ${String(value)}`)
      .join(" | ");
  } catch {
    return metadata;
  }
}

export default function Settings() {
  const queryClient = useQueryClient();
  const { modelById, setModel, removeModel, autoRefreshEnabled } = useUiStore();
  const { clearSession, user } = useAuthStore();
  const isAdmin = user?.role === "admin";
  const { data: devices = [], isLoading } = useQuery({
    queryKey: ["devices"],
    queryFn: listDevices,
    refetchInterval: autoRefreshEnabled ? 30000 : false,
  });
  const { data: users = [], isLoading: usersLoading } = useQuery({
    queryKey: ["auth-users"],
    queryFn: listUsers,
    enabled: isAdmin,
    refetchInterval: autoRefreshEnabled ? 30000 : false,
  });
  const [auditUsernameFilter, setAuditUsernameFilter] = useState("");
  const [auditActionFilter, setAuditActionFilter] = useState("");
  const { data: auditLogs = [], isLoading: auditLogsLoading } = useQuery({
    queryKey: ["audit-logs", auditUsernameFilter, auditActionFilter],
    queryFn: () =>
      listAuditLogs({
        limit: 25,
        username: auditUsernameFilter || undefined,
        action: auditActionFilter || undefined,
      }),
    enabled: isAdmin,
    refetchInterval: autoRefreshEnabled ? 30000 : false,
  });

  const [dialogOpen, setDialogOpen] = useState(false);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [editingDevice, setEditingDevice] = useState<Device | null>(null);
  const [createUserOpen, setCreateUserOpen] = useState(false);
  const [passwordUserOpen, setPasswordUserOpen] = useState<AuthUser | null>(null);
  const [newUsername, setNewUsername] = useState("");
  const [newUserPassword, setNewUserPassword] = useState("");
  const [newUserPasswordConfirm, setNewUserPasswordConfirm] = useState("");
  const [resetPassword, setResetPassword] = useState("");
  const [resetPasswordConfirm, setResetPasswordConfirm] = useState("");
  const [search, setSearch] = useState("");
  const [pendingModel, setPendingModel] = useState<{
    id: string;
    model: string;
  } | null>(null);

  const createMutation = useMutation({
    mutationFn: createDevice,
    onSuccess: (_, variables) => {
      toast.success("OLT berhasil ditambahkan");
      queryClient.invalidateQueries({ queryKey: ["devices"] });
      if (pendingModel && pendingModel.id === variables.id) {
        setModel(pendingModel.id, pendingModel.model);
      }
      setPendingModel(null);
      setDialogOpen(false);
    },
    onError: (err: Error) => {
      toast.error(err.message);
      setPendingModel(null);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Record<string, unknown> }) =>
      updateDevice(id, payload),
    onSuccess: (_, variables) => {
      toast.success("OLT berhasil diperbarui");
      queryClient.invalidateQueries({ queryKey: ["devices"] });
      if (pendingModel && pendingModel.id === variables.id) {
        setModel(pendingModel.id, pendingModel.model);
      }
      setPendingModel(null);
      setDialogOpen(false);
    },
    onError: (err: Error) => {
      toast.error(err.message);
      setPendingModel(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteDevice,
    onSuccess: (_, id) => {
      toast.success("OLT berhasil dihapus");
      removeModel(id);
      queryClient.invalidateQueries({ queryKey: ["devices"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const changePasswordMutation = useMutation({
    mutationFn: (payload: { currentPassword: string; newPassword: string }) =>
      changePassword(payload.currentPassword, payload.newPassword),
    onSuccess: () => {
      toast.success("Password berhasil diubah. Silakan login ulang.");
      setPasswordDialogOpen(false);
      clearSession();
      window.location.assign("/login");
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, "Gagal mengubah password"));
    },
  });

  const createUserMutation = useMutation({
    mutationFn: (payload: { username: string; password: string }) =>
      createUser(payload),
    onSuccess: () => {
      toast.success("User berhasil ditambahkan");
      queryClient.invalidateQueries({ queryKey: ["auth-users"] });
      setCreateUserOpen(false);
      setNewUsername("");
      setNewUserPassword("");
      setNewUserPasswordConfirm("");
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, "Gagal menambahkan user"));
    },
  });

  const resetUserPasswordMutation = useMutation({
    mutationFn: (payload: { userId: number; newPassword: string }) =>
      resetUserPassword(payload.userId, payload.newPassword),
    onSuccess: () => {
      toast.success("Password user berhasil diperbarui");
      setPasswordUserOpen(null);
      setResetPassword("");
      setResetPasswordConfirm("");
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, "Gagal mengubah password user"));
    },
  });

  const filteredDevices = useMemo(() => {
    const query = search.toLowerCase();
    return devices.filter((device) => {
      return (
        device.name.toLowerCase().includes(query) ||
        device.id.toLowerCase().includes(query) ||
        device.base_url.toLowerCase().includes(query)
      );
    });
  }, [devices, search]);

  const handleAdd = () => {
    setEditingDevice(null);
    setDialogOpen(true);
  };

  const handleEdit = (device: Device) => {
    setEditingDevice(device);
    setDialogOpen(true);
  };

  const handleSubmit = (values: DeviceFormValues) => {
    if (!values.password && !editingDevice) {
      toast.error("Password wajib diisi untuk device baru");
      return;
    }

    if (editingDevice) {
      const payload: Record<string, unknown> = {
        name: values.name,
        base_url: normalizeBaseUrl(values.ip),
        port: values.port,
        username: values.username,
      };
      if (values.password) {
        payload.password = values.password;
      }
      setPendingModel({ id: editingDevice.id, model: values.model });
      updateMutation.mutate({ id: editingDevice.id, payload });
    } else {
      const id = generateDeviceId(values.name, devices);
      setPendingModel({ id, model: values.model });
      createMutation.mutate({
        id,
        name: values.name,
        base_url: normalizeBaseUrl(values.ip),
        port: values.port,
        username: values.username,
        password: values.password,
      });
    }
  };

  const handleCreateUser = () => {
    const username = newUsername.trim();
    if (!username) {
      toast.error("Username wajib diisi");
      return;
    }
    if (!newUserPassword || newUserPassword.length < 8) {
      toast.error("Password minimal 8 karakter");
      return;
    }
    if (newUserPassword !== newUserPasswordConfirm) {
      toast.error("Konfirmasi password tidak sama");
      return;
    }
    createUserMutation.mutate({
      username,
      password: newUserPassword,
    });
  };

  const handleResetUserPassword = () => {
    if (!passwordUserOpen) return;
    if (!resetPassword || resetPassword.length < 8) {
      toast.error("Password baru minimal 8 karakter");
      return;
    }
    if (resetPassword !== resetPasswordConfirm) {
      toast.error("Konfirmasi password tidak sama");
      return;
    }
    resetUserPasswordMutation.mutate({
      userId: passwordUserOpen.id,
      newPassword: resetPassword,
    });
  };

  const dialogInitial = editingDevice
    ? {
        name: editingDevice.name,
        ip: displayHost(editingDevice.base_url),
        port: editingDevice.port,
        model: modelById[editingDevice.id] || "",
        username: editingDevice.username || "",
        password: "",
      }
    : undefined;

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900 sm:text-2xl">
            Settings
          </h2>
          <p className="text-sm text-slate-500">
            Kelola perangkat OLT, credentials, dan model.
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Input
            placeholder="Cari OLT..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="w-full sm:w-64"
          />
          <Button
            variant="outline"
            onClick={() => setPasswordDialogOpen(true)}
            className="w-full sm:w-auto"
          >
            <KeyRound className="h-4 w-4" />
            Change Password
          </Button>
          <Button onClick={handleAdd} className="w-full sm:w-auto">
            <Plus className="h-4 w-4" />
            Add New OLT
          </Button>
        </div>
      </div>

      <Card className="p-4 sm:p-6">
        {isLoading && (
          <div className="text-sm text-slate-500">Loading data OLT...</div>
        )}
        {!isLoading && (
          <>
            <div className="space-y-3 lg:hidden">
              {filteredDevices.length === 0 && (
                <div className="rounded-2xl border border-slate-100 bg-white p-6 text-sm text-slate-500">
                  Tidak ada OLT terdaftar.
                </div>
              )}
              {filteredDevices.map((device) => (
                <div
                  key={device.id}
                  className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase text-slate-400">
                        {device.id}
                      </p>
                      <p className="mt-1 font-semibold text-slate-900">
                        {device.name}
                      </p>
                      <p className="mt-1 text-xs text-slate-500 break-all">
                        {displayHost(device.base_url)}:{device.port}
                      </p>
                      <p className="mt-1 text-xs text-slate-400">
                        {modelById[device.id] || "-"}
                      </p>
                    </div>
                    <Badge
                      variant={device.status === "active" ? "success" : "warning"}
                    >
                      {device.status}
                    </Badge>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(device)}
                    >
                      <Pencil className="h-4 w-4" />
                      Edit
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="sm" className="text-danger">
                          <Trash2 className="h-4 w-4" />
                          Delete
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Hapus OLT</AlertDialogTitle>
                          <AlertDialogDescription>
                            Tindakan ini akan menghapus OLT beserta data terkait.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => deleteMutation.mutate(device.id)}
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              ))}
            </div>
            <div className="hidden lg:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>OLT</TableHead>
                    <TableHead>IP</TableHead>
                    <TableHead>Port</TableHead>
                    <TableHead>Model</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDevices.length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        className="text-center text-slate-500"
                      >
                        Tidak ada OLT terdaftar.
                      </TableCell>
                    </TableRow>
                  )}
                  {filteredDevices.map((device) => (
                    <TableRow key={device.id}>
                      <TableCell>
                        <div className="font-semibold text-slate-900">
                          {device.name}
                        </div>
                        <div className="text-xs text-slate-400">{device.id}</div>
                      </TableCell>
                      <TableCell>{displayHost(device.base_url)}</TableCell>
                      <TableCell>{device.port}</TableCell>
                      <TableCell>{modelById[device.id] || "-"}</TableCell>
                      <TableCell>
                        <Badge
                          variant={device.status === "active" ? "success" : "warning"}
                        >
                          {device.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="inline-flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(device)}
                          >
                            <Pencil className="h-4 w-4" />
                            Edit
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-danger"
                              >
                                <Trash2 className="h-4 w-4" />
                                Delete
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Hapus OLT</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Tindakan ini akan menghapus OLT beserta data terkait.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => deleteMutation.mutate(device.id)}
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </Card>

      {isAdmin && (
        <Card className="p-4 sm:p-6">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-lg font-semibold text-slate-900">User Login</h3>
              <p className="text-sm text-slate-500">
                Tambah user baru dan reset password login user.
              </p>
            </div>
            <Button
              onClick={() => setCreateUserOpen(true)}
              className="w-full sm:w-auto"
            >
              <UserPlus className="h-4 w-4" />
              Add User
            </Button>
          </div>

          {usersLoading && (
            <div className="text-sm text-slate-500">Loading data user...</div>
          )}

          {!usersLoading && (
            <>
              <div className="space-y-3 lg:hidden">
                {users.length === 0 && (
                  <div className="rounded-2xl border border-slate-100 bg-white p-6 text-sm text-slate-500">
                    Belum ada user terdaftar.
                  </div>
                )}
                {users.map((entry) => (
                  <div
                    key={entry.id}
                    className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">
                          {entry.username}
                        </p>
                        <p className="text-xs uppercase text-slate-500">{entry.role}</p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setPasswordUserOpen(entry);
                          setResetPassword("");
                          setResetPasswordConfirm("");
                        }}
                      >
                        <KeyRound className="h-4 w-4" />
                        Edit Password
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="hidden lg:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Username</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.length === 0 && (
                      <TableRow>
                        <TableCell
                          colSpan={3}
                          className="text-center text-slate-500"
                        >
                          Belum ada user terdaftar.
                        </TableCell>
                      </TableRow>
                    )}
                    {users.map((entry) => (
                      <TableRow key={entry.id}>
                        <TableCell className="font-semibold text-slate-900">
                          {entry.username}
                        </TableCell>
                        <TableCell className="uppercase text-slate-600">
                          {entry.role}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setPasswordUserOpen(entry);
                              setResetPassword("");
                              setResetPasswordConfirm("");
                            }}
                          >
                            <KeyRound className="h-4 w-4" />
                            Edit Password
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </Card>
      )}

      {isAdmin && (
        <Card className="p-4 sm:p-6">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-slate-900">
              Activity Logs
            </h3>
            <p className="text-sm text-slate-500">
              Riwayat aktivitas user (login, reboot, update nama, dll).
            </p>
            <p className="mt-1 text-xs text-slate-400">
              Menampilkan maksimal 25 log terbaru.
            </p>
          </div>

          <div className="mb-4 grid gap-3 sm:grid-cols-2">
            <Input
              value={auditUsernameFilter}
              onChange={(event) => setAuditUsernameFilter(event.target.value)}
              placeholder="Filter username"
            />
            <Input
              value={auditActionFilter}
              onChange={(event) => setAuditActionFilter(event.target.value)}
              placeholder="Filter action (contoh: onu.action.reboot)"
            />
          </div>

          {auditLogsLoading && (
            <div className="text-sm text-slate-500">Loading activity logs...</div>
          )}

          {!auditLogsLoading && (
            <div className="max-h-[30rem] overflow-y-auto pr-1">
              <div className="space-y-3 lg:hidden">
                {auditLogs.length === 0 && (
                  <div className="rounded-2xl border border-slate-100 bg-white p-6 text-sm text-slate-500">
                    Belum ada aktivitas tercatat.
                  </div>
                )}
                {auditLogs.map((entry: AuditLog) => (
                  <div
                    key={entry.id}
                    className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs text-slate-500">
                        {formatAuditTime(entry.created_at)}
                      </p>
                      <Badge variant="info" className="font-mono text-[10px]">
                        {entry.action}
                      </Badge>
                    </div>
                    <p className="mt-2 text-sm font-semibold text-slate-900">
                      {entry.username}
                    </p>
                    <p className="text-xs text-slate-500">
                      {entry.resource}
                      {entry.resource_id ? ` • ${entry.resource_id}` : ""}
                    </p>
                    <p className="mt-2 text-xs text-slate-600 break-all">
                      {summarizeAuditMetadata(entry.metadata)}
                    </p>
                    <p className="mt-1 text-[11px] text-slate-400">
                      IP: {entry.ip_address || "-"}
                    </p>
                  </div>
                ))}
              </div>

              <div className="hidden lg:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Waktu</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead>Resource</TableHead>
                      <TableHead>Detail</TableHead>
                      <TableHead>IP</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {auditLogs.length === 0 && (
                      <TableRow>
                        <TableCell
                          colSpan={6}
                          className="text-center text-slate-500"
                        >
                          Belum ada aktivitas tercatat.
                        </TableCell>
                      </TableRow>
                    )}
                    {auditLogs.map((entry: AuditLog) => (
                      <TableRow key={entry.id}>
                        <TableCell className="whitespace-nowrap text-xs text-slate-600">
                          {formatAuditTime(entry.created_at)}
                        </TableCell>
                        <TableCell>
                          <div className="font-semibold text-slate-900">
                            {entry.username}
                          </div>
                          <div className="text-xs uppercase text-slate-400">
                            {entry.role || "-"}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="info" className="font-mono text-[10px]">
                            {entry.action}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-slate-700">
                          {entry.resource}
                          {entry.resource_id ? ` • ${entry.resource_id}` : ""}
                        </TableCell>
                        <TableCell className="max-w-[420px] text-xs text-slate-600">
                          <div className="truncate">
                            {summarizeAuditMetadata(entry.metadata)}
                          </div>
                        </TableCell>
                        <TableCell className="text-xs text-slate-600">
                          {entry.ip_address || "-"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </Card>
      )}

      <DeviceFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        initial={dialogInitial}
        submitLabel={editingDevice ? "Update OLT" : "Create OLT"}
        requireConnectionCheck={!editingDevice}
        loading={createMutation.isPending || updateMutation.isPending}
        onSubmit={handleSubmit}
      />

      <ChangePasswordDialog
        open={passwordDialogOpen}
        onOpenChange={setPasswordDialogOpen}
        loading={changePasswordMutation.isPending}
        onSubmit={({ currentPassword, newPassword }) =>
          changePasswordMutation.mutate({ currentPassword, newPassword })
        }
      />

      <Dialog
        open={createUserOpen}
        onOpenChange={(open) => {
          setCreateUserOpen(open);
          if (!open) {
            setNewUsername("");
            setNewUserPassword("");
            setNewUserPasswordConfirm("");
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add User Login</DialogTitle>
            <DialogDescription>
              User baru dapat dipakai untuk login dashboard.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Username</Label>
              <Input
                value={newUsername}
                onChange={(event) => setNewUsername(event.target.value)}
                placeholder="usernoc"
                autoComplete="off"
              />
            </div>
            <div className="space-y-2">
              <Label>Password</Label>
              <Input
                type="password"
                value={newUserPassword}
                onChange={(event) => setNewUserPassword(event.target.value)}
                placeholder="Minimal 8 karakter"
                autoComplete="new-password"
              />
            </div>
            <div className="space-y-2">
              <Label>Confirm Password</Label>
              <Input
                type="password"
                value={newUserPasswordConfirm}
                onChange={(event) => setNewUserPasswordConfirm(event.target.value)}
                placeholder="Ulangi password"
                autoComplete="new-password"
              />
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setCreateUserOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreateUser}
              disabled={createUserMutation.isPending}
            >
              {createUserMutation.isPending ? "Saving..." : "Save User"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!passwordUserOpen}
        onOpenChange={(open) => {
          if (!open) {
            setPasswordUserOpen(null);
            setResetPassword("");
            setResetPasswordConfirm("");
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit User Password</DialogTitle>
            <DialogDescription>
              Reset password login untuk user{" "}
              <span className="font-semibold text-slate-700">
                {passwordUserOpen?.username || "-"}
              </span>
              .
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Password Baru</Label>
              <Input
                type="password"
                value={resetPassword}
                onChange={(event) => setResetPassword(event.target.value)}
                placeholder="Minimal 8 karakter"
                autoComplete="new-password"
              />
            </div>
            <div className="space-y-2">
              <Label>Confirm Password Baru</Label>
              <Input
                type="password"
                value={resetPasswordConfirm}
                onChange={(event) => setResetPasswordConfirm(event.target.value)}
                placeholder="Ulangi password baru"
                autoComplete="new-password"
              />
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setPasswordUserOpen(null)}>
              Cancel
            </Button>
            <Button
              onClick={handleResetUserPassword}
              disabled={resetUserPasswordMutation.isPending || !passwordUserOpen}
            >
              {resetUserPasswordMutation.isPending ? "Updating..." : "Update Password"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
