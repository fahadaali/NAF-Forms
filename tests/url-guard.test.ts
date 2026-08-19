import { test } from "node:test";
import assert from "node:assert/strict";
import { isDeliverableUrl } from "../src/lib/url-guard";

// حارس SSRF: الرابط يكتبه محرّر النموذج والنداء يخرج من خادمنا.

test("يقبل وجهة عامة على https", () => {
  for (const u of [
    "https://hooks.slack.com/services/x/y/z",
    "https://script.google.com/macros/s/AKfy/exec",
    "https://example.com:8443/path?a=1",
  ])
    assert.equal(isDeliverableUrl(u), true, u);
});

test("يردّ كل ما ليس https", () => {
  for (const u of [
    "http://example.com",          // بلا تعمية
    "file:///etc/passwd",
    "data:text/plain,x",
    "ftp://example.com",
    "javascript:alert(1)",
  ])
    assert.equal(isDeliverableUrl(u), false, u);
});

test("يردّ بيانات المثيل والعناوين المحجوزة", () => {
  for (const u of [
    "https://169.254.169.254/latest/meta-data/",  // بيانات المثيل
    "https://127.0.0.1/admin",
    "https://localhost/admin",
    "https://10.0.0.5/internal",
    "https://192.168.1.1/",
    "https://172.16.0.1/",
    "https://172.31.255.255/",
    "https://0.0.0.0/",
    "https://api.internal/",
    "https://db.local/",
    "https://[::1]/",
    "https://100.64.0.1/",         // CGNAT
  ])
    assert.equal(isDeliverableUrl(u), false, u);
});

test("172.15 و172.32 خارج المدى المحجوز فيُقبلان", () => {
  // المحجوز 172.16-172.31 فقط — والتعبير النمطي أسهل ما يُخطئ فيه
  assert.equal(isDeliverableUrl("https://172.15.0.1/"), true);
  assert.equal(isDeliverableUrl("https://172.32.0.1/"), true);
});

test("يردّ رابطاً يحمل بيانات اعتماد (تمويه على القارئ)", () => {
  assert.equal(isDeliverableUrl("https://evil.com@127.0.0.1/"), false);
  assert.equal(isDeliverableUrl("https://user:pass@example.com/"), false);
});

test("يردّ ما لا يُحلَّل رابطاً", () => {
  for (const u of ["", "   ", "not a url", "https://"])
    assert.equal(isDeliverableUrl(u), false, JSON.stringify(u));
});
