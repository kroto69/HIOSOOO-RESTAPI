import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { Eye, PencilLine, RefreshCw } from "lucide-react";
import { toast } from "sonner";

import {
  getDevice,
  getDeviceStatus,
  getOnuDetail,
  getOnus,
  getPons,
  getSystemInfo,
  rebootOnu,
  simplifyOnuId,
  updateOnuName,
} from "@/lib/api";
import { formatSignal, getRxSignalTone, normalizeOnuStatus } from "@/lib/format";
import type { Onu, OnuDetail, PonPort } from "@/types/api";
import StatusBadge from "@/components/StatusBadge";
import EmptyState from "@/components/EmptyState";
import OnuDetailDialog from "@/components/OnuDetailDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useUiStore } from "@/store/useUiStore";

const getPonValue = (pon: PonPort): string =>
  (pon.full_id || pon.pon_id || "").trim();

export default function OltDetail() {
  const { id } = useParams();
  const queryClient = useQueryClient();
  const { autoRefreshEnabled } = useUiStore();
  const [activePon, setActivePon] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [selectedOnu, setSelectedOnu] = useState<Onu | null>(null);
  const [editingOnu, setEditingOnu] = useState<Onu | null>(null);
  const [editingName, setEditingName] = useState("");
  const [detailCache, setDetailCache] = useState<Record<string, OnuDetail>>({});
  const [manualRefreshing, setManualRefreshing] = useState(false);
  const [manualDetailRefreshing, setManualDetailRefreshing] = useState(false);

  const deviceQuery = useQuery({
    queryKey: ["device", id],
    queryFn: () => getDevice(id || ""),
    enabled: !!id,
    refetchInterval: autoRefreshEnabled ? 30000 : false,
  });

  const statusQuery = useQuery({
    queryKey: ["device-status", id],
    queryFn: () => getDeviceStatus(id || ""),
    enabled: !!id,
    refetchInterval: autoRefreshEnabled ? 30000 : false,
  });

  const systemQuery = useQuery({
    queryKey: ["device-system", id],
    queryFn: () => getSystemInfo(id || ""),
    enabled: !!id,
    refetchInterval: autoRefreshEnabled ? 30000 : false,
  });

  const ponsQuery = useQuery({
    queryKey: ["pons", id],
    queryFn: () => getPons(id || ""),
    enabled: !!id,
    refetchInterval: autoRefreshEnabled ? 30000 : false,
  });

  const pons = useMemo(() => {
    const raw = ponsQuery.data || [];
    if (raw.length === 0) return [];

    const depthCounts = new Map<number, number>();
    for (const pon of raw) {
      const depth = (pon.full_id || "")
        .split("/")
        .filter((part) => part.trim().length > 0).length;
      if (depth > 0) {
        depthCounts.set(depth, (depthCounts.get(depth) || 0) + 1);
      }
    }

    let targetDepth = 0;
    let maxCount = 0;
    for (const [depth, count] of depthCounts.entries()) {
      if (
        count > maxCount ||
        (count === maxCount && depth > targetDepth)
      ) {
        targetDepth = depth;
        maxCount = count;
      }
    }

    const candidate = targetDepth
      ? raw.filter((pon) => {
          const depth = (pon.full_id || "")
            .split("/")
            .filter((part) => part.trim().length > 0).length;
          return depth === targetDepth;
        })
      : raw;

    const unique: typeof candidate = [];
    const seen = new Set<string>();
    for (const pon of candidate) {
      const key = getPonValue(pon);
      if (!key) continue;
      if (seen.has(key)) continue;
      seen.add(key);
      unique.push(pon);
    }
    return unique;
  }, [ponsQuery.data]);

  useEffect(() => {
    if (pons.length === 0) {
      if (activePon) setActivePon(null);
      return;
    }
    if (!activePon || !pons.some((pon) => getPonValue(pon) === activePon)) {
      setActivePon(getPonValue(pons[0]));
    }
  }, [pons, activePon]);

  const selectedPon = useMemo(
    () => pons.find((pon) => getPonValue(pon) === activePon) || null,
    [pons, activePon]
  );

  const onusQuery = useQuery({
    queryKey: ["onus", id, activePon],
    queryFn: () => {
      if (!selectedPon) return Promise.resolve([] as Onu[]);
      return getOnus(id || "", getPonValue(selectedPon), undefined);
    },
    enabled: !!id && !!selectedPon,
    refetchInterval: autoRefreshEnabled ? 30000 : false,
  });

  const uniqueOnusData = useMemo(() => {
    const source = onusQuery.data || [];
    const deduped: Onu[] = [];
    const seen = new Set<string>();
    for (const onu of source) {
      const key = `${simplifyOnuId(onu.onu_id)}|${onu.mac_address.toLowerCase()}`;
      if (seen.has(key)) continue;
      seen.add(key);
      deduped.push(onu);
    }
    return deduped;
  }, [onusQuery.data]);

  const detailQuery = useQuery({
    queryKey: ["onu-detail", id, selectedOnu?.onu_id],
    queryFn: () => getOnuDetail(id || "", selectedOnu?.onu_id || ""),
    enabled: !!id && !!selectedOnu,
    onSuccess: (data) => {
      const simplified = simplifyOnuId(data.onu_id);
      const macKey = data.mac_address
        ? `mac:${data.mac_address.toLowerCase()}`
        : undefined;
      setDetailCache((prev) => ({
        ...prev,
        [data.onu_id]: data,
        [simplified]: data,
        ...(macKey ? { [macKey]: data } : {}),
      }));
      if (data.optical_module) {
        queryClient.setQueryData<Onu[] | undefined>(
          ["onus", id, activePon],
          (old) => {
            if (!old) return old;
            const normalizedDetailId = simplifyOnuId(data.onu_id);
            const detailMac = data.mac_address?.toLowerCase();
            return old.map((onu) => {
              const normalizedOnuId = simplifyOnuId(onu.onu_id);
              const macMatch = detailMac
                ? onu.mac_address.toLowerCase() === detailMac
                : false;
              if (normalizedOnuId !== normalizedDetailId && !macMatch) {
                return onu;
              }
              return {
                ...onu,
                metrics: {
                  ...onu.metrics,
                  rx_power:
                    data.optical_module?.rx_power ?? onu.metrics?.rx_power,
                  tx_power:
                    data.optical_module?.tx_power ?? onu.metrics?.tx_power,
                },
              };
            });
          }
        );
      }
    },
  });

  const rebootMutation = useMutation({
    mutationFn: (onuId: string) => rebootOnu(id || "", onuId),
    onSuccess: () => {
      toast.success("ONU reboot berhasil dijalankan");
      queryClient.invalidateQueries({ queryKey: ["onus", id, activePon] });
      if (selectedOnu) {
        queryClient.invalidateQueries({
          queryKey: ["onu-detail", id, selectedOnu.onu_id],
        });
      }
    },
    onError: (err: Error) => {
      toast.error(err.message || "Gagal reboot ONU");
    },
  });

  const updateNameMutation = useMutation({
    mutationFn: (payload: { onuId: string; name: string; macAddress?: string }) =>
      updateOnuName(id || "", payload.onuId, payload.name),
    onSuccess: (_, payload) => {
      const normalizedId = simplifyOnuId(payload.onuId);
      const macAddress = payload.macAddress?.toLowerCase();
      toast.success("Nama ONU berhasil disimpan");
      queryClient.invalidateQueries({
        queryKey: ["onu-detail", id, payload.onuId],
      });
      queryClient.invalidateQueries({ queryKey: ["onus", id, activePon] });
      queryClient.setQueryData<Onu[] | undefined>(
        ["onus", id, activePon],
        (old) => {
          if (!old) return old;
          return old.map((onu) => {
            const idMatch = simplifyOnuId(onu.onu_id) === normalizedId;
            const macMatch = macAddress
              ? onu.mac_address.toLowerCase() === macAddress
              : false;
            if (!idMatch && !macMatch) return onu;
            return { ...onu, name: payload.name };
          });
        }
      );
      setDetailCache((prev) => ({
        ...prev,
        ...(prev[payload.onuId]
          ? {
              [payload.onuId]: {
                ...prev[payload.onuId],
                name: payload.name,
              },
            }
          : {}),
        ...(prev[normalizedId]
          ? {
              [normalizedId]: {
                ...prev[normalizedId],
                name: payload.name,
              },
            }
          : {}),
        ...(macAddress && prev[`mac:${macAddress}`]
          ? {
              [`mac:${macAddress}`]: {
                ...prev[`mac:${macAddress}`],
                name: payload.name,
              },
            }
          : {}),
      }));
    },
    onError: (err: Error) => {
      toast.error(err.message || "Gagal menyimpan nama ONU");
    },
  });

  const handleRefresh = async () => {
    if (!selectedOnu) return;
    setManualDetailRefreshing(true);
    const minDelay = new Promise((resolve) => setTimeout(resolve, 450));
    try {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["onu-detail", id, selectedOnu.onu_id],
        }),
        queryClient.invalidateQueries({ queryKey: ["onus", id, activePon] }),
        minDelay,
      ]);
    } finally {
      setManualDetailRefreshing(false);
    }
  };

  const handleReboot = () => {
    if (!selectedOnu) return;
    rebootMutation.mutate(selectedOnu.onu_id);
  };

  const handleSaveName = (name: string) => {
    if (!selectedOnu) return;
    if (!name) {
      toast.error("Nama ONU tidak boleh kosong");
      return;
    }
    updateNameMutation.mutate({
      onuId: selectedOnu.onu_id,
      name,
      macAddress: selectedOnu.mac_address,
    });
  };

  const handleRefreshAll = async () => {
    setManualRefreshing(true);
    const minDelay = new Promise((resolve) => setTimeout(resolve, 450));
    try {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["device", id] }),
        queryClient.invalidateQueries({ queryKey: ["device-status", id] }),
        queryClient.invalidateQueries({ queryKey: ["device-system", id] }),
        queryClient.invalidateQueries({ queryKey: ["pons", id] }),
        queryClient.invalidateQueries({ queryKey: ["onus", id] }),
        minDelay,
      ]);
    } finally {
      setManualRefreshing(false);
    }
  };

  const handleOpenQuickEdit = (onu: Onu) => {
    setEditingOnu(onu);
    setEditingName(onu.name || "");
  };

  const handleQuickSaveName = () => {
    if (!editingOnu) return;
    const trimmedName = editingName.trim();
    if (!trimmedName) {
      toast.error("Nama ONU tidak boleh kosong");
      return;
    }
    if (trimmedName === (editingOnu.name || "")) {
      setEditingOnu(null);
      return;
    }
    updateNameMutation.mutate(
      {
        onuId: editingOnu.onu_id,
        name: trimmedName,
        macAddress: editingOnu.mac_address,
      },
      {
        onSuccess: () => {
          setEditingOnu(null);
        },
      }
    );
  };

  const listRefreshing =
    manualRefreshing ||
    deviceQuery.isFetching ||
    statusQuery.isFetching ||
    systemQuery.isFetching ||
    ponsQuery.isFetching ||
    onusQuery.isFetching;

  const onus = useMemo(() => {
    const filtered = uniqueOnusData.filter((onu) => {
      const matchesSearch =
        onu.onu_id.toLowerCase().includes(search.toLowerCase()) ||
        onu.mac_address.toLowerCase().includes(search.toLowerCase()) ||
        (onu.name || "").toLowerCase().includes(search.toLowerCase());
      const normalized = normalizeOnuStatus(onu.status);
      const matchesStatus =
        statusFilter === "all"
          ? true
          : statusFilter === "online"
            ? normalized === "online"
            : statusFilter === "down"
              ? normalized === "down" || normalized === "offline"
              : statusFilter === "los"
                ? normalized === "los"
                : statusFilter === "powerdown"
                  ? normalized === "powerdown" || normalized === "poweroff"
                  : false;
      return matchesSearch && matchesStatus;
    });
    return filtered;
  }, [uniqueOnusData, search, statusFilter]);

  const selectedStats = useMemo(() => {
    if (!uniqueOnusData) {
      return { total: null, online: null, down: null };
    }
    const total = uniqueOnusData.length;
    const online = uniqueOnusData.filter(
      (onu) => normalizeOnuStatus(onu.status) === "online"
    ).length;
    const down = total - online;
    return { total, online, down };
  }, [uniqueOnusData]);

  const activePonLabel = useMemo(() => {
    if (!selectedPon) return "Selected PON";
    return `PON ${selectedPon.full_id || selectedPon.pon_id}`;
  }, [selectedPon]);

  const formatCount = (value: number | null | undefined) => {
    if (value === null || value === undefined) return "—";
    return value;
  };

  const resolvePower = (
    listValue: number | undefined,
    detailValue: number | undefined
  ) => {
    const detailAvailable =
      detailValue !== undefined && !Number.isNaN(detailValue);
    const listMissing =
      listValue === undefined ||
      Number.isNaN(listValue) ||
      Math.abs(listValue) < 0.05;
    if (listMissing && detailAvailable) {
      return detailValue;
    }
    return listValue ?? detailValue;
  };

  const getCachedDetail = (onu: Onu) => {
    const macKey = `mac:${onu.mac_address.toLowerCase()}`;
    const normalizedId = simplifyOnuId(onu.onu_id);
    const selectedDetail =
      selectedOnu && simplifyOnuId(selectedOnu.onu_id) === normalizedId
        ? detailData
        : undefined;
    return (
      selectedDetail ||
      detailCache[onu.onu_id] ||
      detailCache[normalizedId] ||
      detailCache[macKey]
    );
  };

  const getRxPower = (onu: Onu) => {
    const cachedDetail = getCachedDetail(onu);
    return resolvePower(
      onu.metrics?.rx_power,
      cachedDetail?.optical_module?.rx_power
    );
  };

  if (!id) {
    return <div className="text-slate-500">OLT ID tidak ditemukan.</div>;
  }

  const detailData =
    selectedOnu && (detailQuery.data || detailCache[selectedOnu.onu_id]);
  const detailRefreshing =
    (detailQuery.isFetching && !!selectedOnu) ||
    manualDetailRefreshing;
  const quickEditTrimmedName = editingName.trim();
  const canSaveQuickEdit =
    !!editingOnu &&
    quickEditTrimmedName.length > 0 &&
    quickEditTrimmedName !== (editingOnu.name || "");

  return (
    <div className="space-y-6 sm:space-y-8">
      <section>
        <Card className="border-[#89cbb7] bg-[#9fd8c5] p-4 sm:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                OLT Detail
              </p>
              <h2 className="mt-1 text-xl font-bold text-slate-900 sm:text-2xl">
                {deviceQuery.data?.name || "Loading..."}
              </h2>
              <p className="mt-1 break-all text-sm text-slate-500">
                {deviceQuery.data?.base_url}
              </p>
              <p className="mt-1 text-xs text-slate-400">
                ID: {deviceQuery.data?.id || "—"}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <StatusBadge
                status={
                  statusQuery.data
                    ? statusQuery.data.reachable
                      ? "online"
                      : "offline"
                    : "unknown"
                }
              />
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefreshAll}
                disabled={listRefreshing}
              >
                <RefreshCw
                  className={["h-4 w-4", listRefreshing ? "animate-spin" : ""].join(
                    " "
                  )}
                />
                {listRefreshing ? "Refreshing..." : "Refresh"}
              </Button>
            </div>
          </div>

          <div className="mt-3 rounded-lg border border-white/65 bg-white/55 p-3 sm:hidden">
            <div className="space-y-1.5 text-xs">
              <div className="flex items-center justify-between gap-2">
                <span className="uppercase tracking-wide text-slate-500">System</span>
                <span className="font-semibold text-slate-900">
                  {systemQuery.data?.system_name || "—"}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="uppercase tracking-wide text-slate-500">Uptime</span>
                <span className="max-w-[56%] truncate text-right font-semibold text-slate-900">
                  {systemQuery.data?.uptime || systemQuery.data?.run_time || "—"}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="uppercase tracking-wide text-slate-500">IP</span>
                <span className="max-w-[56%] truncate text-right font-semibold text-slate-900">
                  {systemQuery.data?.ip_address || "—"}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-4 hidden gap-2 sm:grid sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-lg border border-white/65 bg-white/55 p-3">
              <p className="text-xs uppercase text-slate-500">System</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">
                {systemQuery.data?.system_name || "—"}
              </p>
            </div>
            <div className="rounded-lg border border-white/65 bg-white/55 p-3">
              <p className="text-xs uppercase text-slate-500">Switch</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">
                {systemQuery.data?.switch_type || "—"}
              </p>
            </div>
            <div className="rounded-lg border border-white/65 bg-white/55 p-3">
              <p className="text-xs uppercase text-slate-500">Software</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">
                {systemQuery.data?.software_version || "—"}
              </p>
            </div>
            <div className="rounded-lg border border-white/65 bg-white/55 p-3">
              <p className="text-xs uppercase text-slate-500">Uptime</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">
                {systemQuery.data?.uptime || systemQuery.data?.run_time || "—"}
              </p>
            </div>
            <div className="rounded-lg border border-white/65 bg-white/55 p-3">
              <p className="text-xs uppercase text-slate-500">IP</p>
              <p className="mt-1 break-all text-sm font-semibold text-slate-900">
                {systemQuery.data?.ip_address || "—"}
              </p>
            </div>
            <div className="rounded-lg border border-white/65 bg-white/55 p-3">
              <p className="text-xs uppercase text-slate-500">MAC</p>
              <p className="mt-1 break-all text-sm font-semibold text-slate-900">
                {systemQuery.data?.mac_address || "—"}
              </p>
            </div>
          </div>
        </Card>
      </section>

      <section>
        {ponsQuery.isLoading && (
          <div className="rounded-2xl border border-slate-100 bg-white p-6 text-sm text-slate-500">
            Loading PON ports...
          </div>
        )}
        {!ponsQuery.isLoading && pons.length === 0 && (
          <EmptyState
            title="PON belum tersedia"
            description="Pastikan OLT terhubung dan dapat diakses."
          />
        )}
        {!ponsQuery.isLoading && pons.length > 0 && (
          <Tabs value={activePon || ""} onValueChange={setActivePon}>
            <div className="w-full overflow-x-auto">
              <TabsList className="min-w-max">
                {pons.map((pon, index) => (
                  <TabsTrigger
                    key={`${getPonValue(pon)}-${index}`}
                    value={getPonValue(pon)}
                  >
                    PON {pon.full_id || pon.pon_id}
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>
            {pons.map((pon, index) => (
              <TabsContent
                key={`${getPonValue(pon)}-${index}`}
                value={getPonValue(pon)}
              >
                <Card className="p-4 sm:p-5">
                  <div className="flex flex-col gap-4">
                    <div className="flex flex-col gap-3">
                      <div>
                        <h3 className="text-lg font-semibold text-slate-900">
                          ONU Table - PON {pon.full_id || pon.pon_id}
                        </h3>
                        <p className="text-sm text-slate-500">
                          Klik row untuk detail atau action cepat.
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                        <Input
                          placeholder="Cari ID, nama, atau MAC"
                          value={search}
                          onChange={(event) => setSearch(event.target.value)}
                          className="sm:w-64"
                        />
                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                          <SelectTrigger className="sm:w-40">
                            <SelectValue placeholder="Filter status" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Semua</SelectItem>
                            <SelectItem value="online">Online</SelectItem>
                            <SelectItem value="down">Down</SelectItem>
                            <SelectItem value="los">LOS</SelectItem>
                            <SelectItem value="powerdown">Powerdown</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button
                          variant="outline"
                          onClick={handleRefreshAll}
                          className="w-full sm:w-auto"
                          disabled={listRefreshing}
                        >
                          <RefreshCw
                            className={[
                              "h-4 w-4",
                              listRefreshing ? "animate-spin" : "",
                            ].join(" ")}
                          />
                          {listRefreshing ? "Refreshing..." : "Refresh ONU"}
                        </Button>
                      </div>

                      <div className="inline-flex flex-wrap items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 text-xs">
                        <span className="font-semibold uppercase text-slate-400">
                          {activePonLabel}
                        </span>
                        <span className="rounded-full bg-white px-2 py-1 text-slate-600">
                          Total: {formatCount(selectedStats.total)}
                        </span>
                        <span className="rounded-full bg-white px-2 py-1 text-success">
                          Online: {formatCount(selectedStats.online)}
                        </span>
                        <span className="rounded-full bg-white px-2 py-1 text-danger">
                          Down: {formatCount(selectedStats.down)}
                        </span>
                      </div>
                    </div>
                    <p className="text-xs text-slate-500 sm:hidden">
                      Geser tabel ke kanan/kiri untuk melihat semua kolom.
                    </p>
                  </div>

                  <div className="mt-6">
                    {onusQuery.isLoading && (
                      <div className="rounded-2xl border border-slate-100 bg-white p-6 text-sm text-slate-500">
                        Loading ONU data...
                      </div>
                    )}
                    {onusQuery.error && (
                      <div className="rounded-2xl border border-slate-100 bg-white p-6 text-sm text-slate-500">
                        Gagal memuat data ONU.
                      </div>
                    )}
                    {!onusQuery.isLoading && !onusQuery.error && (
                      <Table className="min-w-[820px]">
                        <TableHeader>
                          <TableRow>
                            <TableHead>ID</TableHead>
                            <TableHead>Nama</TableHead>
                            <TableHead>MAC</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Signals</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {onus.length === 0 && (
                            <TableRow>
                              <TableCell
                                colSpan={6}
                                className="text-center text-slate-500"
                              >
                                Tidak ada ONU yang cocok dengan filter.
                              </TableCell>
                            </TableRow>
                          )}
                          {onus.map((onu, index) => {
                            const rxPower = getRxPower(onu);
                            const rxTone = getRxSignalTone(rxPower, onu.status);
                            const rxTextClass =
                              rxTone === "success"
                                ? "text-success"
                                : rxTone === "warning"
                                  ? "text-warning"
                                  : rxTone === "danger"
                                    ? "text-danger"
                                    : "text-slate-500";
                            const rxVariant =
                              rxTone === "success"
                                ? "success"
                                : rxTone === "warning"
                                  ? "warning"
                                  : rxTone === "danger"
                                    ? "danger"
                                    : "default";
                            return (
                              <TableRow key={`${onu.onu_id}-${onu.mac_address}-${index}`}>
                                <TableCell className="font-semibold text-slate-900">
                                  {onu.onu_id}
                                </TableCell>
                                <TableCell className="min-w-[150px]">
                                  {onu.name || "-"}
                                </TableCell>
                                <TableCell className="min-w-[180px] text-xs font-medium text-slate-700">
                                  {onu.mac_address}
                                </TableCell>
                                <TableCell>
                                  <StatusBadge
                                    status={normalizeOnuStatus(onu.status)}
                                  />
                                </TableCell>
                                <TableCell>
                                  <Badge
                                    variant={rxVariant}
                                    className={["font-semibold", rxTextClass].join(" ")}
                                  >
                                    Rx {formatSignal(rxPower)}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-right">
                                  <div className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-8 px-2 text-slate-600 hover:text-slate-900"
                                      onClick={() => setSelectedOnu(onu)}
                                    >
                                      <Eye className="h-4 w-4" />
                                      <span className="hidden xl:inline">
                                        Detail
                                      </span>
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-8 px-2 text-slate-600 hover:text-slate-900"
                                      onClick={() => handleOpenQuickEdit(onu)}
                                    >
                                      <PencilLine className="h-4 w-4" />
                                      <span className="hidden xl:inline">Edit</span>
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    )}
                  </div>
                </Card>
              </TabsContent>
            ))}
          </Tabs>
        )}
      </section>

      <Dialog
        open={!!editingOnu}
        onOpenChange={(open) => {
          if (!open) {
            setEditingOnu(null);
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Nama ONU</DialogTitle>
            <DialogDescription>
              Update nama ONU langsung dari tabel tanpa buka detail penuh.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-500">
              {editingOnu ? `${editingOnu.onu_id} • ${editingOnu.mac_address}` : "—"}
            </div>
            <Input
              value={editingName}
              onChange={(event) => setEditingName(event.target.value)}
              placeholder="Nama ONU"
              autoFocus
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  handleQuickSaveName();
                }
              }}
            />
          </div>
          <div className="mt-6 flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setEditingOnu(null)}
              disabled={updateNameMutation.isPending}
            >
              Batal
            </Button>
            <Button
              onClick={handleQuickSaveName}
              disabled={!canSaveQuickEdit || updateNameMutation.isPending}
            >
              {updateNameMutation.isPending ? "Saving..." : "Save"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <OnuDetailDialog
        open={!!selectedOnu}
        onOpenChange={(open) => {
          if (!open) setSelectedOnu(null);
        }}
        detail={detailData}
        loading={detailQuery.isLoading && !detailData}
        refreshing={detailRefreshing}
        onRefresh={handleRefresh}
        onReboot={handleReboot}
        rebooting={rebootMutation.isPending}
        onSaveName={handleSaveName}
        savingName={updateNameMutation.isPending}
      />
    </div>
  );
}
