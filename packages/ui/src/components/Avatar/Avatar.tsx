import { cx } from "../../utils/cx";
import { initials } from "../../utils/format";

export interface AvatarProps {
  name: string;
  src?: string;
  size?: "xs" | "sm" | "md" | "lg";
  className?: string;
}

const TINTS = ["brand", "accent", "forecast", "transfer", "warning"] as const;

/** Stable tint index from a name, so a member keeps the same color everywhere. */
export function avatarTint(name: string): (typeof TINTS)[number] {
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return TINTS[h % TINTS.length];
}

/** A household member. Shows the photo or initials on a stable tint. */
export function Avatar({ name, src, size = "md", className }: AvatarProps) {
  return (
    <span className={cx("mio-avatar", `mio-avatar--${size}`, `mio-avatar--${avatarTint(name)}`, className)} title={name}>
      {/* Framework-agnostic package: next/image is not available to consumers outside Next.js. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {src ? <img src={src} alt={name} /> :<span aria-label={name} role="img">{initials(name)}</span>}
    </span>
  );
}

export interface AvatarGroupProps {
  names: string[];
  max?: number;
  size?: AvatarProps["size"];
  className?: string;
}

/** Overlapping members, e.g. who can see an account. */
export function AvatarGroup({ names, max = 3, size = "sm", className }: AvatarGroupProps) {
  const shown = names.slice(0, max);
  const rest = names.length - shown.length;
  return (
    <span className={cx("mio-avatar-group", className)} aria-label={`Shared with ${names.join(", ")}`} role="group">
      {shown.map((n) => (
        <Avatar key={n} name={n} size={size} />
      ))}
      {rest > 0 && <span className={cx("mio-avatar", `mio-avatar--${size}`, "mio-avatar--more")}>+{rest}</span>}
    </span>
  );
}
