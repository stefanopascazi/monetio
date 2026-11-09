import { Suspense } from "react";
import { QuickCreateSection } from "@/components/quick-create/QuickCreateSection";
import { AppNav, AppNavFallback } from "@/components/shell/AppNav";
import { TopBar } from "@/components/shell/TopBar";

// Signed-in area: wide content wrapper, bottom bar on phones and rail from 960px.
export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-6 px-4 pt-6 pb-32 min-[960px]:pb-12 min-[960px]:pl-[124px] xl:pr-8">
        <TopBar
          create={
            <Suspense fallback={null}>
              <QuickCreateSection />
            </Suspense>
          }
        />
        {children}
      </div>
      <Suspense fallback={<AppNavFallback />}>
        <AppNav />
      </Suspense>
    </>
  );
}
