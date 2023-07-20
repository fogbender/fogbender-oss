export function filterMap<T, U>(array: T[], map: (item: T) => U | undefined): U[];
export function filterMap<T, U>(
  array: ReadonlyArray<T>,
  map: (item: T) => U | undefined
): ReadonlyArray<U>;
export function filterMap<T, U>(array: ReadonlyArray<T>, map: (item: T) => U | undefined): U[] {
  if (array.length === 0) {
    return array as never[] as U[];
  }
  const out: U[] = [];
  for (const item of array) {
    const mapped = map(item);
    if (mapped !== undefined) {
      out.push(mapped);
    }
  }
  return out;
}
