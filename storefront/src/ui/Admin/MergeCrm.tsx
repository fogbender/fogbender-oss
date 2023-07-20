import { getServerUrl } from "../../config";

export const getMergeLinkToken = async (mergeLinkTokenUrl: string, salt: string) => {
  if (mergeLinkTokenUrl === undefined) {
    return undefined;
  }

  const baseUrl = getServerUrl();
  const url = baseUrl + mergeLinkTokenUrl;

  const res = await fetch(url.toString(), {
    method: "POST",
    credentials: "include",
    body: JSON.stringify({ salt }),
  });

  if (res.status === 200) {
    const data = await res.json();
    return data;
  } else {
    return undefined;
  }
};
