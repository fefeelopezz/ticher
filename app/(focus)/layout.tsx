import { Suspense } from "react"
import { EB_Garamond } from "next/font/google"

// Serif for reading headings, like Astra's smart text.
const serif = EB_Garamond({ subsets: ["latin"], variable: "--font-serif" })

// Full-screen reading pages (no sidebar). Suspense lets dynamic params resolve per request.
export default function FocusLayout({ children }: LayoutProps<"/">) {
  return (
    <div className={`${serif.variable} flex min-h-svh flex-1 flex-col bg-background`}>
      <Suspense>{children}</Suspense>
    </div>
  )
}
