import { test } from "node:test";
import assert from "node:assert/strict";
import { activeOn, attrition, directoryStatus, outCounts } from "./metrics";

const today = "2026-11-22";

test("activeOn: hire day counts, exit day does not", () => {
  const e = { hire_date: "2025-01-10", exit_date: "2026-11-22" };
  assert.equal(activeOn(e, "2025-01-09"), false);
  assert.equal(activeOn(e, "2025-01-10"), true);
  assert.equal(activeOn(e, "2026-11-21"), true);
  assert.equal(activeOn(e, today), false);
});

test("outCounts: leave + WFH same day counts once, as leave", () => {
  const rows = [
    { kind: "leave" as const, start_date: "2026-11-20", end_date: "2026-11-24", employee_id: "a" },
    { kind: "wfh" as const, start_date: today, end_date: today, employee_id: "a" },
    { kind: "wfh" as const, start_date: today, end_date: today, employee_id: "b" },
    { kind: "leave" as const, start_date: "2026-11-23", end_date: "2026-11-23", employee_id: "c" },
  ];
  assert.deepEqual(outCounts(rows, today), { leave: 1, wfh: 1 });
});

test("attrition: leavers in 365 days over average headcount", () => {
  const people = [
    ...Array.from({ length: 9 }, () => ({ hire_date: "2020-01-01", exit_date: null })),
    { hire_date: "2020-01-01", exit_date: "2026-06-01" }, // left this year
    { hire_date: "2020-01-01", exit_date: "2025-01-01" }, // left over a year ago: not counted
  ];
  // now 9, a year ago 10 → avg 9.5; 1 / 9.5 = 10.5%
  assert.deepEqual(attrition(people, today), { leavers: 1, pct: 10.5 });
  assert.deepEqual(attrition([], today), { leavers: 0, pct: 0 });
});

test("directoryStatus precedence and 90-day probation", () => {
  assert.equal(directoryStatus({ hire_date: "2020-01-01", exit_date: "2026-12-31" }, today, true), "Notice period");
  assert.equal(directoryStatus({ hire_date: "2026-12-01", exit_date: null }, today, false), "Starting soon");
  assert.equal(directoryStatus({ hire_date: "2026-11-01", exit_date: null }, today, true), "On leave");
  assert.equal(directoryStatus({ hire_date: "2026-08-24", exit_date: null }, today, false), "Probation"); // day 90
  assert.equal(directoryStatus({ hire_date: "2026-08-23", exit_date: null }, today, false), "Active");
});
