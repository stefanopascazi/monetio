"use client";

import { useState } from "react";
import { CATEGORY_COLORS, CATEGORY_ICON_NAMES, CategoryIcon, categoryIconLabel, categoryTint } from "@/components/common/CategoryIcon";

const optionClass =
  "relative inline-flex size-10 cursor-pointer items-center justify-center rounded-full ring-current ring-offset-2 ring-offset-surface transition has-[:checked]:ring-2 has-[:focus-visible]:outline has-[:focus-visible]:outline-2";

/** Visual icon + color pickers for a category; submits `icon` and `colorIndex` as native radios. */
export function CategoryAppearancePicker({ defaultIcon = "sparkles", defaultColor = 1 }: { defaultIcon?: string; defaultColor?: number }) {
  const [icon, setIcon] = useState(defaultIcon);
  const [color, setColor] = useState(defaultColor);

  return (
    <div className="mio-span-full flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <span className="inline-flex size-12 items-center justify-center rounded-full [&>svg]:size-6" style={categoryTint(color)} data-testid="category-preview">
          <CategoryIcon name={icon} />
        </span>
        <span className="text-sm text-ink-muted">Anteprima</span>
      </div>

      <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
        <legend className="mb-1.5 text-[13px] font-semibold">Colore</legend>
        <div className="flex flex-wrap gap-2">
          {CATEGORY_COLORS.map((n) => (
            <label key={n} className={optionClass} style={{ background: `var(--mio-chart-${n})`, color: `var(--mio-chart-${n})` }}>
              <input type="radio" name="colorIndex" value={n} checked={color === n} onChange={() => setColor(n)} className="sr-only" aria-label={`Colore ${n}`} />
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
        <legend className="mb-1.5 text-[13px] font-semibold">Icona</legend>
        <div className="flex flex-wrap gap-2">
          {CATEGORY_ICON_NAMES.map((name) => (
            <label key={name} className={`${optionClass} [&>svg]:size-5`} style={categoryTint(color)} title={categoryIconLabel(name)}>
              <input type="radio" name="icon" value={name} checked={icon === name} onChange={() => setIcon(name)} className="sr-only" aria-label={categoryIconLabel(name)} />
              <CategoryIcon name={name} />
            </label>
          ))}
        </div>
      </fieldset>
    </div>
  );
}
