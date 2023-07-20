// in typescript 4.1 new option noUncheckedIndexedAccess was added,
// so once we migrate to it we can remove this function
// https://github.com/microsoft/TypeScript/pull/39560
// TODO: see if we can remove it after an update of TS
export function maybeUndefined<T>(value: T | undefined): T | undefined {
  return value;
}
