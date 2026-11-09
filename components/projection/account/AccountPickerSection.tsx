import { listAccounts } from "@/lib/data/queries";
import { ProjectionAccountPicker } from "./ProjectionAccountPicker";

/** Same visible accounts as the projection, loaded on their own so the picker doesn't wait for it. */
export async function AccountPickerSection() {
  const accounts = await listAccounts();
  return <ProjectionAccountPicker accounts={accounts.filter((a) => !a.archived).map((a) => ({ id: a.id, name: a.name }))} />;
}
