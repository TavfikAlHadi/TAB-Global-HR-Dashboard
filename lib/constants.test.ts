import { test } from "node:test";
import assert from "node:assert/strict";
import { cleanSocialUrl, socialUrlProblem } from "./constants";

test("social links must be https on the chosen platform's own domain", () => {
  assert.equal(socialUrlProblem("linkedin", "https://www.linkedin.com/posts/tab-global_abc"), null);
  assert.equal(socialUrlProblem("linkedin", "https://lnkd.in/xyz"), null);
  assert.equal(socialUrlProblem("tiktok", "https://www.tiktok.com/@tab/video/1"), null);
  assert.equal(socialUrlProblem("instagram", "https://instagram.com/p/abc"), null);
  assert.match(socialUrlProblem("facebook", "http://www.facebook.com/tab/posts/1")!, /https/);
  assert.match(socialUrlProblem("facebook", "https://www.linkedin.com/posts/x")!, /Facebook/);
  assert.match(socialUrlProblem("instagram", "https://evilinstagram.com/p/abc")!, /Instagram/); // lookalike domain
  assert.match(socialUrlProblem("instagram", "https://instagram.com.evil.io/p/abc")!, /Instagram/);
  assert.match(socialUrlProblem("instagram", "javascript:alert(1)")!, /https/);
  assert.match(socialUrlProblem("x", "https://x.com/tab")!, /platform/);
  assert.match(socialUrlProblem("linkedin", "not a url")!, /valid/);
});

test("share-tracking parameters are stripped, real post parameters kept", () => {
  assert.equal(
    cleanSocialUrl("https://www.linkedin.com/posts/tab-share-123-HcgK/?utm_source=social_share_send&utm_medium=member_desktop_web&rcm=ACoAADZW7gw"),
    "https://www.linkedin.com/posts/tab-share-123-HcgK/",
  );
  assert.equal(cleanSocialUrl("https://www.instagram.com/p/abc/?igsh=MWQ1ZGU"), "https://www.instagram.com/p/abc/");
  assert.equal(cleanSocialUrl("https://www.tiktok.com/@tab/video/1?_r=1&_t=ZS-8"), "https://www.tiktok.com/@tab/video/1");
  assert.equal(
    cleanSocialUrl("https://www.facebook.com/permalink.php?story_fbid=42&id=7&fbclid=XYZ#comments"),
    "https://www.facebook.com/permalink.php?story_fbid=42&id=7",
  );
});
