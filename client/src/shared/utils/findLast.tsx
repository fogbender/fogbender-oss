export function findLast<T>(arr: T[], predicate: (x: T) => boolean) {
  let index = arr.length;
  while (index-- > 0) {
    if (predicate(arr[index])) {
      return arr[index];
    }
  }
  return undefined;
}
