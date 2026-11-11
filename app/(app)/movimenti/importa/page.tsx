import { redirect } from "next/navigation";

// The import moved to the "Dati e banche" section.
export default function LegacyImportPage() {
  redirect("/dati/importa");
}
