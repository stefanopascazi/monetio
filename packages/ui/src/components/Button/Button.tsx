import type { ButtonHTMLAttributes, ReactNode, Ref } from "react";
import { cx } from "../../utils/cx";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Icon rendered before the label. */
  iconStart?: ReactNode;
  /** Icon rendered after the label. */
  iconEnd?: ReactNode;
  /** Square button showing only `iconStart`; requires `aria-label`. */
  iconOnly?: boolean;
  /** Shows a spinner and disables the button. */
  loading?: boolean;
  /** Stretches to the container width. */
  block?: boolean;
  ref?: Ref<HTMLButtonElement>;
}

export function Button({
  variant = "primary",
  size = "md",
  iconStart,
  iconEnd,
  iconOnly,
  loading,
  block,
  className,
  children,
  disabled,
  type = "button",
  ...rest
}: ButtonProps) {
  return (
    <button
      {...rest}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cx(
        "mio-btn",
        `mio-btn--${variant}`,
        `mio-btn--${size}`,
        iconOnly && "mio-btn--icon",
        block && "mio-btn--block",
        className,
      )}
    >
      {loading ? <span className="mio-btn__spinner" aria-hidden="true" /> : iconStart}
      {!iconOnly && children}
      {!iconOnly && iconEnd}
    </button>
  );
}
