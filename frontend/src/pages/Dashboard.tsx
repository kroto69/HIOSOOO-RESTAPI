import { useMemo, useState } from "react";
import { useQueries, useQuery } from "@tanstack/react-query";
import { Activity, Network, Server, Users } from "lucide-react";

import { listDevices } from "@/lib/api";
import { fetchOltSummary } from "@/lib/olt";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import OltCard from "@/components/OltCard";
import LoadingGrid from "@/components/LoadingGrid";
import EmptyState from "@/components/EmptyState";
import { useUiStore } from "@/store/useUiStore";

export default function Dashboard() {
  const {
    dashboardSearch,
    setDashboardSearch,
    modelById,
    autoRefreshEnabled,
  } = useUiStore();

  const { data: devices = [], isLoading, error } = useQuery({
    queryKey: ["devices"],
    queryFn: listDevices,
    refetchInterval: autoRefreshEnabled ? 30000 : false,
  });

  const summaries = useQueries({
    queries: devices.map((device) => ({
      queryKey: ["olt-summary", device.id],
      queryFn: () => fetchOltSummary(device.id),
      refetchInterval: autoRefreshEnabled ? 30000 : false,
      enabled: devices.length > 0,
    })),
  });

  const summaryMap = useMemo(() => {
    const map = new Map<string, (typeof summaries)[number]["data"]>();
    summaries.forEach((query, index) => {
      if (query.data) {
        map.set(devices[index].id, query.data);
      }
    });
    return map;
  }, [summaries, devices]);

  const statusForSummary = (
    summary?: (typeof summaries)[number]["data"]
  ): "online" | "offline" | "unknown" => {
    if (!summary) return "unknown";
    const hasData =
      (summary.pons?.length || 0) > 0 || (summary.totalOnus || 0) > 0;
    if (summary.status?.reachable === true || hasData) return "online";
    if (summary.status?.reachable === false) return "offline";
    return "unknown";
  };

  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedOltId, setSelectedOltId] = useState("all");

  const filteredDevices = useMemo(() => {
    return devices.filter((device) => {
      const summary = summaryMap.get(device.id);
      const status = statusForSummary(summary);
      const matchesStatus =
        statusFilter === "all" || statusFilter === status;
      const matchesSelectedOlt =
        selectedOltId === "all" || device.id === selectedOltId;
      const query = dashboardSearch.toLowerCase();
      const matchesSearch =
        device.name.toLowerCase().includes(query) ||
        device.base_url.toLowerCase().includes(query) ||
        device.id.toLowerCase().includes(query);
      return matchesStatus && matchesSearch && matchesSelectedOlt;
    });
  }, [devices, summaryMap, statusFilter, dashboardSearch, selectedOltId]);

  const stats = useMemo(() => {
    const totalOlts = devices.length;
    const onlineDevices = devices.filter((device) => {
      const summary = summaryMap.get(device.id);
      return statusForSummary(summary) === "online";
    }).length;
    const offlineDevices = totalOlts - onlineDevices;
    const activeOnus = Array.from(summaryMap.values()).reduce((acc, summary) => {
      return acc + (summary?.onlineOnus || 0);
    }, 0);
    const networkUptime =
      totalOlts > 0 ? `${Math.round((onlineDevices / totalOlts) * 100)}%` : "—";
    return {
      totalOlts,
      activeOnus,
      offlineDevices,
      networkUptime,
    };
  }, [devices, summaryMap]);

  return (
    <div className="space-y-6 sm:space-y-10">
      <section className="relative overflow-hidden rounded-2xl bg-hero-gradient text-white sm:rounded-3xl">
        <div className="absolute inset-0 bg-mesh opacity-70" />
        <div className="relative z-10 px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="border-white/20 bg-white/15 text-white shadow-none">
              <div className="p-4 sm:p-5">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <Server className="h-4 w-4" />
                  Total OLTs
                </div>
                <p className="mt-3 text-xl font-bold sm:text-2xl">
                  {stats.totalOlts}
                </p>
              </div>
            </Card>
            <Card className="border-white/20 bg-white/15 text-white shadow-none">
              <div className="p-4 sm:p-5">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <Users className="h-4 w-4" />
                  Active ONUs
                </div>
                <p className="mt-3 text-xl font-bold sm:text-2xl">
                  {stats.activeOnus}
                </p>
              </div>
            </Card>
            <Card className="border-white/20 bg-white/15 text-white shadow-none">
              <div className="p-4 sm:p-5">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <Activity className="h-4 w-4" />
                  Offline Devices
                </div>
                <p className="mt-3 text-xl font-bold sm:text-2xl">
                  {stats.offlineDevices}
                </p>
              </div>
            </Card>
            <Card className="border-white/20 bg-white/15 text-white shadow-none">
              <div className="p-4 sm:p-5">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <Network className="h-4 w-4" />
                  Network Uptime
                </div>
                <p className="mt-3 text-xl font-bold sm:text-2xl">
                  {stats.networkUptime}
                </p>
              </div>
            </Card>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-slate-900 sm:text-xl">
              OLT Fleet Overview
            </h3>
            <p className="text-sm text-slate-500">
              Klik card untuk melihat detail PON dan ONU.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Input
              placeholder="Cari OLT berdasarkan nama, IP, atau ID"
              value={dashboardSearch}
              onChange={(event) => setDashboardSearch(event.target.value)}
              className="w-full sm:w-72"
            />
            <Select value={selectedOltId} onValueChange={setSelectedOltId}>
              <SelectTrigger className="w-full sm:w-52">
                <SelectValue placeholder="Pilih OLT" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua OLT</SelectItem>
                {devices.map((device) => (
                  <SelectItem key={device.id} value={device.id}>
                    {device.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Filter status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Status</SelectItem>
                <SelectItem value="online">Online</SelectItem>
                <SelectItem value="offline">Offline</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {isLoading && <LoadingGrid />}

        {error && !isLoading && (
          <EmptyState
            title="Gagal memuat data OLT"
            description="Periksa koneksi backend atau konfigurasi API."
          />
        )}

        {!isLoading && !error && filteredDevices.length === 0 && (
          <EmptyState
            title="Belum ada OLT terdaftar"
            description="Tambahkan perangkat baru melalui menu Settings."
          />
        )}

        {!isLoading && !error && filteredDevices.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {filteredDevices.map((device) => {
              const summary = summaryMap.get(device.id);
              const status = statusForSummary(summary);
              return (
                <OltCard
                  key={device.id}
                  id={device.id}
                  name={device.name}
                  baseUrl={device.base_url}
                  status={status}
                  totalOnus={
                    summary?.totalOnus ?? (summary ? summary.onus.length : null)
                  }
                  offlineOnus={summary?.offlineOnus ?? null}
                  model={modelById[device.id]}
                />
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
