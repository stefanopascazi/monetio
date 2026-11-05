import { ArrowLeftRight, BarChart3, CalendarClock, Car, Home, Landmark, LayoutDashboard, ShoppingCart, Wallet } from "lucide-react";
import {
  AccountCard,
  BottomNav,
  Card,
  CashflowChart,
  CategoryDonut,
  DueItem,
  ProjectionChart,
  TransactionRow,
} from "@monetio/ui";
import { DemoHero } from "./_demo/DemoHero";
import { DemoTopBar } from "./_demo/DemoTopBar";
import { QuickAddPanel } from "./_demo/QuickAddPanel";
import { cashflow, categories, projection } from "./_demo/demo-data";

const today = new Date(2026, 10, 5);

const nav = [
  { id: "home", label: "Home", icon: <LayoutDashboard />, href: "/" },
  { id: "accounts", label: "Accounts", icon: <Landmark />, href: "/" },
  { id: "activity", label: "Activity", icon: <ArrowLeftRight />, href: "/" },
  { id: "due", label: "Due", icon: <CalendarClock />, href: "/", badge: 2 },
  { id: "insights", label: "Insights", icon: <BarChart3 />, href: "/" },
];

// Design-system demo (sample data only).
export default function DemoPage() {
  return (
    <>
      <main className="mx-auto flex max-w-[1120px] flex-col gap-6 px-4 pt-6 pb-32 min-[960px]:pb-12 min-[960px]:pl-[124px]">
        <DemoTopBar />
        <DemoHero />

        <section aria-label="Accounts" className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <AccountCard name="Joint account" institution="Intesa Sanpaolo" type="checking" balanceCents={1243050} members={["Giulia Rossi", "Marco Rossi"]} reference="•• 4821" />
          <AccountCard name="Holiday fund" institution="Fineco" type="savings" balanceCents={460000} members={["Giulia Rossi", "Marco Rossi"]} />
          <AccountCard name="ETF portfolio" institution="Fineco" type="investment" balanceCents={3120000} members={["Giulia Rossi"]} change={6.8} />
        </section>

        <section className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[1.4fr_1fr]">
          <QuickAddPanel />
          <Card tone="coral" title="Coming up" subtitle="Next 30 days" padding="none">
            <DueItem title="Electricity · Enel" dueDate={new Date(2026, 10, 2)} amountCents={8640} frequency="bimonthly" account="Joint" today={today} />
            <DueItem title="Rent" dueDate={new Date(2026, 10, 7)} amountCents={95000} account="Joint" today={today} />
            <DueItem title="Salary" kind="income" dueDate={new Date(2026, 10, 27)} amountCents={285000} account="Personal" today={today} />
          </Card>
        </section>

        <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card title="Cash flow" subtitle="Last 6 months">
            <CashflowChart data={cashflow} />
          </Card>
          <Card title="Where it's heading" subtitle="Projection from recurring items">
            <ProjectionChart data={projection} />
          </Card>
        </section>

        <section className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_1.2fr]">
          <Card title="Spending by category" subtitle="November">
            <CategoryDonut data={categories} />
          </Card>
          <Card title="Recent activity" padding="none">
            <TransactionRow payee="Esselunga" category="Groceries" categoryIcon={<ShoppingCart />} categoryColor={1} account="Joint" date={new Date(2026, 10, 4)} amountCents={-8240} member="Giulia Rossi" today={today} />
            <TransactionRow payee="Rent November" category="Housing" categoryIcon={<Home />} categoryColor={3} account="Joint" date={new Date(2026, 10, 1)} amountCents={-95000} recurring member="Marco Rossi" today={today} />
            <TransactionRow payee="Salary · Acme Srl" category="Income" categoryIcon={<Wallet />} categoryColor={5} account="Personal" date={new Date(2026, 9, 27)} amountCents={285000} today={today} />
            <TransactionRow payee="Q8 fuel" category="Transport" categoryIcon={<Car />} categoryColor={2} account="Credit card" date={new Date(2026, 9, 26)} amountCents={-6200} pending today={today} />
          </Card>
        </section>
      </main>
      <BottomNav items={nav} activeId="home" />
    </>
  );
}
