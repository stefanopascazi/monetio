/** One titled block of a legal page: paragraphs first, then an optional bullet list. */
export type LegalSection = {
  title: string;
  paragraphs: string[];
  items?: string[];
};

export type LegalDocument = {
  title: string;
  intro: string;
  updatedAt: string;
  sections: LegalSection[];
};
