import qs, { ParseOptions } from "query-string";

export function getQueryParam(query: string, key: string, options?: ParseOptions) {
  const value = qs.parse(query, options)[key];
  return typeof value === "string" ? value : undefined;
}
