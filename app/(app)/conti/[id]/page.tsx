import { Suspense } from "react";
import { PageSkeleton } from "@/components/common/PageSkeleton";
import { StatementView } from "@/components/statement/StatementView";

export default function AccountPage({ params, searchParams }: PageProps<"/conti/[id]">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <AccountContent params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function AccountContent({ params, searchParams }: Pick<PageProps<"/conti/[id]">, "params" | "searchParams">) {
  const { id } = await params;
  return <StatementView id={id} searchParams={searchParams} />;
}
