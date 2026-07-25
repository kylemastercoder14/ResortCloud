"use client";

import * as React from "react";
import { Check, ChevronsUpDown, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

export type MultiSelectOption = {
  disabled?: boolean;
  label: string;
  value: string;
};

type MultiSelectProps = {
  className?: string;
  defaultValue?: string[];
  emptyText?: string;
  maxCount?: number;
  onValueChange: (value: string[]) => void;
  options: MultiSelectOption[];
  placeholder?: string;
  searchPlaceholder?: string;
  value?: string[];
};

function MultiSelect({
  className,
  defaultValue = [],
  emptyText = "No options found.",
  maxCount = 3,
  onValueChange,
  options,
  placeholder = "Select options",
  searchPlaceholder = "Search options...",
  value,
}: MultiSelectProps) {
  const [open, setOpen] = React.useState(false);
  const [internalValue, setInternalValue] = React.useState(defaultValue);
  const selectedValues = value ?? internalValue;
  const selectedSet = React.useMemo(
    () => new Set(selectedValues),
    [selectedValues],
  );
  const selectedOptions = options.filter((option) =>
    selectedSet.has(option.value),
  );

  function commit(nextValue: string[]) {
    if (value === undefined) {
      setInternalValue(nextValue);
    }
    onValueChange(nextValue);
  }

  function toggle(nextValue: string) {
    const nextSet = new Set(selectedValues);
    if (nextSet.has(nextValue)) {
      nextSet.delete(nextValue);
    } else {
      nextSet.add(nextValue);
    }
    commit(Array.from(nextSet));
  }

  function remove(nextValue: string) {
    commit(selectedValues.filter((item) => item !== nextValue));
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className={cn(
            "min-h-9 w-full justify-between rounded-lg bg-white px-3 font-normal",
            className,
          )}
        >
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
            {selectedOptions.length ? (
              <>
                {selectedOptions.slice(0, maxCount).map((option) => (
                  <Badge
                    key={option.value}
                    variant="secondary"
                    className="gap-1 rounded-md px-2 py-0.5 font-medium"
                  >
                    <span className="max-w-36 truncate">{option.label}</span>
                    <span
                      role="button"
                      tabIndex={0}
                      className="rounded-sm hover:bg-zinc-200"
                      onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        remove(option.value);
                      }}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          event.stopPropagation();
                          remove(option.value);
                        }
                      }}
                    >
                      <X className="size-3" />
                    </span>
                  </Badge>
                ))}
                {selectedOptions.length > maxCount ? (
                  <Badge
                    variant="secondary"
                    className="rounded-md px-2 py-0.5 font-medium"
                  >
                    +{selectedOptions.length - maxCount}
                  </Badge>
                ) : null}
              </>
            ) : (
              <span className="truncate text-zinc-500">{placeholder}</span>
            )}
          </div>
          <ChevronsUpDown className="ml-2 size-4 shrink-0 text-zinc-500" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-(--radix-popover-trigger-width) p-0"
      >
        <Command>
          <CommandInput placeholder={searchPlaceholder} />
          <CommandList>
            <CommandEmpty>{emptyText}</CommandEmpty>
            <CommandGroup>
              {options.map((option) => {
                const selected = selectedSet.has(option.value);

                return (
                  <CommandItem
                    key={option.value}
                    value={option.label}
                    disabled={option.disabled}
                    onSelect={() => toggle(option.value)}
                  >
                    <span
                      className={cn(
                        "mr-2 flex size-4 items-center justify-center rounded-sm border border-zinc-300",
                        selected && "border-black bg-black text-white",
                      )}
                    >
                      {selected ? <Check className="size-3" /> : null}
                    </span>
                    <span>{option.label}</span>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
          {selectedValues.length ? (
            <>
              <Separator />
              <div className="flex items-center justify-between gap-2 p-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 flex-1"
                  onClick={() => commit([])}
                >
                  Clear
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 flex-1"
                  onClick={() => setOpen(false)}
                >
                  Done
                </Button>
              </div>
            </>
          ) : null}
        </Command>
      </PopoverContent>
    </Popover>
  );
}

export { MultiSelect };
