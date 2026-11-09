import { Search } from "lucide-react";
import { Button, Select, TextField } from "@monetio/ui";
import { type NamedRef, selectableRefs, toOptions } from "@/components/common/options";

/** GET form: filters live in the URL so they survive reloads and can be shared. */
export function TransactionFilters({ month, accountId, categoryId, q, accounts, categories }: {
  month: string;
  accountId?: string;
  categoryId?: string;
  q?: string;
  accounts: NamedRef[];
  categories: NamedRef[];
}) {
  return (
    <form method="get" className="grid grid-cols-1 items-end gap-3 rounded-[22px] bg-surface p-4 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_1.2fr_auto]">
      <TextField name="mese" type="month" label="Mese" defaultValue={month} />
      <Select name="conto" label="Conto" defaultValue={accountId ?? ""} options={[{ value: "", label: "Tutti i conti" }, ...accounts.map((a) => ({ value: a.id, label: a.name }))]} />
      <Select name="categoria" label="Categoria" defaultValue={categoryId ?? ""} options={[{ value: "", label: "Tutte" }, ...toOptions(selectableRefs(categories, categories.map((c) => c.id)))]} />
      <TextField name="q" label="Cerca" placeholder="Descrizione" defaultValue={q ?? ""} prefix={<Search className="size-4" aria-hidden="true" />} />
      <Button type="submit" variant="secondary">
        Filtra
      </Button>
    </form>
  );
}
