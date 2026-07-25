"use client";

import { useMemo, useState } from "react";
import { Check, ChevronsUpDown, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export type CreatableSelectProps = {
  buttonClassName?: string;
  className?: string;
  createLabel?: (value: string) => string;
  emptyMessage?: string;
  minCreateLength?: number;
  onChange: (value: string) => void;
  options: readonly string[];
  placeholder?: string;
  popoverClassName?: string;
  searchPlaceholder?: string;
  value: string;
};

export function CreatableSelect({
  buttonClassName,
  className,
  createLabel = (value) => `Create "${value}"`,
  emptyMessage = "No options found",
  minCreateLength = 2,
  onChange,
  options,
  placeholder = "Select or create",
  popoverClassName,
  searchPlaceholder = "Search or create...",
  value,
}: CreatableSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const selectOptions = useMemo(
    () => Array.from(new Set([...options, value].filter(Boolean))),
    [options, value],
  );
  const normalizedQuery = query.trim().toLowerCase();
  const filteredOptions = selectOptions.filter((option) =>
    option.toLowerCase().includes(normalizedQuery),
  );
  const createValue = query.trim();
  const canCreate =
    createValue.length >= minCreateLength &&
    !selectOptions.some((option) => option.toLowerCase() === normalizedQuery);

  function selectValue(nextValue: string) {
    onChange(nextValue);
    setQuery("");
    setOpen(false);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className={cn(
            "h-9 w-full justify-between rounded-lg bg-white px-3 font-normal text-zinc-900",
            buttonClassName,
            className,
          )}
        >
          <span className={cn("truncate", !value && "text-zinc-500")}>
            {value || placeholder}
          </span>
          <ChevronsUpDown className="size-4 text-zinc-500" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className={cn("w-(--radix-popover-trigger-width) p-0", popoverClassName)}
      >
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={searchPlaceholder}
          className="mb-2 h-9 rounded-lg"
        />
        <div className="max-h-50 overflow-y-auto">
          {filteredOptions.map((option) => (
            <button
              key={option}
              type="button"
              className="flex h-9 w-full items-center gap-2 rounded-md px-2 text-left text-sm hover:bg-zinc-100"
              onClick={() => selectValue(option)}
            >
              <Check
                className={cn(
                  "size-4 text-zinc-900",
                  value === option ? "opacity-100" : "opacity-0",
                )}
              />
              <span className="truncate">{option}</span>
            </button>
          ))}
          {!filteredOptions.length && !canCreate ? (
            <div className="px-2 py-2 text-sm text-zinc-500">
              {emptyMessage}
            </div>
          ) : null}
          {canCreate ? (
            <button
              type="button"
              className="mt-1 flex h-9 w-full items-center gap-2 rounded-md px-2 text-left text-sm font-semibold hover:bg-zinc-100"
              onClick={() => selectValue(createValue)}
            >
              <Plus className="size-4" />
              {createLabel(createValue)}
            </button>
          ) : null}
        </div>
      </PopoverContent>
    </Popover>
  );
}
