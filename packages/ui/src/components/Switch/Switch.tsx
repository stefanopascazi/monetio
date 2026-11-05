"use client";

import type { ReactNode } from "react";
import { useId } from "react";
import { useControllableState } from "../../hooks/useControllableState";
import { cx } from "../../utils/cx";

export interface SwitchProps {
  label: ReactNode;
  description?: ReactNode;
  checked?: boolean;
  defaultChecked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  disabled?: boolean;
  id?: string;
  className?: string;
}

/** On/off setting that applies immediately (no save button needed). */
export function Switch({
  label,
  description,
  checked,
  defaultChecked = false,
  onCheckedChange,
  disabled,
  id,
  className,
}: SwitchProps) {
  const autoId = useId();
  const switchId = id ?? autoId;
  const [on, setOn] = useControllableState(checked, defaultChecked, onCheckedChange);
  return (
    <div className={cx("mio-switch", disabled && "is-disabled", className)}>
      <div className="mio-switch__text">
        <label htmlFor={switchId} className="mio-switch__label">
          {label}
        </label>
        {description && (
          <p className="mio-switch__desc" id={`${switchId}-desc`}>
            {description}
          </p>
        )}
      </div>
      <button
        id={switchId}
        type="button"
        role="switch"
        aria-checked={on}
        aria-describedby={description ? `${switchId}-desc` : undefined}
        disabled={disabled}
        className="mio-switch__track"
        onClick={() => setOn(!on)}
      >
        <span className="mio-switch__thumb" />
      </button>
    </div>
  );
}
