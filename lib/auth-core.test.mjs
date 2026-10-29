// Run with: node --test lib/auth-core.test.mjs
import assert from "node:assert/strict"
import { test } from "node:test"
import { MAX_TRIES, checkOtp, codeHash, newCode, readSession, sign, verify } from "./auth-core.ts"

const SECRET = "test-secret"

test("signed tokens round-trip and reject tampering or another secret", () => {
  const token = sign({ email: "ana@example.com", exp: 10 }, SECRET)
  assert.deepEqual(verify(token, SECRET), { email: "ana@example.com", exp: 10 })
  const [body, sig] = token.split(".")
  const forged = Buffer.from(JSON.stringify({ email: "otro@example.com", exp: 10 })).toString("base64url")
  assert.equal(verify(`${forged}.${sig}`, SECRET), null)
  assert.equal(verify(`${body}.${sig}x`, SECRET), null)
  assert.equal(verify(token, "other-secret"), null)
  assert.equal(verify(undefined, SECRET), null)
  assert.equal(verify("garbage", SECRET), null)
})

test("readSession enforces expiry and needs a secret", () => {
  const now = 1_000
  assert.equal(readSession(sign({ email: "a@b.co", exp: now + 1 }, SECRET), SECRET, now)?.email, "a@b.co")
  assert.equal(readSession(sign({ email: "a@b.co", exp: now }, SECRET), SECRET, now), null)
  assert.equal(readSession(sign({ email: "a@b.co", exp: now + 1 }, SECRET), undefined, now), null)
})

test("codes are 6 digits", () => {
  for (let i = 0; i < 50; i++) assert.match(newCode(), /^\d{6}$/)
})

test("checkOtp: ok, wrong code, other email, expired, locked, missing", () => {
  const now = 5_000
  const otp = { email: "a@b.co", hash: codeHash("a@b.co", "123456", SECRET), exp: now + 1, tries: 0, sentAt: now }
  assert.equal(checkOtp(otp, "123456", SECRET, now), "ok")
  assert.equal(checkOtp(otp, " 123456 ", SECRET, now), "ok")
  assert.equal(checkOtp(otp, "654321", SECRET, now), "invalid")
  assert.equal(checkOtp({ ...otp, email: "x@b.co" }, "123456", SECRET, now), "invalid")
  assert.equal(checkOtp({ ...otp, exp: now }, "123456", SECRET, now), "expired")
  assert.equal(checkOtp({ ...otp, tries: MAX_TRIES }, "123456", SECRET, now), "locked")
  assert.equal(checkOtp(null, "123456", SECRET, now), "missing")
})
