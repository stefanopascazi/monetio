import { BankReviewList } from "@/components/banking/BankReviewList";
import { listOpenBankReviews } from "@/lib/data/bank-reviews";

/** "Da rivedere" bank movements of this account, on top of its page: no trip to the bank settings. */
export async function AccountBankReviews({ accountId }: { accountId: string }) {
  const reviews = (await listOpenBankReviews()).filter((r) => r.accountId === accountId);
  return <BankReviewList reviews={reviews} />;
}
