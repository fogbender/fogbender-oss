import { UserToken, Token } from "./types";

export function checkToken(token: Token | undefined) {
  if (token !== undefined) {
    const errors: { [key: string]: string } = {};

    ["userAvatarUrl", "widgetKey", "userJWT", "userHMAC", "userPaseto"].forEach(
      x =>
        typeof token[x] !== "string" &&
        typeof token[x] !== "undefined" &&
        token[x] !== null &&
        (errors[x] = "should be string or undefined or null")
    );

    const isString = (x: string) =>
      typeof token[x] !== "string" && (errors[x] = "should be string");

    if (isUserToken(token)) {
      ["customerId", "customerName", "userId", "userEmail", "userName"].forEach(isString);

      if (!(token.userJWT || token.userHMAC || token.userPaseto || token.widgetKey)) {
        errors.userJWT = "userJWT or widgetKey should be set";
      }
    } else {
      ["widgetId", "widgetKey"].forEach(isString);
    }
    if (Object.keys(errors).length > 0) {
      return errors;
    }
  }
  return;
}

export function isUserToken(token: Token | undefined): token is UserToken {
  return token ? "userId" in token : false;
}
