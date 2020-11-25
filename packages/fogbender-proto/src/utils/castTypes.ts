import { EventRoom, EventMessage } from "../schema";

// suppose you have `items` or type `(A|B|C)[]` but you know it's actually just `A[]`
// running `extractA(items)` will return you type of `A[]`, it will check that it's
// really has type `A` on dev but will be a noop in production

const extract = <T, S extends T>(
  items: T[],
  predicate: (value: T, index: number, array: T[]) => value is S
): S[] => {
  if (process.env.NODE_ENV === "development") {
    if (items.every(predicate)) {
      // this works in typescript but doesn't in rollup for some reason
      // return items;
      // FIXME: so let's do any for now
      return items as any;
    } else {
      console.error(items, predicate);
      throw new Error(`Oops, wrong type of items was passed`);
    }
  }
  // we do real type checking above
  return items as any;
};

type ExtendsMessage<Message> = Message | { msgType: string };

const isEventRoom = (x: ExtendsMessage<EventRoom>): x is EventRoom => x.msgType === "Event.Room";
const isEventMessage = (x: ExtendsMessage<EventMessage>): x is EventMessage =>
  x.msgType === "Event.Message";

export function extractEventRoom(items: ExtendsMessage<EventRoom>[]) {
  return extract(items, isEventRoom);
}

export function extractEventMessage(items: ExtendsMessage<EventMessage>[]) {
  return extract(items, isEventMessage);
}
