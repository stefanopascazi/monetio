"use client";

import { Lock, UserCheck, Users } from "lucide-react";
import { cx } from "../../utils/cx";
import { Avatar } from "../Avatar/Avatar";
import { Chip } from "../Chip/Chip";
import { SegmentedControl } from "../SegmentedControl/SegmentedControl";

export interface HouseholdMember {
  id: string;
  name: string;
}

export type VisibilityMode = "private" | "household" | "custom";

export interface Visibility {
  mode: VisibilityMode;
  /** Member ids that can see the item when mode is "custom". */
  memberIds: string[];
}

export interface VisibilityPickerProps {
  members: HouseholdMember[];
  /** Id of the current user (always included, not toggleable). */
  ownerId: string;
  value: Visibility;
  onChange: (value: Visibility) => void;
  label?: string;
  className?: string;
}

/** Ids that can see an item for a given visibility. */
export function resolveViewers(v: Visibility, members: HouseholdMember[], ownerId: string): string[] {
  if (v.mode === "private") return [ownerId];
  if (v.mode === "household") return members.map((m) => m.id);
  return Array.from(new Set([ownerId, ...v.memberIds]));
}

/** Chooses who in the household can see an account, budget or transaction. */
export function VisibilityPicker({ members, ownerId, value, onChange, label = "Who can see this", className }: VisibilityPickerProps) {
  const others = members.filter((m) => m.id !== ownerId);
  const viewers = resolveViewers(value, members, ownerId);
  const summary =
    value.mode === "private"
      ? "Only you"
      : value.mode === "household"
        ? "Everyone in the household"
        : `You and ${viewers.length - 1} other${viewers.length - 1 === 1 ? "" : "s"}`;

  return (
    <fieldset className={cx("mio-visibility", className)}>
      <legend className="mio-visibility__legend">{label}</legend>
      <SegmentedControl<VisibilityMode>
        aria-label={label}
        block
        value={value.mode}
        onChange={(mode) => onChange({ ...value, mode })}
        options={[
          { value: "private", label: "Private", icon: <Lock aria-hidden="true" /> },
          { value: "household", label: "Household", icon: <Users aria-hidden="true" /> },
          { value: "custom", label: "Choose", icon: <UserCheck aria-hidden="true" /> },
        ]}
      />
      {value.mode === "custom" && (
        <div className="mio-visibility__members" role="group" aria-label="Members">
          {others.map((m) => {
            const on = value.memberIds.includes(m.id);
            return (
              <Chip
                key={m.id}
                selected={on}
                leading={<Avatar name={m.name} size="sm" />}
                onSelectedChange={(sel) =>
                  onChange({
                    ...value,
                    memberIds: sel ? [...value.memberIds, m.id] : value.memberIds.filter((id) => id !== m.id),
                  })
                }
              >
                {m.name}
              </Chip>
            );
          })}
        </div>
      )}
      <p className="mio-visibility__summary" aria-live="polite">
        {summary}
      </p>
    </fieldset>
  );
}
