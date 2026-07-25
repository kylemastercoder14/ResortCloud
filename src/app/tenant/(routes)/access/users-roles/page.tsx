import { TenantBreadcrumb } from "@/components/tenant/tenant-breadcrumb";
import { Button } from "@/components/ui/button";
import { IconPlus } from "@tabler/icons-react";
import Link from "next/link";
import { InviteUserDialog } from "./_components/invite-user-dialog";
import { Kpi } from "./_components/kpi";
import { MoreActions } from "./_components/more-actions";
import { UserRoleTable } from "./_components/table";

const Page = () => {
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <TenantBreadcrumb />
        <div className="flex items-center gap-3">
          <MoreActions />
          <InviteUserDialog />
          <Button
            size="xs"
            asChild
          >
            <Link href="/tenant/access/users-roles/create">
              <IconPlus className="size-4" />Add user role
            </Link>
          </Button>
        </div>
      </div>
      <Kpi />
      <UserRoleTable />
    </div>
  );
};

export default Page;
