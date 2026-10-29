"use client"

import { mdKey, saveFile } from "./files"
import { pagesToMarkdown, type TextPiece } from "./markdown"

// Reads a PDF in the browser with pdf.js (no upload, no AI quota) and returns its text as Markdown.
export async function pdfToMarkdown(file: Blob) {
  const pdfjs = await import("pdfjs-dist")
  pdfjs.GlobalWorkerOptions.workerSrc ||= new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString()
  const task = pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) })
  try {
    const doc = await task.promise
    const pages: TextPiece[][] = []
    for (let n = 1; n <= doc.numPages; n++) {
      const page = await doc.getPage(n)
      const { items } = await page.getTextContent()
      pages.push(
        items.flatMap((it) => {
          if (!("str" in it)) return []
          const [, , c, d, x, y] = it.transform as number[]
          return [{ str: it.str, x, y, width: it.width, size: Math.hypot(c, d) || it.height, eol: it.hasEOL }]
        })
      )
      page.cleanup()
    }
    return pagesToMarkdown(pages)
  } finally {
    await task.destroy()
  }
}

// Converts and stores the Markdown copy next to the PDF; returns its length (0 = no text, e.g. a scan).
export async function convertPdf(id: string, file: Blob) {
  const md = await pdfToMarkdown(file)
  if (md) await saveFile(mdKey(id), new Blob([md], { type: "text/markdown" }))
  return md.length
}
