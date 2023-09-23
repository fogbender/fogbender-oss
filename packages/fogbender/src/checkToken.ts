import { UserToken, Token, VisitorToken } from "./types";

export function checkToken(token: Token | undefined) {
  if (token !== undefined) {
    const errors: { [key: string]: string } = {};

    ["userAvatarUrl", "widgetKey", "userJWT", "userHMAC", "userPaseto", "visitorKey"].forEach(
      x =>
        typeof token[x] !== "string" &&
        typeof token[x] !== "undefined" &&
        token[x] !== null &&
        (errors[x] = "should be string or undefined or null")
    );

    const isString = (x: string) =>
      typeof token[x] !== "string" && (errors[x] = "should be string");

    ["widgetId"].forEach(isString);

    if (isUserToken(token)) {
      ["customerId", "customerName", "userId", "userEmail", "userName"].forEach(isString);

      if (!(token.userJWT || token.userHMAC || token.userPaseto || token.widgetKey)) {
        errors.userJWT = "userJWT or widgetKey should be set";
      }
    } else if (isVisitorToken(token)) {
      ["visitorKey"].forEach(isString);
    } else {
      ["widgetKey"].forEach(isString);
    }
    if (Object.keys(errors).length > 0) {
      return errors;
    }
  }
  return;
}

export function checkVisitorToken(token: Token | undefined) {
  if (token !== undefined && "visitor" in token) {
    const { widgetId } = token;
    const key = `visitor-test-${widgetId}`;
    const proof = Math.random().toString();

    try {
      localStorage.setItem(key, proof);
      if (localStorage.getItem(key) === proof) {
        localStorage.removeItem(key);
        return false;
      } else {
        return true;
      }
    } catch (e) {
      return true;
    }
  } else {
    return false;
  }
}

export function isUserToken(token: Token | undefined): token is UserToken {
  return token ? "userId" in token : false;
}

export function isVisitorToken(token: Token | undefined): token is VisitorToken {
  return token ? "visitor" in token : false;
}
