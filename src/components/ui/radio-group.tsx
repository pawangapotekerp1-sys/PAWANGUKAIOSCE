"use client";

import * as React from "react";
import { CircleIcon } from "lucide-react";
import { cn } from "../../lib/utils";

type RadioGroupContextType = {
  name: string;
  value?: string;
  onValueChange?: (value: string) => void;
  disabled?: boolean;
};

const RadioGroupContext = React.createContext<RadioGroupContextType | null>(null);

export interface RadioGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  name?: string;
  disabled?: boolean;
}

export function RadioGroup({
  className,
  value: controlledValue,
  defaultValue,
  onValueChange,
  name: nameProp,
  disabled = false,
  children,
  ...props
}: RadioGroupProps) {
  const generatedName = React.useId();
  const name = nameProp || generatedName;
  const [uncontrolledValue, setUncontrolledValue] = React.useState(defaultValue ?? "");
  const isControlled = controlledValue !== undefined;
  const value = isControlled ? controlledValue : uncontrolledValue;

  const handleValueChange = React.useCallback(
    (nextValue: string) => {
      if (!isControlled) {
        setUncontrolledValue(nextValue);
      }
      onValueChange?.(nextValue);
    },
    [isControlled, onValueChange]
  );

  return (
    <RadioGroupContext.Provider value={{ name, value, onValueChange: handleValueChange, disabled }}>
      <div role="radiogroup" className={cn("grid gap-2", className)} {...props}>
        {children}
      </div>
    </RadioGroupContext.Provider>
  );
}

export interface RadioGroupItemProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange"> {
  value: string;
}

export function RadioGroupItem({
  className,
  value,
  id,
  disabled: itemDisabled,
  ...props
}: RadioGroupItemProps) {
  const context = React.useContext(RadioGroupContext);
  const isChecked = context?.value === value;
  const disabled = itemDisabled || context?.disabled;

  return (
    <span className="relative inline-flex items-center justify-center">
      <input
        type="radio"
        id={id}
        name={context?.name}
        value={value}
        checked={isChecked}
        disabled={disabled}
        onChange={() => context?.onValueChange?.(value)}
        className="peer sr-only"
        {...props}
      />
      <span
        onClick={() => {
          if (!disabled) {
            context?.onValueChange?.(value);
          }
        }}
        aria-hidden="true"
        className={cn(
          "aspect-square size-4 shrink-0 rounded-full border border-primary text-primary shadow-2xs transition-colors flex items-center justify-center cursor-pointer peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-2",
          isChecked && "bg-primary text-primary-foreground",
          disabled && "cursor-not-allowed opacity-50",
          className
        )}
      >
        {isChecked && <CircleIcon className="size-2 fill-current text-primary-foreground" />}
      </span>
    </span>
  );
}
