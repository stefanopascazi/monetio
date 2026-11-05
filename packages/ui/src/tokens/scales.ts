// Non-color scales: spacing, radius, shadow, control sizes, motion, z-index.
export interface ScaleToken {
  name: string;
  value: string;
  usage: string;
}

export interface ThemedScaleToken {
  name: string;
  value: { light: string; dark: string };
  usage: string;
}

export const spacing: ScaleToken[] = [
  { name: "mio-space-0-5", value: "2px", usage: "Hairline gaps: chart surface gap, icon nudges." },
  { name: "mio-space-1", value: "4px", usage: "Gap between icon and label inside badges." },
  { name: "mio-space-2", value: "8px", usage: "Gap inside controls, between inline items." },
  { name: "mio-space-3", value: "12px", usage: "Row vertical padding, gap between form fields in a row." },
  { name: "mio-space-4", value: "16px", usage: "Card padding on mobile, page side gutter, stack gap." },
  { name: "mio-space-5", value: "20px", usage: "Card padding on desktop." },
  { name: "mio-space-6", value: "24px", usage: "Gap between sections inside a page." },
  { name: "mio-space-8", value: "32px", usage: "Gap between page regions." },
  { name: "mio-space-10", value: "40px", usage: "Empty state padding." },
  { name: "mio-space-12", value: "48px", usage: "Page top padding on desktop." },
];

export const radius: ScaleToken[] = [
  { name: "mio-radius-xs", value: "4px", usage: "Chart bar data-ends." },
  { name: "mio-radius-sm", value: "8px", usage: "Badges, tooltips." },
  { name: "mio-radius-md", value: "14px", usage: "Inputs, list row hover, icon tiles." },
  { name: "mio-radius-lg", value: "22px", usage: "Cards, form panels, accordions." },
  { name: "mio-radius-xl", value: "28px", usage: "Hero blocks, account cards, bottom nav container." },
  { name: "mio-radius-pill", value: "999px", usage: "Buttons, chips, segmented controls, avatars, progress tracks." },
];

export const sizes: ScaleToken[] = [
  { name: "mio-control-sm", value: "32px", usage: "Dense controls in tables and toolbars." },
  { name: "mio-control-md", value: "44px", usage: "Default control height on desktop." },
  { name: "mio-control-lg", value: "52px", usage: "Touch-first controls: primary mobile actions, amount input." },
  { name: "mio-content-max", value: "1120px", usage: "Max width of the page content column." },
];

export const shadows: ThemedScaleToken[] = [
  {
    name: "mio-shadow-sm",
    value: { light: "0 1px 2px rgba(14,26,22,0.06)", dark: "0 1px 2px rgba(0,0,0,0.5)" },
    usage: "Selected segment thumb, raised chips.",
  },
  {
    name: "mio-shadow-md",
    value: {
      light: "0 10px 30px rgba(14,26,22,0.08), 0 2px 6px rgba(14,26,22,0.05)",
      dark: "0 10px 30px rgba(0,0,0,0.55), 0 2px 6px rgba(0,0,0,0.4)",
    },
    usage: "Open form panels, tooltips.",
  },
  {
    name: "mio-shadow-lg",
    value: {
      light: "0 18px 48px rgba(14,26,22,0.14)",
      dark: "0 18px 48px rgba(0,0,0,0.65)",
    },
    usage: "Floating bottom navigation.",
  },
];

export const motion: ScaleToken[] = [
  { name: "mio-duration-fast", value: "120ms", usage: "Hover, press, color changes." },
  { name: "mio-duration-base", value: "200ms", usage: "Accordion and form panel expand." },
  { name: "mio-duration-slow", value: "320ms", usage: "Chart enter transitions." },
  { name: "mio-ease", value: "cubic-bezier(0.2, 0, 0, 1)", usage: "Default easing for every transition." },
];

export const zIndex: ScaleToken[] = [
  { name: "mio-z-sticky", value: "10", usage: "Sticky page headers and form action bars." },
  { name: "mio-z-nav", value: "20", usage: "Bottom navigation and nav rail." },
];
