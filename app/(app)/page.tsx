import { Suspense } from "react"
import { Chat } from "@/components/chat"

export default function AskPage({ searchParams }: PageProps<"/">) {
  return (
    <Suspense>
      <ChatFromUrl searchParams={searchParams} />
    </Suspense>
  )
}

async function ChatFromUrl({ searchParams }: Pick<PageProps<"/">, "searchParams">) {
  const { prompt, chat, subject } = await searchParams
  const str = (v: string | string[] | undefined) => (typeof v === "string" ? v : undefined)
  // Keyed by conversation so "Nuevo chat" and history links start from a clean component.
  return (
    <Chat
      key={str(chat) ?? `new:${str(prompt) ?? ""}`}
      chatId={str(chat)}
      initialPrompt={str(prompt)}
      initialSubject={str(subject)}
    />
  )
}
