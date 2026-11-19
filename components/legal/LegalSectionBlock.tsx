import type { LegalSection } from "@/lib/legal/types";

export function LegalSectionBlock({ section }: { section: LegalSection }) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="font-display text-lg font-semibold">{section.title}</h2>
      {section.paragraphs.map((text) => (
        <p key={text}>{text}</p>
      ))}
      {section.items && (
        <ul className="flex list-disc flex-col gap-1 pl-5">
          {section.items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      )}
    </section>
  );
}
