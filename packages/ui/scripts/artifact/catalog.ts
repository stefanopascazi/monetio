// Artifact catalog: guideline text and live preview (JSX) for every component.
// Preview code runs with: M = window.MonetIO, h = React.createElement, F = React.Fragment,
// useState = React.useState, TODAY = 5 Nov 2026 (fixed so dates render deterministically).

export interface CatalogEntry {
  name: string;
  group: "Actions" | "Inputs" | "Disclosure" | "Layout" | "Money" | "Charts" | "Feedback";
  height: number;
  readme: string;
  /** JSX body of a `function Demo()` component. */
  demo: string;
}

export const catalog: CatalogEntry[] = [
  {
    name: "Button",
    group: "Actions",
    height: 120,
    readme: `Triggers an action in place. One \`primary\` per view; everything else is \`secondary\` or \`ghost\`.

**Consumer provides:** label as children, \`onClick\` or \`type="submit"\` inside a FormPanel, optional \`iconStart\`/\`iconEnd\` (lucide icons).

- \`primary\`: the main commit of a form or page ("Save transaction").
- \`secondary\`: neutral alternatives ("Export", "Mark as paid").
- \`ghost\`: low-emphasis and Cancel.
- \`danger\`: destructive actions. Prefer InlineConfirm over a bare danger Button.
- Use \`size="lg"\` for the primary action on phones (48px touch target).
- \`iconOnly\` requires \`aria-label\`.

Do not open dialogs from buttons: expand a FormPanel, switch a Tab or reveal an Accordion item instead.`,
    demo: `
  <div style={{display:"flex",flexWrap:"wrap",gap:12,alignItems:"center"}}>
    <M.Button iconStart={<M.Plus />}>Add transaction</M.Button>
    <M.Button variant="secondary">Export CSV</M.Button>
    <M.Button variant="ghost">Cancel</M.Button>
    <M.Button variant="danger" size="sm" iconStart={<M.Trash2 />}>Delete</M.Button>
    <M.Button loading>Saving</M.Button>
    <M.Button iconOnly aria-label="Settings" variant="secondary" iconStart={<M.Settings />} />
  </div>`,
  },
  {
    name: "SegmentedControl",
    group: "Actions",
    height: 120,
    readme: `Picks one of two to five mutually exclusive options, always visible. Implements a radio group with arrow-key navigation.

**Consumer provides:** \`options\` (\`value\`, \`label\`, optional \`icon\` and \`tone\`), \`aria-label\`, and \`value\`/\`onChange\` or \`defaultValue\`.

- Transaction type: \`tone\` = \`expense\` / \`income\` / \`transfer\` colors the selected segment.
- Chart period switch (1M / 6M / 1Y) inside a Card action slot with \`size="sm"\`.
- More than five options: use a Select.`,
    demo: `
  <div style={{display:"grid",gap:12,maxWidth:420}}>
    <M.SegmentedControl aria-label="Transaction type" block options={[{value:"expense",label:"Expense",tone:"expense"},{value:"income",label:"Income",tone:"income"},{value:"transfer",label:"Transfer",tone:"transfer"}]} />
    <M.SegmentedControl aria-label="Period" size="sm" defaultValue="6m" options={[{value:"1m",label:"1M"},{value:"6m",label:"6M"},{value:"1y",label:"1Y"},{value:"all",label:"All"}]} />
  </div>`,
  },
  {
    name: "TextField",
    group: "Inputs",
    height: 200,
    readme: `Labelled single-line input built on \`Field\` (label, hint, error) and the shared \`.mio-control\` shell.

**Consumer provides:** \`label\`, native input props (\`type\`, \`name\`, \`value\`, \`onChange\`), optional \`hint\`, \`error\`, \`prefix\`, \`suffix\`, \`optional\`.

- Always set a visible label; placeholders show an example, never the label.
- Errors replace the hint, are announced, and say how to fix ("Enter a payee name").
- Dates use \`type="date"\` for the native picker on mobile.
- Money never goes in a TextField: use AmountInput.`,
    demo: `
  <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))",gap:16}}>
    <M.TextField label="Payee" placeholder="e.g. Esselunga" hint="Who you paid or who paid you" />
    <M.TextField label="Date" type="date" defaultValue="2026-11-05" />
    <M.TextField label="Note" optional placeholder="Add a note" />
    <M.TextField label="Interest rate" suffix="%" defaultValue="3,2" error="Use a dot for decimals: 3.2" />
  </div>`,
  },
  {
    name: "AmountInput",
    group: "Inputs",
    height: 140,
    readme: `Large ledger-style money field. Accepts free input ("12,5", "1.234,50", "€ 950") and stores integer cents.

**Consumer provides:** \`label\`, \`valueCents\` (positive or null), \`onValueChange\`, \`kind\` (\`expense\` | \`income\` | \`transfer\` | \`neutral\`), optional \`currency\` (default EUR).

- The sign comes from \`kind\`, never from the typed value. Pair it with a SegmentedControl for the type.
- Place it first in the add-transaction form, spanning the full row (\`className="mio-span-full"\`).
- Always store cents (integers) in Supabase; format only at render time.`,
    demo: `
  (() => { const [v, setV] = useState(8240); const [k, setK] = useState("expense"); return (
  <div style={{display:"grid",gap:12,maxWidth:420}}>
    <M.SegmentedControl aria-label="Type" block value={k} onChange={setK} options={[{value:"expense",label:"Expense",tone:"expense"},{value:"income",label:"Income",tone:"income"}]} />
    <M.AmountInput label="Amount" kind={k} valueCents={v} onValueChange={setV} />
  </div>); })()`,
  },
  {
    name: "Select",
    group: "Inputs",
    height: 110,
    readme: `Native select styled as a control. Native means the OS picker on phones and full keyboard support for free.

**Consumer provides:** \`label\`, \`options\` (\`value\`, \`label\`), \`value\`/\`onChange\` or \`defaultValue\`, optional \`placeholder\`, \`icon\`, \`hint\`, \`error\`.

- Accounts, categories, frequencies, currencies.
- Under six options that fit on one line: prefer SegmentedControl.`,
    demo: `
  <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))",gap:16}}>
    <M.Select label="Account" defaultValue="joint" icon={<M.Landmark />} options={[{value:"joint",label:"Joint account · Intesa"},{value:"personal",label:"Personal · Fineco"}]} />
    <M.Select label="Repeats" defaultValue="monthly" options={[{value:"weekly",label:"Weekly"},{value:"monthly",label:"Monthly"},{value:"yearly",label:"Yearly"}]} />
  </div>`,
  },
  {
    name: "Switch",
    group: "Inputs",
    height: 140,
    readme: `On/off setting that applies immediately, without a save button.

**Consumer provides:** \`label\`, optional \`description\`, \`checked\`/\`onCheckedChange\` or \`defaultChecked\`.

- Privacy mode ("Hide balances"), notification preferences, "Include in net worth".
- If the change needs confirmation or a save step, use a Checkbox inside a FormPanel instead.`,
    demo: `
  <div style={{display:"grid",gap:16,maxWidth:460}}>
    <M.Switch label="Hide balances" description="Mask amounts when someone is looking over your shoulder." />
    <M.Switch label="Due-date reminders" description="Notify me 3 days before a recurring payment." defaultChecked />
  </div>`,
  },
  {
    name: "Chip",
    group: "Inputs",
    height: 90,
    readme: `Toggleable pill for multi-select filters and member pickers. Exposes \`aria-pressed\`.

**Consumer provides:** label as children, \`selected\`, \`onSelectedChange\`, optional \`leading\` (Avatar or icon; replaced by a check when selected).

- Filter rows above transaction lists: categories, members, accounts.
- Keep chips on one wrapping row; never more than ten.`,
    demo: `
  (() => { const [sel, setSel] = useState(["groceries"]); const t = (id) => (on) => setSel(on ? [...sel, id] : sel.filter((x) => x !== id)); return (
  <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
    <M.Chip selected={sel.includes("groceries")} onSelectedChange={t("groceries")}>Groceries</M.Chip>
    <M.Chip selected={sel.includes("housing")} onSelectedChange={t("housing")}>Housing</M.Chip>
    <M.Chip selected={sel.includes("giulia")} onSelectedChange={t("giulia")} leading={<M.Avatar name="Giulia Rossi" size="sm" />}>Giulia</M.Chip>
    <M.Chip selected={sel.includes("marco")} onSelectedChange={t("marco")} leading={<M.Avatar name="Marco Rossi" size="sm" />}>Marco</M.Chip>
  </div>); })()`,
  },
  {
    name: "VisibilityPicker",
    group: "Inputs",
    height: 190,
    readme: `Chooses who in the household can see an account, budget or transaction: Private, Household, or specific members.

**Consumer provides:** \`members\` (\`id\`, \`name\`), \`ownerId\` (current user, always included), \`value\` (\`{ mode, memberIds }\`), \`onChange\`.

- Use \`resolveViewers(value, members, ownerId)\` to get the ids to store in the Supabase sharing table.
- Shown in every create/edit form for shareable objects, as the last field.
- The summary line always states the result in plain words ("You and 1 other").`,
    demo: `
  (() => { const [v, setV] = useState({ mode: "custom", memberIds: ["m"] }); return (
  <div style={{maxWidth:460}}>
    <M.VisibilityPicker members={[{id:"g",name:"Giulia Rossi"},{id:"m",name:"Marco Rossi"},{id:"s",name:"Sofia Rossi"}]} ownerId="g" value={v} onChange={setV} />
  </div>); })()`,
  },
  {
    name: "FormPanel",
    group: "Disclosure",
    height: 460,
    readme: `In-page form container that replaces modal dialogs. Collapsed, it reads as a call to action with a dashed outline; expanded, it holds the full form and its actions.

**Consumer provides:** \`title\`, optional \`description\` and \`icon\`, form fields as children, \`actions\` (submit Button + ghost Cancel), \`onSubmit\` (default prevented), \`open\`/\`onOpenChange\` or \`defaultOpen\`.

- Put it at the top of the list it adds to ("Add transaction" above Transactions).
- \`collapsible={false}\` for screens whose main job is the form (onboarding, new account).
- Fields lay out on an auto-fit grid (min 220px). Add \`mio-span-full\` to a field to span the row.
- After a successful save, keep the panel open with fields reset for quick repeated entry; show an inline Alert, not a toast.`,
    demo: `
  (() => { const [k, setK] = useState("expense"); const [v, setV] = useState(null); return (
  <div style={{display:"grid",gap:16}}>
    <M.FormPanel title="Add transaction" description="Expense, income or transfer" icon={<M.Plus />} defaultOpen actions={<F><M.Button variant="ghost">Cancel</M.Button><M.Button type="submit">Save transaction</M.Button></F>}>
      <M.SegmentedControl aria-label="Type" className="mio-span-full" block value={k} onChange={setK} options={[{value:"expense",label:"Expense",tone:"expense"},{value:"income",label:"Income",tone:"income"},{value:"transfer",label:"Transfer",tone:"transfer"}]} />
      <M.AmountInput label="Amount" className="mio-span-full" kind={k} valueCents={v} onValueChange={setV} />
      <M.TextField label="Payee" placeholder="e.g. Esselunga" />
      <M.Select label="Account" defaultValue="joint" options={[{value:"joint",label:"Joint account"},{value:"card",label:"Credit card"}]} />
    </M.FormPanel>
    <M.FormPanel title="Add recurring payment" description="Rent, bills, subscriptions" icon={<M.CalendarClock />}>
      <M.TextField label="Name" />
    </M.FormPanel>
  </div>); })()`,
  },
  {
    name: "Accordion",
    group: "Disclosure",
    height: 300,
    readme: `Vertical stack of disclosures. Each item shows a summary while collapsed and edits in place when open.

**Consumer provides:** \`items\` (\`id\`, \`title\`, optional \`meta\` and \`icon\`, \`content\`), \`type\` (\`single\` | \`multiple\`), \`value\`/\`onValueChange\` or \`defaultValue\`.

- Account settings, budget categories, household members: one item per object with its edit form inside.
- Put the key figure in \`meta\` (an Amount) so the list is scannable closed.
- \`single\` for forms (one edit at a time), \`multiple\` for read-only details.`,
    demo: `
  <M.Accordion type="single" defaultValue={["joint"]} items={[
    { id: "joint", title: "Joint account", icon: <M.Landmark />, meta: <M.Amount cents={1243050} tone="neutral" />, content: <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:12}}><M.TextField label="Name" defaultValue="Joint account" /><M.TextField label="Bank" defaultValue="Intesa Sanpaolo" /></div> },
    { id: "savings", title: "Emergency fund", icon: <M.PiggyBank />, meta: <M.Amount cents={1500000} tone="neutral" />, content: <p>Savings details</p> },
    { id: "card", title: "Credit card", icon: <M.Wallet />, meta: <M.Amount cents={-41200} tone="neutral" />, content: <p>Card details</p> },
  ]} />`,
  },
  {
    name: "Tabs",
    group: "Disclosure",
    height: 220,
    readme: `Switches between sibling views of the same object. Arrow keys, Home and End move between tabs.

**Consumer provides:** \`tabs\` (\`id\`, \`label\`, optional \`count\`, \`content\`), \`aria-label\`, \`value\`/\`onValueChange\` or \`defaultValue\`, \`variant\` (\`pill\` by default, selected tab in mint; \`line\` for long page sections).

- Account detail: Transactions / Recurring / Settings.
- A dedicated "Add" or "Import" tab is a valid alternative to a FormPanel when the form is long.
- Never more than five tabs; never nest tabs.`,
    demo: `
  <M.Tabs aria-label="Account" tabs={[
    { id: "tx", label: "Transactions", count: 42, content: <M.TransactionRow payee="Esselunga" category="Groceries" categoryIcon={<M.ShoppingCart />} date={TODAY} today={TODAY} amountCents={-8240} /> },
    { id: "rec", label: "Recurring", count: 6, content: <p>Recurring items</p> },
    { id: "import", label: "Import", content: <p>Upload a CSV from your bank.</p> },
  ]} />`,
  },
  {
    name: "InlineConfirm",
    group: "Disclosure",
    height: 110,
    readme: `Two-step confirmation that expands in place. Replaces confirm dialogs for delete, archive and leave-household.

**Consumer provides:** \`triggerLabel\`, \`message\` (a question naming the object), \`onConfirm\` (may be async), optional \`confirmLabel\`, \`tone\`.

- Focus moves to Cancel when the question appears, so Enter never deletes by accident.
- The confirm label repeats the verb ("Delete", "Archive"), never "Yes".`,
    demo: `
  <div style={{display:"grid",gap:12,maxWidth:520}}>
    <M.InlineConfirm triggerLabel="Delete transaction" triggerIcon={<M.Trash2 />} message="Delete Esselunga −€82.40?" confirmLabel="Delete" onConfirm={() => {}} />
  </div>`,
  },
  {
    name: "Card",
    group: "Layout",
    height: 380,
    readme: `Soft filled block for one topic. No borders: the fill separates it from the page, and its tone carries meaning.

**Consumer provides:** children, optional \`title\`, \`subtitle\`, \`action\`, \`padding\` (\`none\` for edge-to-edge lists), \`tone\`.

- \`neutral\` (default, \`mio-surface\`) for most content: charts, lists.
- \`mint\` for money in and positive news, \`coral\` for things needing attention (upcoming payments), \`forecast\` for goals and projections. One tinted card per row at most, so the tint keeps its meaning.
- \`raised\` (white sheet with shadow) for content the user is editing.
- Lists of rows (TransactionRow, DueItem) use \`padding="none"\`.`,
    demo: `
  <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))",gap:16}}>
    <M.Card title="Monthly budget" subtitle="November" action={<M.Button variant="ghost" size="sm">Edit</M.Button>}>
      <M.ProgressBar label="Groceries" valueCents={32000} maxCents={40000} />
    </M.Card>
    <M.Card tone="mint" title="Came in" subtitle="November"><M.Amount cents={431000} tone="neutral" size="lg" /></M.Card>
    <M.Card tone="coral" title="2 payments due" subtitle="This week"><M.Amount cents={-103640} tone="neutral" size="lg" /></M.Card>
    <M.Card tone="forecast" title="Holiday in Puglia" subtitle="Goal"><M.ProgressBar label="Saved" valueCents={140000} maxCents={200000} mode="goal" /></M.Card>
  </div>`,
  },
  {
    name: "ThemeSwitcher",
    group: "Layout",
    height: 120,
    readme: `System / Light / Dark switch. "System" follows the device setting live; Light and Dark force a theme and are remembered on this device.

**Consumer provides:** nothing required; optional \`showLabels\`, \`size\`.

- Put it in the top bar (icons only) and in Settings (\`showLabels\`).
- For no flash on load, render \`themeInitScript\` in an inline \`<script>\` in \`<head>\` and add \`suppressHydrationWarning\` to \`<html>\`.
- Programmatic access: \`useTheme()\` returns \`preference\`, \`resolved\` (the theme actually shown) and \`setPreference\`.`,
    demo: `
  <div style={{display:"flex",gap:24,flexWrap:"wrap",alignItems:"center"}}>
    <M.ThemeSwitcher />
    <M.ThemeSwitcher showLabels size="md" />
  </div>`,
  },
  {
    name: "Stack",
    group: "Layout",
    height: 90,
    readme: `Flex layout primitive. Spacing between siblings always comes from \`gap\` (a spacing step), never from margins.

**Consumer provides:** children, \`direction\`, \`gap\` (0–12, mapped to \`mio-space-*\`), \`align\`, \`justify\`, \`wrap\`, \`as\`.`,
    demo: `
  <M.Stack direction="row" gap={2} wrap>
    <M.Badge tone="income">Income</M.Badge><M.Badge tone="expense">Expense</M.Badge><M.Badge tone="transfer">Transfer</M.Badge><M.Badge tone="forecast">Projected</M.Badge>
  </M.Stack>`,
  },
  {
    name: "PageHeader",
    group: "Layout",
    height: 140,
    readme: `Top of every route: one h1, an optional eyebrow for context (household, period), and at most two actions.

**Consumer provides:** \`title\`, optional \`eyebrow\`, \`description\`, \`actions\`.`,
    demo: `
  <M.PageHeader eyebrow="Rossi household" title="Accounts" description="4 accounts · 2 shared with Marco" actions={<F><M.Button variant="secondary">Import</M.Button><M.Button iconStart={<M.Plus />}>Add account</M.Button></F>} />`,
  },
  {
    name: "BottomNav",
    group: "Layout",
    height: 110,
    readme: `App navigation. A fixed bottom bar on phones (safe-area aware) that becomes a left rail from 960px.

**Consumer provides:** \`items\` (\`id\`, \`label\`, \`icon\`, \`href\`, optional \`badge\`), \`activeId\`, \`linkAs\` (pass Next.js \`Link\`), optional \`action\`.

- Max five items: Home, Accounts, Activity, Due, Insights.
- \`badge\` only for things needing action (overdue payments).
- Add \`mio-nav--static\` to render it in flow (docs, previews).`,
    demo: `
  (() => { const [a, setA] = useState("home"); return (
  <M.BottomNav className="mio-nav--static" activeId={a} onSelect={setA} items={[
    { id: "home", label: "Home", icon: <M.LayoutDashboard /> },
    { id: "accounts", label: "Accounts", icon: <M.Landmark /> },
    { id: "activity", label: "Activity", icon: <M.ArrowLeftRight /> },
    { id: "due", label: "Due", icon: <M.CalendarClock />, badge: 2 },
    { id: "insights", label: "Insights", icon: <M.BarChart3 /> },
  ]} />); })()`,
  },
  {
    name: "Amount",
    group: "Money",
    height: 150,
    readme: `Every monetary value renders through Amount: tabular digits, a true minus sign (−), and smaller decimals at large sizes.

**Consumer provides:** \`cents\` (signed integer), \`tone\` (\`auto\` by sign, or \`income\`/\`expense\`/\`transfer\`/\`neutral\`), \`size\` (\`sm\`–\`xl\`), optional \`currency\`, \`compact\`, \`hidden\` (privacy mode).

- Balances use \`tone="neutral"\`: a negative balance is not an expense.
- Income and expense always carry their sign, so color is never the only cue.
- Respect the household privacy switch by passing \`hidden\`.`,
    demo: `
  <div style={{display:"grid",gap:10}}>
    <M.Amount cents={4821035} tone="neutral" size="xl" />
    <div style={{display:"flex",gap:24,flexWrap:"wrap",alignItems:"baseline"}}>
      <M.Amount cents={285000} size="lg" /><M.Amount cents={-8240} size="lg" /><M.Amount cents={50000} tone="transfer" size="lg" showSign={false} /><M.Amount cents={100} hidden size="lg" />
    </div>
  </div>`,
  },
  {
    name: "Badge",
    group: "Money",
    height: 100,
    readme: `One or two words of state. Tone always means something.

**Consumer provides:** label as children, \`tone\`, optional \`icon\`, \`size\`.

- Money tones: \`income\`, \`expense\`, \`transfer\`. Not happened yet: \`forecast\`. Needs attention: \`accent\` (coral).
- Status tones (\`success\`, \`warning\`, \`danger\`, \`info\`) pair with an icon.`,
    demo: `
  <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
    <M.Badge>Draft</M.Badge><M.Badge tone="brand">Shared</M.Badge><M.Badge tone="forecast">Projected</M.Badge><M.Badge tone="accent">Due soon</M.Badge><M.Badge tone="income">Income</M.Badge><M.Badge tone="expense">Expense</M.Badge><M.Badge tone="transfer">Transfer</M.Badge><M.Badge tone="success">Paid</M.Badge><M.Badge tone="warning">Due in 2 days</M.Badge><M.Badge tone="danger">Overdue</M.Badge>
  </div>`,
  },
  {
    name: "Avatar",
    group: "Money",
    height: 90,
    readme: `A household member: photo or initials on a tint derived from the name, so each person keeps one color everywhere.

**Consumer provides:** \`name\`, optional \`src\`, \`size\`. \`AvatarGroup\` takes \`names\` and \`max\`.`,
    demo: `
  <div style={{display:"flex",gap:16,alignItems:"center"}}>
    <M.Avatar name="Giulia Rossi" size="lg" /><M.Avatar name="Marco Rossi" size="lg" /><M.Avatar name="Sofia Rossi" size="md" />
    <M.AvatarGroup names={["Giulia Rossi","Marco Rossi","Sofia Rossi","Luca Rossi"]} max={3} size="md" />
  </div>`,
  },
  {
    name: "StatTile",
    group: "Money",
    height: 150,
    readme: `One headline figure with an optional delta and 12-point trend.

**Consumer provides:** \`label\`, \`valueCents\`, optional \`delta\` (percent), \`deltaLabel\` ("vs Oct"), \`upIsGood\` (false for spending), \`trend\`, \`hidden\`.

- Dashboards open with three tiles max: Net worth (neutral), Came in (\`tone="mint"\`), Went out (\`tone="coral"\`).
- Delta color follows direction × \`upIsGood\` and always shows an arrow and sign.`,
    demo: `
  <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))",gap:12}}>
    <M.StatTile label="Net worth" valueCents={4821035} delta={9.4} deltaLabel="vs Oct" trend={[41,42,41.8,43,44,48.2]} />
    <M.StatTile tone="mint" label="Came in" valueCents={431000} delta={1.2} deltaLabel="vs Oct" />
    <M.StatTile tone="coral" label="Went out" valueCents={214000} delta={-32.7} deltaLabel="vs Oct" upIsGood={false} />
  </div>`,
  },
  {
    name: "TransactionRow",
    group: "Money",
    height: 230,
    readme: `A single movement in a list: category tile, payee, meta line (category · account · date) and signed amount.

**Consumer provides:** \`payee\`, \`category\`, \`categoryIcon\`, \`categoryColor\` (1–6, chart slots), \`date\`, \`amountCents\` (signed), optional \`account\`, \`member\`, \`recurring\`, \`pending\`, \`onClick\`, \`today\`.

- Rows stack inside a \`Card padding="none"\`; dividers come from the row.
- \`onClick\` expands inline detail below the row (or selects it for a side panel on desktop), never a modal.
- Pass \`today\` from the server to keep prerendering deterministic.`,
    demo: `
  <M.Card padding="none">
    <M.TransactionRow payee="Esselunga" category="Groceries" categoryIcon={<M.ShoppingCart />} categoryColor={1} account="Joint" date={new Date(2026,10,4)} today={TODAY} amountCents={-8240} member="Giulia Rossi" onClick={() => {}} />
    <M.TransactionRow payee="Rent November" category="Housing" categoryIcon={<M.Home />} categoryColor={3} account="Joint" date={new Date(2026,10,1)} today={TODAY} amountCents={-95000} recurring member="Marco Rossi" />
    <M.TransactionRow payee="Salary · Acme Srl" category="Income" categoryIcon={<M.Wallet />} categoryColor={6} account="Personal" date={new Date(2026,9,27)} today={TODAY} amountCents={285000} />
  </M.Card>`,
  },
  {
    name: "AccountCard",
    group: "Money",
    height: 190,
    readme: `Summary of one account: type tile, name, institution, balance and who can see it.

**Consumer provides:** \`name\`, \`type\` (\`checking\` | \`savings\` | \`investment\` | \`card\` | \`cash\`), \`balanceCents\`, optional \`institution\`, \`members\` (one name = private), \`change\` (percent), \`reference\` (masked IBAN or card end), \`onClick\`, \`selected\`, \`footer\`.

- Grid of cards on the Accounts page; a horizontal scroll row on the dashboard.
- Never show a full IBAN: pass \`•• 4821\`.`,
    demo: `
  <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(240px,1fr))",gap:12}}>
    <M.AccountCard name="Joint account" institution="Intesa Sanpaolo" type="checking" balanceCents={1243050} members={["Giulia Rossi","Marco Rossi"]} reference="•• 4821" />
    <M.AccountCard name="ETF portfolio" institution="Fineco" type="investment" balanceCents={3120000} members={["Giulia Rossi"]} change={6.8} />
  </div>`,
  },
  {
    name: "DueItem",
    group: "Money",
    height: 260,
    readme: `A recurring or scheduled payment. The calendar leaf is the system's signature mark for dates that matter: it fills coral three days before and red when overdue. Lists of due items sit well in a \`Card tone="coral"\`.

**Consumer provides:** \`title\`, \`dueDate\`, \`amountCents\` (positive), optional \`kind\`, \`frequency\`, \`account\`, \`paid\`, \`onMarkPaid\`, \`action\`, \`today\`.

- "Mark as paid" settles in place and creates the transaction; no dialog.
- \`dueStatus(days, paid)\` and \`DUE_SOON_DAYS\` are exported for notifications and filters.`,
    demo: `
  <M.Card tone="coral" padding="none">
    <M.DueItem title="Electricity · Enel" dueDate={new Date(2026,10,2)} amountCents={8640} frequency="bimonthly" account="Joint" today={TODAY} onMarkPaid={() => {}} />
    <M.DueItem title="Rent" dueDate={new Date(2026,10,7)} amountCents={95000} account="Joint" today={TODAY} onMarkPaid={() => {}} />
    <M.DueItem title="Salary" kind="income" dueDate={new Date(2026,10,27)} amountCents={285000} account="Personal" today={TODAY} />
  </M.Card>`,
  },
  {
    name: "ProgressBar",
    group: "Money",
    height: 200,
    readme: `Budget or savings-goal meter with its numbers always visible.

**Consumer provides:** \`label\`, \`valueCents\`, \`maxCents\`, \`mode\` (\`budget\` fills green, turns coral at 80% and red over 100%; \`goal\` fills in periwinkle \`mio-forecast\`), optional \`hidden\`.`,
    demo: `
  <div style={{display:"grid",gap:20,maxWidth:480}}>
    <M.ProgressBar label="Groceries" valueCents={24000} maxCents={40000} />
    <M.ProgressBar label="Dining out" valueCents={13600} maxCents={15000} />
    <M.ProgressBar label="Holiday in Puglia" valueCents={140000} maxCents={200000} mode="goal" />
  </div>`,
  },
  {
    name: "Sparkline",
    group: "Charts",
    height: 90,
    readme: `Tiny trend line with an area wash and an emphasized endpoint. No axes: it shows shape, not values.

**Consumer provides:** \`data\` (numbers), \`aria-label\` describing the trend, optional \`tone\`, \`width\`, \`height\`.`,
    demo: `
  <div style={{display:"flex",gap:24}}>
    <M.Sparkline data={[3,4,3.6,5,5.4,6.2,7]} aria-label="Savings rising" tone="income" />
    <M.Sparkline data={[7,6,6.4,5,5.2,4]} aria-label="Spending falling" tone="expense" />
    <M.Sparkline data={[2,3,2.5,3.5,4]} aria-label="Balance" />
  </div>`,
  },
  {
    name: "CashflowChart",
    group: "Charts",
    height: 330,
    readme: `Income vs expenses per period as paired columns from one baseline, with hover readout (income, expenses, net) and a hidden data table.

**Consumer provides:** \`data\` (\`label\`, \`incomeCents\`, \`expenseCents\`), optional \`height\`, \`currency\`, \`title\`.

- Six to twelve periods. Over twelve: aggregate to quarters.
- Columns cap at 24px with a 2px gap; data-ends are rounded 4px.`,
    demo: `
  <M.CashflowChart data={[{label:"Jun",incomeCents:412000,expenseCents:298000},{label:"Jul",incomeCents:415000,expenseCents:362000},{label:"Aug",incomeCents:409000,expenseCents:441000},{label:"Sep",incomeCents:418000,expenseCents:305000},{label:"Oct",incomeCents:426000,expenseCents:318000},{label:"Nov",incomeCents:431000,expenseCents:214000}]} />`,
  },
  {
    name: "ProjectionChart",
    group: "Charts",
    height: 350,
    readme: `Balance history as a solid ink line that continues into a dashed periwinkle forecast with a confidence band. Crosshair readout on hover.

**Consumer provides:** \`data\` (\`label\`, \`valueCents\`, \`projected\`, \`lowCents\`, \`highCents\`), history first.

- Forecasts come from recurring items and average spending; the band is the pessimistic/optimistic range.
- Periwinkle (\`mio-forecast\`) always means "not happened yet" across the app.`,
    demo: `
  <M.ProjectionChart data={[{label:"Jun",valueCents:4102000},{label:"Jul",valueCents:4216000},{label:"Aug",valueCents:4184000},{label:"Sep",valueCents:4297000},{label:"Oct",valueCents:4405000},{label:"Nov",valueCents:4821035},{label:"Dec",valueCents:4930000,projected:true,lowCents:4860000,highCents:5010000},{label:"Jan",valueCents:5040000,projected:true,lowCents:4910000,highCents:5190000},{label:"Feb",valueCents:5160000,projected:true,lowCents:4950000,highCents:5380000},{label:"Mar",valueCents:5290000,projected:true,lowCents:5000000,highCents:5580000}]} />`,
  },
  {
    name: "CategoryDonut",
    group: "Charts",
    height: 230,
    readme: `Spending split by category: donut with the total in the center and a legend with amounts and percentages. Hover a slice or row to focus it.

**Consumer provides:** \`data\` (\`label\`, \`valueCents\`), optional \`caption\`, \`size\`.

- Slices are sorted and anything past the fifth folds into "Other" (\`foldSlices\`), so it never exceeds six chart colors.
- The legend carries the values, so the low-contrast gold slot is always labelled.`,
    demo: `
  <M.CategoryDonut data={[{label:"Housing",valueCents:95000},{label:"Groceries",valueCents:48200},{label:"Transport",valueCents:18400},{label:"Dining out",valueCents:15600},{label:"Kids",valueCents:12100},{label:"Health",valueCents:6300},{label:"Gifts",valueCents:3900}]} />`,
  },
  {
    name: "Alert",
    group: "Feedback",
    height: 260,
    readme: `In-flow notice that stays where the problem is. Replaces alert dialogs and toasts.

**Consumer provides:** \`tone\`, \`title\` and/or children, optional \`action\`, \`onDismiss\`.

- Success after saving a FormPanel: \`success\` Alert at the top of the panel, dismissible.
- Errors say what went wrong and how to fix it, with the fix as the \`action\`.`,
    demo: `
  <div style={{display:"grid",gap:12}}>
    <M.Alert tone="success" title="Transaction saved" onDismiss={() => {}}>Esselunga −€82.40 added to Joint account.</M.Alert>
    <M.Alert tone="warning" title="Dining out is at 91% of budget">€14 left until 30 Nov.</M.Alert>
    <M.Alert tone="danger" title="Bank sync failed" action={<M.Button size="sm" variant="secondary">Reconnect Intesa</M.Button>}>Your Intesa connection expired on 2 Nov.</M.Alert>
  </div>`,
  },
  {
    name: "EmptyState",
    group: "Feedback",
    height: 260,
    readme: `Placeholder that names what will appear and offers the one action that fills the space.

**Consumer provides:** \`title\`, optional \`icon\`, \`description\`, \`action\` (usually opens the FormPanel above).`,
    demo: `
  <M.EmptyState icon={<M.CalendarClock />} title="No recurring payments yet" description="Add rent, bills and subscriptions to see them here and in your projection." action={<M.Button iconStart={<M.Plus />}>Add recurring payment</M.Button>} />`,
  },
  {
    name: "Skeleton",
    group: "Feedback",
    height: 120,
    readme: `Loading placeholder shaped like the content it replaces. Use while Supabase queries stream in; never a full-page spinner.

**Consumer provides:** \`width\`, \`height\`, \`radius\`, or \`lines\`.`,
    demo: `
  <div style={{display:"flex",gap:12,alignItems:"center"}}>
    <M.Skeleton width={40} height={40} radius="md" />
    <div style={{flex:1}}><M.Skeleton lines={2} height={12} /></div>
    <M.Skeleton width={72} height={16} />
  </div>`,
  },
];
