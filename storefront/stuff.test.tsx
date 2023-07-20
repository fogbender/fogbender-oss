import { parse } from "fogbender-client/src/shared/components/SelectDateMenu";
import { afterEach, beforeEach, expect } from "vitest";

const parseDates = (input: string) => {
  return parse(input).map(x => x.displayLabel);
};

beforeEach(() => {
  // vi.setSystemTime(new Date("2021-01-01T00:00:00.000Z"));
});

afterEach(() => {
  // vi.restoreCurrentDate();
});

test.only("ok 1", () => {
  expect(parseDates("a")).toMatchInlineSnapshot(`
    [
      "on sunday",
      "on monday",
      "on tuesday",
    ]
  `);
  expect(parseDates("")).toMatchInlineSnapshot(`
    [
      "Tomorrow",
      "This Saturday",
      "Next Week",
    ]
  `);
  expect(parseDates("i")).toMatchInlineSnapshot(`
    [
      "in a minute",
      "in an hour",
      "in a day",
    ]
  `);
  expect(parseDates("in")).toMatchInlineSnapshot(`
    [
      "in a minute",
      "in an hour",
      "in a day",
    ]
  `);
  expect(parseDates("in 3")).toMatchInlineSnapshot(`
    [
      "in 3 minutes",
      "in 3 hours",
      "in 3 days",
    ]
  `);
  expect(parseDates("in 3 d")).toMatchInlineSnapshot(`
    [
      "in 3 days",
    ]
  `);
  expect(parseDates("in 3 da")).toMatchInlineSnapshot(`
    [
      "in 3 days",
    ]
  `);
  expect(parseDates("3 day")).toMatchInlineSnapshot(`
    [
      "in 3 days",
    ]
  `);
});
