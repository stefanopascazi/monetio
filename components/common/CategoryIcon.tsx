import { createElement } from "react";
import {
  ArrowLeftRight,
  Baby,
  BookOpen,
  Briefcase,
  Bus,
  Car,
  Coffee,
  Droplet,
  Dumbbell,
  Fish,
  Flame,
  Fuel,
  Gamepad2,
  Gift,
  GraduationCap,
  HeartPulse,
  Home,
  Hotel,
  Landmark,
  type LucideIcon,
  PawPrint,
  Percent,
  PiggyBank,
  Pill,
  Pizza,
  Plane,
  Receipt,
  Sailboat,
  Scale,
  Scissors,
  Shirt,
  ShoppingBag,
  ShoppingCart,
  Smartphone,
  Sparkles,
  Tag,
  Ticket,
  TrainFront,
  Trash2,
  TrendingUp,
  Tv,
  Umbrella,
  Utensils,
  Wallet,
  Wifi,
  Wine,
  Wrench,
  Zap,
} from "lucide-react";

// Icon names stored on categories (lucide kebab-case) to component + Italian label.
const ICONS: Record<string, { icon: LucideIcon; label: string }> = {
  "arrow-left-right": { icon: ArrowLeftRight, label: "Trasferimenti" },
  baby: { icon: Baby, label: "Bambini" },
  "book-open": { icon: BookOpen, label: "Libri" },
  briefcase: { icon: Briefcase, label: "Lavoro" },
  bus: { icon: Bus, label: "Trasporti pubblici" },
  car: { icon: Car, label: "Auto" },
  coffee: { icon: Coffee, label: "Bar e caffè" },
  droplet: { icon: Droplet, label: "Acqua" },
  dumbbell: { icon: Dumbbell, label: "Palestra" },
  fish: { icon: Fish, label: "Sushi e pesce" },
  flame: { icon: Flame, label: "Gas" },
  fuel: { icon: Fuel, label: "Carburante" },
  "gamepad-2": { icon: Gamepad2, label: "Videogiochi" },
  gift: { icon: Gift, label: "Regali" },
  "graduation-cap": { icon: GraduationCap, label: "Istruzione" },
  "heart-pulse": { icon: HeartPulse, label: "Salute" },
  home: { icon: Home, label: "Casa" },
  hotel: { icon: Hotel, label: "Hotel" },
  landmark: { icon: Landmark, label: "Banca" },
  "paw-print": { icon: PawPrint, label: "Animali" },
  percent: { icon: Percent, label: "Interessi" },
  "piggy-bank": { icon: PiggyBank, label: "Risparmi" },
  pill: { icon: Pill, label: "Farmacia" },
  pizza: { icon: Pizza, label: "Pizzeria" },
  plane: { icon: Plane, label: "Voli" },
  receipt: { icon: Receipt, label: "Ricevute" },
  sailboat: { icon: Sailboat, label: "Barca" },
  scale: { icon: Scale, label: "Legale" },
  scissors: { icon: Scissors, label: "Parrucchiere" },
  shirt: { icon: Shirt, label: "Abbigliamento" },
  "shopping-bag": { icon: ShoppingBag, label: "Shopping" },
  "shopping-cart": { icon: ShoppingCart, label: "Spesa" },
  smartphone: { icon: Smartphone, label: "Telefono" },
  sparkles: { icon: Sparkles, label: "Varie" },
  ticket: { icon: Ticket, label: "Eventi" },
  "train-front": { icon: TrainFront, label: "Treni" },
  "trash-2": { icon: Trash2, label: "Rifiuti" },
  "trending-up": { icon: TrendingUp, label: "Crescita" },
  tv: { icon: Tv, label: "Abbonamenti TV" },
  umbrella: { icon: Umbrella, label: "Assicurazioni" },
  utensils: { icon: Utensils, label: "Ristorante" },
  wallet: { icon: Wallet, label: "Contanti" },
  wifi: { icon: Wifi, label: "Internet" },
  wine: { icon: Wine, label: "Aperitivi" },
  wrench: { icon: Wrench, label: "Manutenzione" },
  zap: { icon: Zap, label: "Luce" },
};

export const CATEGORY_ICON_NAMES = Object.keys(ICONS);

// Italian label for icon pickers (accessible names and tooltips).
export function categoryIconLabel(name: string): string {
  return ICONS[name]?.label ?? name;
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
  return (name && ICONS[name]?.icon) || Tag;
}

export function CategoryIcon({ name }: { name: string | null | undefined }) {
  // Icons are static module-level components picked by name, not created per render.
  return createElement(categoryIcon(name), { "aria-hidden": true });
}
