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

export function categoryIcon(name: string | null | undefined): LucideIcon {
  return (name && ICONS[name]) || Tag;
}

export function CategoryIcon({ name }: { name: string | null | undefined }) {
  // Icons are static module-level components picked by name, not created per render.
  return createElement(categoryIcon(name), { "aria-hidden": true });
}
