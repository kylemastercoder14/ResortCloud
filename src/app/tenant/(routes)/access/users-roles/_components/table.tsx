"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import {
  Activity,
  Edit,
  KeyRound,
  MoreHorizontal,
  Trash2,
  UserX,
} from "lucide-react";
import { toast } from "sonner";

import { ReusableDataTable } from "@/components/reusable/data-table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useTRPC } from "@/trpc/client";
import { type UserRoleRecord, type UserRoleStatus } from "./data";

const STATUS_STYLES: Record<UserRoleStatus, string> = {
  Active: "border-black bg-black text-white",
  Invited: "border-zinc-200 bg-zinc-100 text-zinc-900",
  Suspended: "border-zinc-300 bg-white text-zinc-700",
};

const COLUMN_MENU = [
  "email",
  "role",
  "permissionTemplate",
  "permissionsCount",
  "status",
  "lastActive",
  "phone",
] as const;

const DUMMY_ACTIVITY_LOGS = [
  {
    id: "ACT-001",
    action: "Signed in",
    detail: "Successful password login from Chrome on Windows.",
    time: "Today, 9:42 AM",
  },
  {
    id: "ACT-002",
    action: "Permission set updated",
    detail: "Workspace access permissions changed by tenant admin.",
    time: "Yesterday, 4:18 PM",
  },
  {
    id: "ACT-003",
    action: "Password changed",
    detail: "Temporary password replaced for staff account.",
    time: "Jul 15, 2026, 2:05 PM",
  },
  {
    id: "ACT-004",
    action: "Profile updated",
    detail: "Role, phone number, or staff details were edited.",
    time: "Jul 14, 2026, 11:30 AM",
  },
] as const;

export function UserRoleTable() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const staffUsers = useQuery({
    ...trpc.tenant.usersRoles.list.queryOptions(),
    retry: false,
  });
  const suspendStaff = useMutation(
    trpc.tenant.usersRoles.suspend.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries(
          trpc.tenant.usersRoles.list.queryFilter(),
        );
        toast.success("Staff suspended.");
      },
      onError: (error) => {
        toast.error(error.message);
      },
    }),
  );
  const deleteStaff = useMutation(
    trpc.tenant.usersRoles.delete.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries(
          trpc.tenant.usersRoles.list.queryFilter(),
        );
        toast.success("Staff deleted.");
      },
      onError: (error) => {
        toast.error(error.message);
      },
    }),
  );
  const tableData = useMemo(() => {
    if (!staffUsers.data) {
      return [];
    }

    return staffUsers.data.map((staffUser): UserRoleRecord => {
      const initials = [staffUser.firstName, staffUser.lastName]
        .filter(Boolean)
        .map((name) => name[0])
        .join("")
        .slice(0, 2)
        .toUpperCase();

      return {
        id: staffUser.id,
        name: staffUser.displayName,
        email: staffUser.email,
        role: staffUser.roleName,
        permissionTemplate: staffUser.roleName,
        permissionsCount: staffUser.permissions.length,
        status: staffUser.status as UserRoleStatus,
        lastActive: "Never",
        phone: staffUser.phoneNumber,
        recordType: staffUser.recordType,
        initials: initials || "RC",
      };
    });
  }, [staffUsers.data]);

  if (staffUsers.isPending) {
    return <UserRoleTableSkeleton />;
  }

  const columns: ColumnDef<UserRoleRecord>[] = [
    {
      id: "select",
      header: ({ table }) => (
        <Checkbox
          aria-label="Select all users"
          checked={
            table.getIsAllPageRowsSelected() ||
            (table.getIsSomePageRowsSelected() && "indeterminate")
          }
          onCheckedChange={(value) =>
            table.toggleAllPageRowsSelected(Boolean(value))
          }
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          aria-label={`Select ${row.original.name}`}
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(Boolean(value))}
        />
      ),
      enableHiding: false,
    },
    {
      accessorKey: "name",
      header: "User",
      cell: ({ row }) => (
        <Link
          href={`/tenant/access/users-roles/${row.original.id}`}
          className="flex min-w-45 items-center gap-3"
        >
          <Avatar className="size-9">
            <AvatarFallback>{row.original.initials}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="truncate font-semibold text-zinc-950">
              {formatCellValue(row.original.name)}
            </p>
          </div>
        </Link>
      ),
      enableHiding: false,
    },
    {
      accessorKey: "email",
      header: "Email",
      cell: ({ row }) => formatCellValue(row.original.email),
    },
    {
      accessorKey: "role",
      header: "Role",
      cell: ({ row }) => formatCellValue(row.original.role),
    },
    {
      accessorKey: "permissionsCount",
      header: "Permissions",
      cell: ({ row }) => `${row.original.permissionsCount} selected`,
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => (
        <Badge
          variant="outline"
          className={cn(STATUS_STYLES[row.original.status])}
        >
          {row.original.status}
        </Badge>
      ),
    },
    {
      accessorKey: "phone",
      header: "Phone Number",
      cell: ({ row }) => formatCellValue(row.original.phone),
    },
    {
      accessorKey: "lastActive",
      header: "Last active",
      cell: ({ row }) => formatCellValue(row.original.lastActive),
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <UserRoleRowActions
          isDeleting={deleteStaff.isPending}
          isSuspending={suspendStaff.isPending}
          row={row.original}
          onDelete={(id) => deleteStaff.mutate({ id })}
          onSuspend={(id) => suspendStaff.mutate({ id })}
        />
      ),
      enableHiding: false,
    },
  ];

  return (
    <ReusableDataTable
      columnToggleIds={[...COLUMN_MENU]}
      columns={columns}
      data={tableData}
      emptyState={{
        title: "No users or roles found",
        description: "Try changing the filters or search term.",
      }}
      filterOptions={[
        { label: "All", value: "all" },
        { label: "Active", value: "active" },
        { label: "Invited", value: "invited" },
        { label: "Suspended", value: "suspended" },
      ]}
      rowLabel="users or roles"
    />
  );
}

function UserRoleRowActions({
  isDeleting,
  isSuspending,
  onDelete,
  onSuspend,
  row,
}: {
  isDeleting: boolean;
  isSuspending: boolean;
  onDelete: (id: string) => void;
  onSuspend: (id: string) => void;
  row: UserRoleRecord;
}) {
  const detailsHref = `/tenant/access/users-roles/${row.id}`;
  const displayName = formatCellValue(row.name);
  const isInvitation = row.recordType === "invitation";
  const [activityOpen, setActivityOpen] = useState(false);
  const [suspendOpen, setSuspendOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  return (
    <div className="flex justify-end">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            aria-label={`Open actions for ${displayName}`}
          >
            <MoreHorizontal className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          {!isInvitation ? (
            <>
              <DropdownMenuItem asChild>
                <Link href={detailsHref}>
                  <Edit className="size-4" />
                  Edit details
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href={`${detailsHref}?focus=password`}>
                  <KeyRound className="size-4" />
                  Change password
                </Link>
              </DropdownMenuItem>
            </>
          ) : null}
          <DropdownMenuItem
            onSelect={(event) => {
              event.preventDefault();
              setActivityOpen(true);
            }}
          >
            <Activity className="size-4" />
            View activity logs
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            disabled={
              isInvitation || row.status === "Suspended" || isSuspending
            }
            onSelect={(event) => {
              event.preventDefault();
              setSuspendOpen(true);
            }}
          >
            <UserX className="size-4" />
            Suspend staff
          </DropdownMenuItem>
          <DropdownMenuItem
            variant="destructive"
            disabled={isDeleting}
            onSelect={(event) => {
              event.preventDefault();
              setDeleteOpen(true);
            }}
          >
            <Trash2 className="size-4" />
            {isInvitation ? "Revoke invitation" : "Delete staff"}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Sheet open={activityOpen} onOpenChange={setActivityOpen}>
        <SheetContent className="w-full gap-0 p-0 max-w-md!">
          <SheetHeader className="border-b border-zinc-200 p-5">
            <SheetTitle className="text-lg font-bold">Activity logs</SheetTitle>
            <SheetDescription>
              Recent staff activity for {displayName}.
            </SheetDescription>
          </SheetHeader>
          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-6">
            <div className="relative">
              <div className="absolute left-3 top-3 h-[calc(100%-1.5rem)] w-px bg-zinc-200" />
              <div className="space-y-5">
                {DUMMY_ACTIVITY_LOGS.map((log, index) => (
                  <div key={log.id} className="relative flex gap-4">
                    <div className="relative z-10 mt-1 flex size-6 shrink-0 items-center justify-center rounded-full bg-white">
                      <span
                        className={cn(
                          "size-3 rounded-full border-2",
                          index === 0
                            ? "border-black bg-black"
                            : "border-zinc-300 bg-white",
                        )}
                      />
                    </div>
                    <div className="min-w-0 flex-1 rounded-lg border border-zinc-200 bg-white p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-zinc-950">
                            {log.action}
                          </p>
                          <p className="mt-1 text-xs text-zinc-500">
                            {log.detail}
                          </p>
                        </div>
                        <span className="shrink-0 text-[10px] font-medium text-zinc-500">
                          {log.time}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <AlertDialog open={suspendOpen} onOpenChange={setSuspendOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Suspend staff?</AlertDialogTitle>
            <AlertDialogDescription>
              {displayName} will lose active staff status until you update this
              account again.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel size="sm">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => onSuspend(row.id)}
              disabled={isSuspending}
              variant="default"
              size="sm"
            >
              {isSuspending ? "Suspending..." : "Suspend staff"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {isInvitation ? "Revoke invitation?" : "Delete staff?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {isInvitation
                ? `This revokes the pending invitation for ${displayName}.`
                : `This permanently removes ${displayName} from this workspace and deletes their login access.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel size="sm">Cancel</AlertDialogCancel>
            <AlertDialogAction
              size="sm"
              onClick={() => onDelete(row.id)}
              disabled={isDeleting}
            >
              {isDeleting
                ? isInvitation
                  ? "Revoking..."
                  : "Deleting..."
                : isInvitation
                  ? "Revoke invitation"
                  : "Delete staff"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function formatCellValue(value: string | null | undefined) {
  const trimmed = value?.trim();

  return trimmed ? trimmed : "--";
}

function UserRoleTableSkeleton() {
  return (
    <section className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-xs">
      <div className="flex min-h-14 items-center gap-3 border-b border-zinc-200 px-4">
        <Skeleton className="h-6 w-16" />
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <Skeleton className="size-4 rounded-full" />
          <Skeleton className="h-6 w-full max-w-sm" />
        </div>
        <Skeleton className="size-9 rounded-lg" />
      </div>
      <div className="overflow-x-auto">
        <div className="min-w-250">
          <div className="grid h-10 grid-cols-[48px_1.6fr_1.6fr_1fr_1fr_1fr_1fr_1fr_80px] items-center bg-zinc-50 px-4">
            {Array.from({ length: 9 }).map((_, index) => (
              <Skeleton key={index} className="h-4 w-20 max-w-[80%]" />
            ))}
          </div>
          {Array.from({ length: 6 }).map((_, rowIndex) => (
            <div
              key={rowIndex}
              className="grid h-15 grid-cols-[48px_1.6fr_1.6fr_1fr_1fr_1fr_1fr_1fr_80px] items-center border-t border-zinc-100 px-4"
            >
              <Skeleton className="size-4 rounded-sm" />
              <div className="flex items-center gap-3">
                <Skeleton className="size-9 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-36" />
                  <Skeleton className="h-3 w-48" />
                </div>
              </div>
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-6 w-20 rounded-full" />
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="ml-auto size-8 rounded-lg" />
            </div>
          ))}
        </div>
      </div>
      <div className="flex flex-col gap-3 border-t border-zinc-200 px-4 py-3 md:flex-row md:items-center md:justify-between">
        <Skeleton className="h-4 w-40" />
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-24" />
          <Skeleton className="h-8 w-20" />
          <Skeleton className="size-8" />
          <Skeleton className="h-8 w-16" />
        </div>
      </div>
    </section>
  );
}
