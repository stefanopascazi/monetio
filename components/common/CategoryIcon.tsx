import { createElement } from "react";
import {
  ArrowLeftRight,
  Baby,
  Briefcase,
  Car,
  Droplet,
  Flame,
  Gift,
  HeartPulse,
  Home,
  Landmark,
  type LucideIcon,
  Percent,
  Receipt,
  Scale,
  ShoppingBag,
  ShoppingCart,
  Smartphone,
  Sparkles,
  Tag,
  Trash2,
  TrendingUp,
  Tv,
  Zap,
} from "lucide-react";

// Icon names stored on categories (lucide kebab-case) to components.
const ICONS: Record<string, LucideIcon> = {
  "arrow-left-right": ArrowLeftRight,
  baby: Baby,
  briefcase: Briefcase,
  car: Car,
  droplet: Droplet,
  flame: Flame,
  gift: Gift,
  "heart-pulse": HeartPulse,
  home: Home,
  landmark: Landmark,
  percent: Percent,
  receipt: Receipt,
  scale: Scale,
  "shopping-bag": ShoppingBag,
  "shopping-cart": ShoppingCart,
  smartphone: Smartphone,
  sparkles: Sparkles,
  "trash-2": Trash2,
  "trending-up": TrendingUp,
  tv: Tv,
  zap: Zap,
};

export const CATEGORY_ICON_NAMES = Object.keys(ICONS);

// Italian labels for icon pickers (accessible names and tooltips).
const ICON_LABELS: Record<string, string> = {
  "arrow-left-right": "Trasferimenti",
  baby: "Bambini",
  briefcase: "Lavoro",
  car: "Auto",
  droplet: "Acqua",
  flame: "Gas",
  gift: "Regali",
  "heart-pulse": "Salute",
  home: "Casa",
  landmark: "Banca",
  percent: "Interessi",
  receipt: "Ricevute",
  scale: "Legale",
  "shopping-bag": "Shopping",
  "shopping-cart": "Spesa",
  smartphone: "Telefono",
  sparkles: "Varie",
  "trash-2": "Rifiuti",
  "trending-up": "Crescita",
  tv: "Abbonamenti TV",
  zap: "Luce",
};

export function categoryIconLabel(name: string): string {
  return ICON_LABELS[name] ?? name;
}

export const CATEGORY_COLORS = [1, 2, 3, 4, 5, 6] as const;

// Soft tinted background with solid foreground, shared by category badges.
export function categoryTint(colorIndex: number) {
  return {
    background: `color-mix(in srgb, var(--mio-chart-${colorIndex}) 18%, transparent)`,
    color: `var(--mio-chart-${colorIndex})`,
  };
}

export function categoryIcon(name: string | null | undefined): LucideIcon {
  return (name && ICONS[name]) || Tag;
}

export function CategoryIcon({ name }: { name: string | null | undefined }) {
  // Icons are static module-level components picked by name, not created per render.
  return createElement(categoryIcon(name), { "aria-hidden": true });
}
