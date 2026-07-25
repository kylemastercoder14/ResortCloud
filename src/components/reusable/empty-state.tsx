import type { LucideIcon } from "lucide-react";
import { Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type EmptyStateProps = {
  actionLabel?: string;
  className?: string;
  description?: string;
  icon?: LucideIcon;
  onAction?: () => void;
  title: string;
};

export function EmptyState({
  actionLabel,
  className,
  description,
  icon: Icon = Search,
  onAction,
  title,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex min-h-72 flex-col items-center justify-center px-6 py-12 text-center",
        className,
      )}
    >
      <Icon className="size-15 stroke-[1.6] text-zinc-500" />
      <h3 className="mt-6 text-base font-bold text-[#303030]">{title}</h3>
      {description ? (
        <p className="mt-1 text-xs font-medium text-zinc-500">
          {description}
        </p>
      ) : null}
      {actionLabel ? (
        <Button className="mt-4" size="xs" onClick={onAction}>
          {actionLabel}
        </Button>
      ) : null}
    </div>
  );
}
