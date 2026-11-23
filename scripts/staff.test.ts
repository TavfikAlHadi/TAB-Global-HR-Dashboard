import { test } from "node:test";
import assert from "node:assert/strict";
import { parseStaff } from "./staff";

const HEAD = "full_name,email,title,office_id,department_id,brand_id,role,hire_date";

test("parses, lowercases email, strips BOM and quotes, links department manager", () => {
  const rows = parseStaff(`\uFEFF${HEAD}\r\n"Head, Sales",Boss@x.com,Head of Sales,SG,sales,tab,manager,2020-01-02\r\nA B,a@x.com,Exec,KL,sales,tab,employee,2024-05-06\r\n\r\n`);
  assert.equal(rows.length, 2);
  assert.equal(rows[0].full_name, "Head, Sales");
  assert.equal(rows[0].email, "boss@x.com");
  assert.equal(rows[0].manager_email, null); // never their own manager
  assert.equal(rows[1].manager_email, "boss@x.com");
});

test("explicit manager_email wins over the department fallback", () => {
  const rows = parseStaff(`${HEAD},manager_email\nM,m@x.com,Head,SG,sales,tab,manager,2020-01-01,\nH,h@x.com,HR,SG,finance-admin,tab,hr_admin,2020-01-01,\nE,e@x.com,Exec,SG,sales,tab,employee,2020-01-01,H@x.com`);
  assert.equal(rows[2].manager_email, "h@x.com");
});

test("collects every problem with line numbers", () => {
  assert.throws(
    () => parseStaff(`${HEAD},manager_email\nA,a@x.com,T,XX,sales,tab,boss,22/11/2026,\nB,A@x.com,T,SG,sales,tab,employee,2020-01-01,nobody@x.com`),
    (e: Error) =>
      ["line 2: unknown office_id", "line 2: unknown role", "line 2: hire_date", "line 3: duplicate email", "line 3: manager_email"].every((s) => e.message.includes(s)),
  );
  assert.throws(() => parseStaff("full_name,email\nA,a@x.com"), /missing columns title/);
});
