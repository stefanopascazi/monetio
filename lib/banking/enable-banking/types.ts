// Subset of the Enable Banking ASPSP (bank) record used by MonetIO; other fields are ignored.
export type Aspsp = {
  name: string;
  country: string;
  bic?: string | null;
  logo?: string | null;
  /** "personal" and/or "business". */
  psu_types?: string[];
  /** Maximum consent validity, in seconds. */
  maximum_consent_validity?: number | null;
  beta?: boolean;
};
