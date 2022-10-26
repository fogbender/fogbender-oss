import { Token } from "fogbender";

export const addVersion = (token?: Token): Token | undefined => {
  if (token) {
    token.versions = token.versions || {};
    token.versions["fogbender-element"] = "0.1.2";
  }
  return token;
};
