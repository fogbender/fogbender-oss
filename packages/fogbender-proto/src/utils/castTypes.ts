import type {
  EventAgentGroup,
  EventRoom,
  EventMessage,
  EventBadge,
  EventCustomer,
  EventTag,
  EventSeen,
  EventTyping,
  EventUser,
} from "../schema";

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
const isEventBadge = (x: ExtendsMessage<EventBadge>): x is EventBadge =>
  x.msgType === "Event.Badge";
const isEventCustomer = (x: ExtendsMessage<EventCustomer>): x is EventCustomer =>
  x.msgType === "Event.Customer";
const isEventTag = (x: ExtendsMessage<EventTag>): x is EventTag => x.msgType === "Event.Tag";
const isEventSeen = (x: ExtendsMessage<EventSeen>): x is EventSeen => x.msgType === "Event.Seen";
const isEventTyping = (x: ExtendsMessage<EventTyping>): x is EventTyping =>
  x.msgType === "Event.Typing";
export const isEventUser = (x: ExtendsMessage<EventUser>): x is EventUser =>
  x.msgType === "Event.User";
const isEventAgentGroup = (x: ExtendsMessage<EventAgentGroup>): x is EventAgentGroup =>
  x.msgType === "Event.AgentGroup";

export function extractEventRoom(items: ExtendsMessage<EventRoom>[]) {
  return extract(items, isEventRoom);
}

export function extractEventMessage(items: ExtendsMessage<EventMessage>[]) {
  return extract(items, isEventMessage);
}

export function extractEventBadge(items: ExtendsMessage<EventBadge>[]) {
  return extract(items, isEventBadge);
}

export function extractEventCustomer(items: ExtendsMessage<EventCustomer>[]) {
  return extract(items, isEventCustomer);
}

export function extractEventTag(items: ExtendsMessage<EventTag>[]) {
  return extract(items, isEventTag);
}

export function extractEventSeen(items: ExtendsMessage<EventSeen>[]) {
  return extract(items, isEventSeen);
}

export function extractEventTyping(items: ExtendsMessage<EventTyping>[]) {
  return extract(items, isEventTyping);
}

export function extractEventUser(items: ExtendsMessage<EventUser>[]) {
  return extract(items, isEventUser);
}

export function extractEventAgentGroup(items: ExtendsMessage<EventAgentGroup>[]) {
  return extract(items, isEventAgentGroup);
}
