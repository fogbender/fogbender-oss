import type { WritableAtom } from "jotai";

const atoms = new Map<string, WritableAtom<unknown, unknown[], unknown>>();

export const atomWithKey = <A extends WritableAtom<any, any[], any>>(key: string, atom: A) => {
  if (!atom.debugLabel) {
    atom.debugLabel = key;
  }
  if (import.meta.env.DEV) {
    const oldAtom = atoms.get(key);
    if (oldAtom) {
      return oldAtom as A;
    } else {
      atoms.set(key, atom);
      return atom;
    }
  }
  return atom;
};
