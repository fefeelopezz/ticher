import type { Metadata } from "next"
import { Landing } from "./landing"

// Signed-out visitors land here: proxy.ts rewrites "/" to this page when there's no session.
export const metadata: Metadata = { alternates: { canonical: "/" } }

export default function WelcomePage() {
  return <Landing />
}
