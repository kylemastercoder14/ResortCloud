"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { ShieldCheck, UserCheck, UserPlus, Users } from "lucide-react";

import { KpiGrid, type KpiGridItem } from "@/components/reusable/kpi-grid";
import { Skeleton } from "@/components/ui/skeleton";
import { useTRPC } from "@/trpc/client";

export function Kpi() {
  const trpc = useTRPC();
  const staffUsers = useQuery({
    ...trpc.tenant.usersRoles.list.queryOptions(),
    retry: false,
  });
  const items = useMemo<KpiGridItem[]>(() => {
    const users = staffUsers.data ?? [];
    const totalUsers = users.length;
    const activeUsers = users.filter((user) => user.status === "Active").length;
    const invitedUsers = users.filter((user) => user.status === "Invited").length;
    const roleCount = new Set(
      users.map((user) => user.roleName).filter(Boolean),
    ).size;

    return [
      {
        title: "Total users",
        value: staffUsers.isPending ? <Skeleton className="h-8 w-12" /> : totalUsers,
        note: `Across ${roleCount} active roles`,
        icon: <Users className="size-4" />,
      },
      {
        title: "Active users",
        value: staffUsers.isPending ? <Skeleton className="h-8 w-12" /> : activeUsers,
        note: "Ready to access workspace",
        icon: <UserCheck className="size-4" />,
      },
      {
        title: "Invites pending",
        value: staffUsers.isPending ? <Skeleton className="h-8 w-12" /> : invitedUsers,
        note: "Waiting for acceptance",
        icon: <UserPlus className="size-4" />,
      },
      {
        title: "Permission templates",
        value: staffUsers.isPending ? <Skeleton className="h-8 w-12" /> : roleCount,
        note: "Reusable access presets",
        icon: <ShieldCheck className="size-4" />,
      },
    ];
  }, [staffUsers.data, staffUsers.isPending]);

  return <KpiGrid columnsClassName="sm:grid-cols-2 xl:grid-cols-4" items={items} />;
}
