import { Link } from "react-router-dom";
import { ArrowUpRight, Cpu, Users } from "lucide-react";

import { Card } from "@/components/ui/card";
import StatusBadge from "@/components/StatusBadge";
import { displayHost } from "@/lib/api";

interface OltCardProps {
  id: string;
  name: string;
  baseUrl: string;
  status: string;
  totalOnus: number | null;
  offlineOnus: number | null;
  model?: string;
}

export default function OltCard({
  id,
  name,
  baseUrl,
  status,
  totalOnus,
  offlineOnus,
  model,
}: OltCardProps) {
  return (
    <Link to={`/olt/${id}`} className="block">
      <Card className="card-hover relative overflow-hidden">
        <div className="absolute right-0 top-0 h-24 w-24 rounded-full bg-primary/10 blur-2xl" />
        <div className="p-4 sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                OLT Device
              </p>
              <h3 className="mt-2 text-lg font-semibold text-slate-900 sm:text-xl">
                {name}
              </h3>
              <p className="mt-1 text-sm text-slate-500 break-all">
                {displayHost(baseUrl)}
              </p>
              {model && (
                <p className="mt-2 text-xs font-semibold text-slate-400">
                  {model}
                </p>
              )}
            </div>
            <div className="sm:self-start">
              <StatusBadge status={status} />
            </div>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl bg-slate-50 p-3">
              <div className="flex items-center gap-2 text-slate-500">
                <Users className="h-4 w-4" />
                <span className="text-xs font-semibold uppercase">Total ONU</span>
              </div>
              <p className="mt-2 text-lg font-bold text-slate-900">
                {totalOnus === null ? "—" : totalOnus}
              </p>
            </div>
            <div className="rounded-xl bg-slate-50 p-3">
              <div className="flex items-center gap-2 text-slate-500">
                <Cpu className="h-4 w-4" />
                <span className="text-xs font-semibold uppercase">Offline</span>
              </div>
              <p className="mt-2 text-lg font-bold text-slate-900">
                {offlineOnus === null ? "—" : offlineOnus}
              </p>
            </div>
          </div>
          <div className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-primary">
            View detail
            <ArrowUpRight className="h-4 w-4" />
          </div>
        </div>
      </Card>
    </Link>
  );
}
