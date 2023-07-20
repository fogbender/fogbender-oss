import { getConfig } from ".";

describe("getConfig", () => {
  it("is truthy", () => {
    expect(getConfig()).toMatchInlineSnapshot(`
      Object {
        "serverApiUrl": "http://localhost:8000/api",
      }
    `);
  });
});
