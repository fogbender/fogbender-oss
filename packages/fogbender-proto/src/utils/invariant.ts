// License MIT: https://github.com/alexreardon/tiny-invariant/blob/master/LICENSE
// License MIT: https://github.com/iyegoroff/ts-tiny-invariant/blob/master/LICENSE

const isProduction = process.env.NODE_ENV === "production";

export function invariant(
  condition: boolean,
  onError?: string | (() => void),
  devOnly?: string | (() => void)
): asserts condition {
  if (condition) {
    return;
  }

  if (!isProduction) {
    const provided = typeof devOnly === "function" ? devOnly() : devOnly;
    if (provided) {
      throw new Error("Invariant failed " + provided);
    }
  }

  const provided = typeof onError === "function" ? onError() : onError;
  throw new Error("Invariant failed" + (provided ? " " + provided : ""));
}
