"use client";

import * as React from "react";
import { Clock8Icon } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type TimePickerProps = Omit<
  React.ComponentProps<typeof Input>,
  "onChange" | "type" | "value"
> & {
  label?: string;
  onValueChange?: (value: string) => void;
  value?: string;
};

function TimePicker({
  className,
  id,
  label,
  onValueChange,
  step = "1",
  value,
  ...props
}: TimePickerProps) {
  const input = (
    <div className="relative">
      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center justify-center pl-3 text-muted-foreground peer-disabled:opacity-50">
        <Clock8Icon className="size-4" />
        <span className="sr-only">Time</span>
      </div>
      <Input
        id={id}
        type="time"
        step={step}
        value={value}
        onChange={(event) => onValueChange?.(event.target.value)}
        className={cn(
          "peer appearance-none bg-background pl-9 [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none",
          className,
        )}
        {...props}
      />
    </div>
  );

  if (!label) {
    return input;
  }

  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>{label}</Label>
      {input}
    </div>
  );
}

export { TimePicker };
