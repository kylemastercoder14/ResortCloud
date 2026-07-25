"use client";

import { useQuery } from "@tanstack/react-query";

import { MoreActions as ReusableMoreActions } from "@/components/reusable/more-actions";
import { useTRPC } from "@/trpc/client";

export function MoreActions() {
  const trpc = useTRPC();
  const staffUsers = useQuery({
    ...trpc.tenant.usersRoles.list.queryOptions(),
    retry: false,
  });

  const exportRows = (staffUsers.data ?? []).map((user) => ({
    name: formatExportValue(user.displayName),
    email: formatExportValue(user.email),
    username: formatExportValue(user.username),
    role: formatExportValue(user.roleName),
    status: formatExportValue(user.status),
    phone: formatExportValue(user.phoneNumber),
    permissions: user.permissions.length
      ? user.permissions.join(", ")
      : "--",
  }));

  return (
    <ReusableMoreActions
      columns={[
        { header: "Name", key: "name" },
        { header: "Email", key: "email" },
        { header: "Username", key: "username" },
        { header: "Role", key: "role" },
        { header: "Status", key: "status" },
        { header: "Phone", key: "phone" },
        { header: "Permissions", key: "permissions" },
      ]}
      data={exportRows}
      filename="users-roles"
      title="Users & Roles"
    />
  );
}

function formatExportValue(value: string | null | undefined) {
  const trimmed = value?.trim();

  return trimmed ? trimmed : "--";
}
