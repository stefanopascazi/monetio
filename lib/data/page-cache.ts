// Browser-side caching of signed-in pages ('use cache: private').
// Results never reach a server cache; every Server Action calls refresh(), which clears the
// client cache, so the user's own changes show at once. Changes by other members show within `stale`.

export type SearchParams = Record<string, string | string[] | undefined>;

/** 5 minutes: the minimum that lets prefetched links carry the page before the click. */
export const PAGE_CACHE = { stale: 300, revalidate: 300, expire: 3600 } as const;
