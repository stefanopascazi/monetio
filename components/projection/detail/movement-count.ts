/** Italian note for lines merging several movements ("3 movimenti"); empty for a single one. */
export function movementCountLabel(count: number): string {
  return count > 1 ? `${count} movimenti` : "";
}
