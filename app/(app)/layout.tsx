import { Suspense } from "react";
import { AdvisorBubble } from "@/components/advisor/AdvisorBubble";
import { AdvisorPanel } from "@/components/advisor/AdvisorPanel";
import { AdvisorProvider } from "@/components/advisor/AdvisorProvider";
import { BellLink } from "@/components/notifications/BellLink";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { QuickCreateSection } from "@/components/quick-create/QuickCreateSection";
import { AppNav, AppNavFallback } from "@/components/shell/AppNav";
import { TopBar } from "@/components/shell/TopBar";
import { advisorEnabled } from "@/lib/data/advisor";

// Signed-in area: wide content wrapper, bottom bar on phones and rail from 960px, advisor chat everywhere.
export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <AdvisorProvider enabled={advisorEnabled()}>
      <div className="app-shell mx-auto flex w-full max-w-[1440px] flex-col gap-6 px-4 pt-6 pb-32 min-[960px]:pb-12 min-[960px]:pl-[124px] xl:pr-8">
        <TopBar
          create={
            <Suspense fallback={null}>
              <QuickCreateSection />
            </Suspense>
          }
          bell={
            <Suspense fallback={<BellLink unread={0} />}>
              <NotificationBell />
            </Suspense>
          }
        />
        {children}
      </div>
      <Suspense fallback={<AppNavFallback />}>
        <AppNav />
      </Suspense>
      {/* They read the pathname: Suspense keeps the pages prerenderable. */}
      <Suspense fallback={null}>
        <AdvisorBubble />
        <AdvisorPanel />
      </Suspense>
    </AdvisorProvider>
  );
}
