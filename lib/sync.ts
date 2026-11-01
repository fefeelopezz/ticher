// The localStorage keys that sync to the cloud; /api/data accepts only these.
export const DATA_KEYS = ["preps", "subjects", "events", "chats", "lessons", "minutes", "profile"] as const

// Decides what a cloud pull does with each key, kept free of browser APIs so Node can test it.
// The cloud wins, except for keys changed here that haven't reached it yet (dirty): those are pushed,
// as are keys only this browser has (data saved before cloud sync existed).
export function planSync(cloudKeys: string[], localKeys: string[], dirty: string[]) {
  const pending = new Set(dirty)
  const inCloud = new Set(cloudKeys)
  return {
    apply: cloudKeys.filter((k) => !pending.has(k)),
    push: [...new Set([...dirty, ...localKeys.filter((k) => !inCloud.has(k))])],
  }
}
