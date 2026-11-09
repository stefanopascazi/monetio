import "server-only";
import { cache } from "react";
import { getContext } from "@/lib/data/context";
import { categoryRefs } from "@/components/common/options";
import { listAccounts, listCategories } from "@/lib/data/queries";

/** Accounts, categories and members shared by the statement blocks (one read per request). */
export const loadStatementRefs = cache(async () => {
  const [{ members }, accounts, categories] = await Promise.all([getContext(), listAccounts(), listCategories()]);
  return {
    members,
    accounts,
    categories,
    refs: accounts.filter((a) => !a.archived).map((a) => ({ id: a.id, name: a.name })),
    catRefs: categoryRefs(categories),
  };
});
