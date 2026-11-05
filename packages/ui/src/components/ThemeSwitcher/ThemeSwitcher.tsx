"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "../../hooks/useTheme";
import type { ThemePreference } from "../../utils/theme";
import { SegmentedControl } from "../SegmentedControl/SegmentedControl";
import { messages } from "../../i18n";

export interface ThemeSwitcherProps {
  /** Show text labels next to the icons. */
  showLabels?: boolean;
  size?: "sm" | "md";
  className?: string;
}

/** System / Light / Dark switch. Persists the choice and applies it to <html data-theme>. */
export function ThemeSwitcher({ showLabels = false, size = "sm", className }: ThemeSwitcherProps) {
  const { preference, setPreference } = useTheme();
  const label = (text: string) => (showLabels ? text : <span className="mio-visually-hidden">{text}</span>);
  return (
    <SegmentedControl<ThemePreference>
      aria-label={messages.theme.label}
      size={size}
      className={className}
      value={preference}
      onChange={setPreference}
      options={[
        { value: "system", label: label(messages.theme.system), icon: <Monitor aria-hidden="true" /> },
        { value: "light", label: label(messages.theme.light), icon: <Sun aria-hidden="true" /> },
        { value: "dark", label: label(messages.theme.dark), icon: <Moon aria-hidden="true" /> },
      ]}
    />
  );
}
