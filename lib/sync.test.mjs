// Run with: node --test lib/sync.test.mjs
import assert from "node:assert/strict"
import { test } from "node:test"
import { planSync } from "./sync.ts"

test("cloud data replaces local data", () => {
  assert.deepEqual(planSync(["preps", "profile"], ["preps", "profile"], []), { apply: ["preps", "profile"], push: [] })
})

test("unsent local changes are pushed, not overwritten", () => {
  assert.deepEqual(planSync(["preps", "profile"], ["preps", "profile"], ["preps"]), { apply: ["profile"], push: ["preps"] })
})

test("data only this browser has is uploaded", () => {
  assert.deepEqual(planSync([], ["preps", "chats"], []), { apply: [], push: ["preps", "chats"] })
})

test("a key both dirty and missing from the cloud is pushed once", () => {
  assert.deepEqual(planSync(["profile"], ["chats"], ["chats"]), { apply: ["profile"], push: ["chats"] })
})
