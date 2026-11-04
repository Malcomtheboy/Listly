import type { ListingInput } from './types';

// Hands a listing from wherever it came in (home screen, share sheet) to the
// analyze screen. Kept in memory rather than route params because screenshots
// are several MB of base64. The analyze screen clears it once it is done, so a
// re-render (or React's dev double-mount) still finds the same input.
let pending: ListingInput | null = null;

export function setPendingInput(input: ListingInput) {
  pending = input;
}

export function peekPendingInput(): ListingInput | null {
  return pending;
}

export function clearPendingInput(input: ListingInput) {
  if (pending === input) pending = null;
}
