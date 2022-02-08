import { Token } from "./types";

export function checkToken(token: Token | undefined) {
  if (token !== undefined) {
    const errors: { [key: string]: string } = {};

    ["customerId", "customerName", "userId", "userEmail", "userName"].forEach(
      x => typeof token[x] !== "string" && (errors[x] = "should be string")
    );

    ["userAvatarUrl", "widgetKey", "userJWT", "userHMAC", "userPaseto"].forEach(
      x =>
        typeof token[x] !== "string" &&
        typeof token[x] !== "undefined" &&
        token[x] !== null &&
        (errors[x] = "should be string or undefined or null")
    );

    if (!(token.userJWT || token.userHMAC || token.userPaseto || token.widgetKey)) {
      errors.userJWT = "userJWT or widgetKey should be set";
    }
    if (Object.keys(errors).length > 0) {
      return errors;
    }
  }
  return;
}
