MonetIO is a PWA for managing a household's money together: several accounts, income and expenses, investment returns, recurring due dates and balance projections, with visibility shared per household member. It should feel like a friendly family app, not a bank. This system is the single source for its tokens, styles and React components, published in code as `@monetio/ui`.

## Principles

- **Fresh, not formal.** Soft filled blocks instead of outlined boxes, pill-shaped controls, large rounded corners, big confident numbers. Color is used in generous pastel fields, not thin accents.
- **Forms live in the page, not in dialogs.** Data entry happens in a `FormPanel` at the top of the list it feeds, in an `Accordion` item for per-object edits, or in a dedicated `Tabs` view for long flows. Confirmations use `InlineConfirm`. After a save the form closes and a non-blocking `Toast` reports the outcome; errors stay inline as an `Alert`. Modals are reserved for OS-level needs (camera, file picker).
- **Three colors, three meanings.** Mint is money in, positive news and the main action. Coral is attention: money out, things due. Periwinkle is anything that has not happened yet: projections and goals.
- **Money is always legible without color.** Every amount renders through `Amount`: tabular digits, a true minus (−), a plus on income.
- **Whose money is it?** Anything shareable shows its visibility (`AvatarGroup` or "Private") and is edited with `VisibilityPicker`.
- **Light, dark or system.** The theme follows the device by default; `ThemeSwitcher` lets each person force Light or Dark, remembered per device.
- **Phone first.** Layouts start at 360px. `BottomNav` floats above the content on phones and becomes a rail at 960px.

## Content fundamentals

- UI copy is in English, sentence case, warm and direct, second person: "Hi Giulia", "Came in", "Went out", "Where it's heading", "You and 1 other".
- Name things as people know them: "Joint account", "Rent", "Holiday fund". Never "entity", "record", "ledger entry".
- Buttons state the outcome with a verb: "Save transaction", "Mark as paid", "Add recurring payment". Never "OK" or "Yes".
- Errors say what happened and how to fix it: "Your Intesa connection expired on 2 Nov." + "Reconnect Intesa".
- Dates are short and relative where it helps: "Today", "Tomorrow", "In 5 days", "3 days overdue", otherwise "5 Nov".
- No emoji. No exclamation marks.

## Color

Neutrals carry a faint green bias. Every color token has a designed light and dark value; dark is not an inversion.

- Page `mio-bg`; content blocks `mio-surface` (filled, no border); inputs, open panels, tooltips and the nav bar `mio-surface-raised`; tracks and wells `mio-surface-sunken`.
- Text: `mio-ink` for content and amounts, `mio-ink-muted` for labels and meta lines, `mio-ink-subtle` for placeholders and axis ticks. All meet 4.5:1 on every surface in both themes.
- Mint: `mio-brand` fill with `mio-on-brand` text for primary buttons, the active nav item, selected chips and tabs. `mio-brand-soft` for mint cards. `mio-brand-ink` when mint must be text.
- Coral: `mio-accent` fill with `mio-on-accent` text for due-soon markers and notification dots; `mio-accent-soft` for coral cards; `mio-accent-ink` as text.
- Periwinkle: `mio-forecast` for projection lines and goal meters; `mio-forecast-soft` for goal cards; `mio-forecast-ink` as text.
- Money text: `mio-income`, `mio-expense`, `mio-transfer`, each with a `-soft` badge ground. Always with a sign or icon.
- Status: `mio-success`, `mio-warning`, `mio-danger`, `mio-info` with `-soft` grounds. Danger is a true red, kept apart from coral so "overdue" never reads as "due soon".
- Charts use `mio-chart-1` … `mio-chart-6` (green, coral, blue, gold, violet, pink) in that fixed order, validated for color-vision deficiency. A seventh category folds into "Other". `mio-chart-4` (gold) is under 3:1 on light surfaces, so charts that use it always show values in the legend.

## Typography

- `display` (Gabarito) for headlines, card titles and large amounts, at weight 700 with tight tracking: `display-lg`, `display-md`, `title-lg`, `amount-xl`, `amount-lg`.
- `sans` (Onest) for everything else: `title-md`, `title-sm`, `body-lg`, `body`, `body-sm`, `label`, `overline`, `amount-md`.
- `mono` (JetBrains Mono) only for IBANs, references and import codes.
- Amounts use tabular figures; large amounts render decimals at 55% size in `mio-ink-subtle`.

## Shape, spacing, elevation

- Radii by role: `mio-radius-pill` for buttons, chips, segmented controls, tabs, badges and avatars; `mio-radius-md` (14px) for inputs and icon tiles; `mio-radius-lg` (22px) for cards and panels; `mio-radius-xl` (28px) for the hero, account cards and the nav bar; `mio-radius-xs` only for chart data-ends.
- 4px base: `mio-space-1` (4) to `mio-space-12` (48). Page gutter `mio-space-4`; gap between blocks `mio-space-4`; between page regions `mio-space-6`.
- Separation comes from fills, not lines. Borders appear only on inputs (`mio-border-strong`, 3:1) and as hairlines between list rows.
- Shadows are rare: `mio-shadow-md` for an open `FormPanel`, expanded accordion item and tooltip; `mio-shadow-lg` only for the floating nav.
- Controls: `mio-control-sm` 32px, `mio-control-md` 44px, `mio-control-lg` 52px.

## States and motion

- Focus: 2px solid `mio-focus` outline with 2px offset (ink in light, mint in dark).
- Inputs on focus: `mio-ink` border plus a 3px `mio-brand-soft` halo.
- Selected: mint fill (`mio-brand` + `mio-on-brand`) for chips, tabs and nav; `mio-brand-soft` for rows.
- Buttons scale to 97% while pressed. Disabled is 45% opacity.
- Motion uses `mio-ease` with `mio-duration-fast` (120ms) for color and press, `mio-duration-base` (200ms) for expand. `prefers-reduced-motion` disables transitions.

## Theming

- Tokens are declared for light on `:root`, for dark under `@media (prefers-color-scheme: dark)` and again under `[data-theme="dark"]`, so the OS setting applies by default and an explicit choice always wins.
- `ThemeSwitcher` / `useTheme()` write `data-theme` on `<html>` and remember Light or Dark in `localStorage` (`mio-theme`); System removes both.
- Render `themeInitScript` in an inline `<script>` in `<head>` with `suppressHydrationWarning` on `<html>` so the stored theme applies before first paint.

## Data visualization

- Columns max 24px, 2px gap, 4px rounded data-end; lines 2px; history in `mio-ink`, forecasts dashed `mio-forecast` with a 14% band.
- Gridlines 1px solid `mio-chart-grid`; ticks `mio-ink-subtle` with whole-euro values; legend keys are dots.
- Every chart has a legend (two or more series), a hover readout and a hidden data table.

## Iconography

- Icons come from `lucide-react` (peer dependency), stroke 2, rendered at 16–22px with `currentColor`.
- Category icons sit in round bubbles: an 18% tint of the category's chart color with the icon in that color.
- Account icons sit in white (raised) circles on the account's pastel card.
- No emoji, no filled icon variants. There is no logo yet: the name is set lowercase in `display` 700 as "monetio", with "io" in `mio-brand-ink`.

## Using it in code

- Workspace package `packages/ui`, imported as `@monetio/ui`. Import `@monetio/ui/styles.css` once and add `mio-root` to `<body>`.
- With Tailwind v4 also import `@monetio/ui/tailwind-theme.css` for utilities such as `bg-surface`, `text-ink-muted`, `bg-brand`, `text-on-brand`, `rounded-lg`, `font-display`.
- Store money as integer cents; format with `formatMoney`, parse input with `parseMoneyInput`.
- Pass `today` from the server to date-aware components (`DueItem`, `TransactionRow`) so prerendering stays deterministic.
- Tokens are defined once in `packages/ui/src/tokens/*.ts`; `npm run ds:tokens` regenerates the CSS, the Tailwind bridge and this system's `tokens.json`.
