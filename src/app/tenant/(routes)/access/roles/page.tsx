import Link from "next/link";
import { IconPlus } from "@tabler/icons-react";

import { TenantBreadcrumb } from "@/components/tenant/tenant-breadcrumb";
import { Button } from "@/components/ui/button";
import { RoleTable } from "./_components/role-table";

const Page = () => {
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <TenantBreadcrumb />
        <Button size="xs" asChild>
          <Link href="/tenant/access/roles/create">
            <IconPlus className="size-4" />
            Add role
          </Link>
        </Button>
      </div>
      <RoleTable />
    </div>
  );
};

export default Page;
