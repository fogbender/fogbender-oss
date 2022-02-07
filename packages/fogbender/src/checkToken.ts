import { Token } from "./types";

export function checkToken(token: Token | undefined) {
  if (token !== undefined) {
    const errors: { [key: string]: string } = {};

    ["customerId", "customerName", "userId", "userEmail", "userName"].forEach(
      x => typeof token[x] !== "string" && (errors[x] = "should be string")
    );

    if (typeof token.userAvatarUrl !== "string" && typeof token.userAvatarUrl !== "undefined")
      errors.userAvatarUrl = "should be string or undefined";

    if (Object.keys(errors).length > 0) {
      return errors;
    }
  }
  return;
}
