import { test } from "node:test";
import assert from "node:assert/strict";
import { isStale } from "./sop";

test("stale only after more than 90 days", () => {
  const today = "2026-11-22";
  assert.equal(isStale("2026-08-25", today), false); // 89 days
  assert.equal(isStale("2026-08-24", today), false); // 90 days
  assert.equal(isStale("2026-08-23", today), true); // 91 days
});
