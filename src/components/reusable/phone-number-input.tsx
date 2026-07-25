import Image from "next/image";

import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export type PhoneNumberInputProps = {
  className?: string;
  groupClassName?: string;
  id: string;
  inputClassName?: string;
  label?: string;
  labelClassName?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  value: string;
};

export function PhoneNumberInput({
  className,
  groupClassName,
  id,
  inputClassName,
  label,
  labelClassName,
  onChange,
  placeholder = "9123456789",
  required,
  value,
}: PhoneNumberInputProps) {
  return (
    <div className={cn("space-y-1.5", className)}>
      {label ? (
        <Label htmlFor={id} className={labelClassName}>
          {label}
        </Label>
      ) : null}
      <InputGroup className={cn("h-9 rounded-full", groupClassName)}>
        <InputGroupAddon className="gap-2 pl-3 pr-2">
          <Image src="/ph.png" alt="Philippines" width={20} height={20} />
          <span className="text-sm text-zinc-700">+63</span>
        </InputGroupAddon>
        <InputGroupInput
          id={id}
          value={value}
          inputMode="numeric"
          maxLength={10}
          pattern="[0-9]{10}"
          placeholder={placeholder}
          required={required}
          title="Enter 10 digits after +63"
          className={inputClassName}
          onChange={(event) =>
            onChange(normalizePhilippinePhone(event.target.value))
          }
        />
      </InputGroup>
    </div>
  );
}

export function normalizePhilippinePhone(value: string) {
  const digits = value.replace(/\D/g, "");
  const withoutCountryCode = digits.startsWith("63") ? digits.slice(2) : digits;
  const withoutLeadingZero = withoutCountryCode.startsWith("0")
    ? withoutCountryCode.slice(1)
    : withoutCountryCode;

  return withoutLeadingZero.slice(0, 10);
}
