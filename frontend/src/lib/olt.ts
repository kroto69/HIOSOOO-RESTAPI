import type { DeviceStatus, Onu, PonPort } from "@/types/api";
import { getDeviceStatus, getOnus, getPons } from "@/lib/api";
import { normalizeOnuStatus } from "@/lib/format";

export interface OltSummary {
  status: DeviceStatus | null;
  pons: PonPort[];
  onus: Onu[];
  totalOnus: number | null;
  offlineOnus: number | null;
  onlineOnus: number | null;
  errors: string[];
}

export async function fetchOltSummary(deviceId: string): Promise<OltSummary> {
  const errors: string[] = [];
  const status = await getDeviceStatus(deviceId).catch((err) => {
    errors.push(err.message || "Status unavailable");
    return null;
  });

  const pons = await getPons(deviceId).catch((err) => {
    errors.push(err.message || "PON list unavailable");
    return [] as PonPort[];
  });

  const onuLists = await Promise.all(
    pons.map(async (pon) => {
      try {
        return await getOnus(deviceId, pon.pon_id);
      } catch (err) {
        errors.push(
          err instanceof Error
            ? err.message
            : `Failed to load ONUs for PON ${pon.pon_id}`
        );
        return [] as Onu[];
      }
    })
  );

  const onus = onuLists.flat();
  const totalOnus = onus.length || (pons.length ? 0 : null);
  const onlineOnus = onus.filter(
    (onu) => normalizeOnuStatus(onu.status) === "online"
  ).length;
  const offlineOnus = totalOnus === null ? null : totalOnus - onlineOnus;

  return {
    status,
    pons,
    onus,
    totalOnus,
    offlineOnus,
    onlineOnus: totalOnus === null ? null : onlineOnus,
    errors,
  };
}
