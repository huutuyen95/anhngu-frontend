import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"
import { Loader2 } from "lucide-react"
import Link from "next/link"
import type { ComponentProps, ReactNode } from "react"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "group/button relative inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap font-semibold transition-all outline-none select-none focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:ring-offset-1 disabled:pointer-events-none disabled:opacity-55 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        // Option 1: nút khối pill + bóng đặc, nhấn lún.
        primary:
          "rounded-full bg-brand text-white shadow-[0_3px_0_var(--color-brand-bold)] hover:bg-brand-bold active:translate-y-0.5 active:shadow-none",
        danger:
          "rounded-full bg-danger text-white shadow-[0_3px_0_#c24634] hover:brightness-95 active:translate-y-0.5 active:shadow-none",
        outline:
          "rounded-full border-[1.5px] border-border-strong bg-surface text-text hover:bg-surface-alt hover:border-brand aria-expanded:bg-surface-alt",
        ghost:
          "rounded-full text-text-secondary hover:bg-brand-soft hover:text-brand aria-expanded:bg-brand-soft",
        // Alias giữ tương thích code cũ.
        default:
          "rounded-full bg-brand text-white shadow-[0_3px_0_var(--color-brand-bold)] hover:bg-brand-bold active:translate-y-0.5 active:shadow-none",
        secondary: "rounded-full bg-surface-alt text-text hover:bg-brand-soft",
        destructive: "rounded-full bg-danger/10 text-danger hover:bg-danger/20",
        success: "rounded-full bg-success text-white hover:brightness-95",
        link: "text-brand underline-offset-4 hover:underline",
      },
      size: {
        sm: "h-9 px-3.5 text-[0.8rem]",
        md: "h-11 px-5 text-sm",
        lg: "h-12 px-6 text-base",
        default: "h-11 px-5 text-sm",
        icon: "size-11 rounded-full p-0",
        "icon-sm": "size-9 rounded-full p-0",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  }
)

type ButtonProps = ButtonPrimitive.Props &
  VariantProps<typeof buttonVariants> & {
    loading?: boolean
    iconLeft?: ReactNode
    iconRight?: ReactNode
    fullWidth?: boolean
  }

function Button({
  className,
  variant = "primary",
  size = "md",
  loading = false,
  iconLeft,
  iconRight,
  fullWidth = false,
  disabled,
  children,
  ...props
}: ButtonProps) {
  // Khi render thành phần khác (vd <Link>), báo base-ui rằng KHÔNG phải native <button>.
  const nativeButton = "render" in props ? false : undefined
  return (
    <ButtonPrimitive
      data-slot="button"
      nativeButton={nativeButton}
      disabled={disabled || loading}
      className={cn(
        buttonVariants({ variant, size }),
        fullWidth && "w-full",
        className
      )}
      {...props}
    >
      {loading && <Loader2 className="size-4 animate-spin" aria-hidden />}
      {!loading && iconLeft}
      {children}
      {!loading && iconRight}
    </ButtonPrimitive>
  )
}

/**
 * Nút dạng liên kết: render <Link> thuần với style của Button (tránh cảnh báo
 * nativeButton của base-ui khi dùng render={<Link>}).
 */
type ButtonLinkProps = ComponentProps<typeof Link> &
  VariantProps<typeof buttonVariants> & {
    iconLeft?: ReactNode
    iconRight?: ReactNode
    fullWidth?: boolean
  }

function ButtonLink({
  className,
  variant = "primary",
  size = "md",
  iconLeft,
  iconRight,
  fullWidth = false,
  children,
  ...props
}: ButtonLinkProps) {
  return (
    <Link
      data-slot="button-link"
      className={cn(
        buttonVariants({ variant, size }),
        fullWidth && "w-full",
        className
      )}
      {...props}
    >
      {iconLeft}
      {children}
      {iconRight}
    </Link>
  )
}

export { Button, ButtonLink, buttonVariants }
