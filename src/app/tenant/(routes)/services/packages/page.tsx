"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Archive,
  BedDouble,
  Boxes,
  Eye,
  Pencil,
  Plus,
  Sparkles,
  Trash2,
  Wrench,
} from "lucide-react";
import { toast } from "sonner";

import { KpiGrid, type KpiGridItem } from "@/components/reusable/kpi-grid";
import { TenantBreadcrumb } from "@/components/tenant/tenant-breadcrumb";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useTRPC } from "@/trpc/client";

type PackageStatus = "Active" | "Inactive" | "Archived";

type PackageRow = {
  id: string;
  amenities: Array<{ id: string; code: string; icon: string; name: string }>;
  category: string;
  code: string;
  description: string;
  featured: boolean;
  maxGuests?: number;
  minNights: number;
  name: string;
  price: string;
  rooms: Array<{ id: string; code: string; name: string; type: string }>;
  services: Array<{ id: string; code: string; title: string }>;
  showOnBookingPage: boolean;
  status: PackageStatus;
};

function formatPeso(value: string) {
  const amount = Number(value.replace(/[^\d.]/g, ""));
  if (!Number.isFinite(amount) || amount <= 0) return value || "No price";
  return new Intl.NumberFormat("en-PH", {
    currency: "PHP",
    maximumFractionDigits: 0,
    style: "currency",
  }).format(amount);
}

export default function ServicePackagesPage() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const packages = useQuery({
    ...trpc.tenant.packages.list.queryOptions(),
    retry: false,
  });
  const packageRows = useMemo<PackageRow[]>(
    () => (packages.data ?? []).map((pack) => pack as PackageRow),
    [packages.data],
  );
  const invalidatePackages = () =>
    queryClient.invalidateQueries(trpc.tenant.packages.list.queryFilter());

  const updateStatus = useMutation(
    trpc.tenant.packages.updateStatus.mutationOptions({
      onSuccess: () => {
        toast.success("Package status updated.");
        invalidatePackages();
      },
      onError: (error) => toast.error(error.message),
    }),
  );
  const deletePackage = useMutation(
    trpc.tenant.packages.delete.mutationOptions({
      onSuccess: () => {
        toast.success("Package deleted.");
        invalidatePackages();
      },
      onError: (error) => toast.error(error.message),
    }),
  );

  const kpis = useMemo<KpiGridItem[]>(() => {
    const activeCount = packageRows.filter((pack) => pack.status === "Active").length;
    const bookingVisible = packageRows.filter((pack) => pack.showOnBookingPage).length;
    const includedItems = packageRows.reduce(
      (total, pack) =>
        total + pack.rooms.length + pack.services.length + pack.amenities.length,
      0,
    );

    return [
      {
        icon: <Boxes className="size-4" />,
        note: "Total bundles",
        title: "Packages",
        value: packageRows.length,
      },
      {
        icon: <Eye className="size-4" />,
        note: "Shown to guests",
        title: "Booking visible",
        value: bookingVisible,
      },
      {
        icon: <Sparkles className="size-4" />,
        note: "Active packages",
        title: "Active",
        value: activeCount,
      },
      {
        icon: <Archive className="size-4" />,
        note: "Rooms, services, amenities",
        title: "Included items",
        value: includedItems,
      },
    ];
  }, [packageRows]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <TenantBreadcrumb />
        <Button size="xs" asChild>
          <Link href="/tenant/services/packages/create">
            <Plus className="size-4" />
            Add package
          </Link>
        </Button>
      </div>

      <KpiGrid items={kpis} />

      <section className="grid gap-4 xl:grid-cols-2">
        {packages.isLoading ? (
          <Card className="rounded-xl border-zinc-200 bg-white p-6 text-sm font-medium text-zinc-500 xl:col-span-2">
            Loading packages...
          </Card>
        ) : packageRows.length ? (
          packageRows.map((pack) => (
            <Card
              key={pack.id}
              className="rounded-xl border-zinc-200 bg-white p-5 shadow-xs"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-base font-bold text-zinc-950">{pack.name}</h2>
                    <Badge variant={pack.status === "Active" ? "default" : "outline"}>
                      {pack.status}
                    </Badge>
                    {pack.featured ? <Badge variant="secondary">Featured</Badge> : null}
                  </div>
                  <p className="mt-1 text-xs font-medium text-zinc-500">
                    {pack.code} / {pack.category}
                  </p>
                </div>
                <p className="text-lg font-bold text-zinc-950">
                  {formatPeso(pack.price)}
                </p>
              </div>

              {pack.description ? (
                <p className="mt-3 text-sm text-zinc-600">{pack.description}</p>
              ) : null}

              <div className="mt-4 grid gap-3 md:grid-cols-3">
                <IncludedList
                  empty="No rooms"
                  icon={<BedDouble className="size-4" />}
                  items={pack.rooms.map((room) => `${room.code} - ${room.name}`)}
                  title="Rooms"
                />
                <IncludedList
                  empty="No services"
                  icon={<Wrench className="size-4" />}
                  items={pack.services.map((service) => `${service.code} - ${service.title}`)}
                  title="Services"
                />
                <IncludedList
                  empty="No amenities"
                  icon={<Sparkles className="size-4" />}
                  items={pack.amenities.map((amenity) => `${amenity.icon} ${amenity.name}`)}
                  title="Amenities"
                />
              </div>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-zinc-100 pt-4">
                <div className="flex flex-wrap gap-2 text-xs font-medium text-zinc-500">
                  <span>{pack.minNights} night minimum</span>
                  <span>{pack.maxGuests ? `${pack.maxGuests} guests max` : "No guest cap"}</span>
                  <span>{pack.showOnBookingPage ? "Visible online" : "Hidden online"}</span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Button size="xs" variant="outline" asChild>
                    <Link href={`/tenant/services/packages/${pack.id}`}>
                      <Pencil className="size-4" />
                      Edit
                    </Link>
                  </Button>
                  <Button
                    size="xs"
                    variant="outline"
                    disabled={updateStatus.isPending}
                    onClick={() =>
                      updateStatus.mutate({
                        id: pack.id,
                        status: pack.status === "Active" ? "Inactive" : "Active",
                      })
                    }
                  >
                    {pack.status === "Active" ? "Deactivate" : "Activate"}
                  </Button>
                  <Button
                    size="xs"
                    variant="destructive"
                    disabled={deletePackage.isPending}
                    onClick={() => deletePackage.mutate({ id: pack.id })}
                  >
                    <Trash2 className="size-4" />
                    Delete
                  </Button>
                </div>
              </div>
            </Card>
          ))
        ) : (
          <Card className="rounded-xl border-zinc-200 bg-white p-8 text-center xl:col-span-2">
            <Boxes className="mx-auto size-8 text-zinc-400" />
            <h2 className="mt-3 text-base font-bold text-zinc-950">
              No packages yet
            </h2>
            <p className="mx-auto mt-1 max-w-md text-sm text-zinc-500">
              Build bundles from existing rooms, services, and amenities.
            </p>
            <Button asChild className="mt-4" size="sm">
              <Link href="/tenant/services/packages/create">Create package</Link>
            </Button>
          </Card>
        )}
      </section>
    </div>
  );
}

function IncludedList({
  empty,
  icon,
  items,
  title,
}: {
  empty: string;
  icon: React.ReactNode;
  items: string[];
  title: string;
}) {
  return (
    <div className="rounded-lg border border-zinc-200 p-3">
      <div className="flex items-center gap-2 text-xs font-bold uppercase text-zinc-500">
        {icon}
        {title}
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {items.length ? (
          items.slice(0, 4).map((item) => (
            <Badge key={item} variant="outline">
              {item}
            </Badge>
          ))
        ) : (
          <span className="text-xs font-medium text-zinc-400">{empty}</span>
        )}
        {items.length > 4 ? (
          <Badge variant="secondary">+{items.length - 4}</Badge>
        ) : null}
      </div>
    </div>
  );
}
