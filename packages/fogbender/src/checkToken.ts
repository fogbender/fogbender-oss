import { Token } from "./types";

export function checkToken(token: Token | undefined) {
  if (token === undefined) {
    return true;
  }
  return (
    typeof token.customerId === "string" &&
    typeof token.customerName === "string" &&
    typeof token.userId === "string" &&
    typeof token.userEmail === "string" &&
    typeof token.userName === "string" &&
    (typeof token.userAvatarUrl === "string" || typeof token.userAvatarUrl === "undefined")
  );
}
