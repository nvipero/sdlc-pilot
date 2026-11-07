import assert from "node:assert/strict";
import { greet, weather } from "../../hello/index.ts";
Deno.test("greet", () => { assert.equal(greet("a", new Date(2026, 0, 2)), "hello a 2026-01-02"); });
Deno.test("weather stubbed", async () => {
  const orig = globalThis.fetch;
  globalThis.fetch = () => Promise.resolve(new Response(JSON.stringify({ sky: "clear" })));
  try { assert.equal(await weather(), "clear"); } finally { globalThis.fetch = orig; }
});
