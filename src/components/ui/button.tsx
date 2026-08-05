import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"
import { CircleNotch } from "@phosphor-icons/react"

export type ButtonVariant = "primary" | "secondary" | "outline" | "ghost" | "destructive" | "default" | "link";
export type ButtonSize = "sm" | "md" | "lg" | "default" | "icon" | "icon-sm";

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] cursor-pointer select-none",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90 hover:shadow-md shadow-sm",
        primary: "bg-primary text-primary-foreground hover:bg-primary/90 hover:shadow-md shadow-sm",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90 hover:shadow-md shadow-sm",
        outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground hover:border-accent/80 hover:shadow-xs",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/85 hover:shadow-xs",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline cursor-pointer",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        md: "h-10 px-4 py-2",
        lg: "h-11 rounded-md px-8 text-base",
        icon: "h-10 w-10",
        "icon-sm": "h-8 w-8",
      },
      fullWidth: {
        true: "w-full",
      }
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  }
)

type ButtonStyleOptions = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  className?: string;
};

export function getButtonClassName({
  variant = "primary",
  size = "md",
  fullWidth = false,
  className,
}: ButtonStyleOptions = {}) {
  return cn(buttonVariants({ variant, size, fullWidth, className }));
}

export function getButtonStyleProps({
  variant = "primary",
  size = "md",
  fullWidth = false,
  className,
}: ButtonStyleOptions = {}) {
  return {
    className: getButtonClassName({
      variant,
      size,
      fullWidth,
      className,
    }),
    "data-full-width": fullWidth ? "true" : "false",
    "data-size": size,
    "data-variant": variant,
  };
}

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
  loading?: boolean
  loadingLabel?: string
  leadingIcon?: React.ReactNode
  trailingIcon?: React.ReactNode
  fullWidth?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", fullWidth, asChild = false, loading = false, loadingLabel = "Memproses...", leadingIcon, trailingIcon, children, disabled, type = "button", ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    const isDisabled = disabled || loading

    if (asChild) {
      return (
        <Comp
          className={cn(buttonVariants({ variant, size, fullWidth, className }))}
          ref={ref}
          disabled={isDisabled}
          data-variant={variant}
          data-size={size}
          {...props}
        >
          {children}
        </Comp>
      )
    }

    return (
      <Comp
        className={cn(buttonVariants({ variant, size, fullWidth, className }))}
        ref={ref}
        disabled={isDisabled}
        type={type}
        aria-busy={loading || undefined}
        data-variant={variant}
        data-size={size}
        {...props}
      >
        {loading ? <CircleNotch aria-hidden="true" className="animate-spin mr-2 shrink-0" size={16} weight="bold" /> : leadingIcon ? <span className="shrink-0 mr-2">{leadingIcon}</span> : null}
        {loading ? loadingLabel : children}
        {!loading && trailingIcon ? <span className="shrink-0 ml-2">{trailingIcon}</span> : null}
      </Comp>
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
export default Button;
