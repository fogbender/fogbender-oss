export function getPreviousMessageId(id: string) {
  if (typeof BigInt === "function") {
    const num = BigInt(id.slice(1));
    return `m${num - BigInt(1)}`;
  } else {
    return;
  }
}
