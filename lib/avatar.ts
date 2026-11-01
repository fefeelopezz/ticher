// Profile photos live in localStorage with the profile, so they are center-cropped
// to a small square JPEG (about 10-20 KB) instead of keeping the original file.
const SIZE = 160

export async function toAvatar(file: Blob): Promise<string> {
  const img = await createImageBitmap(file)
  const side = Math.min(img.width, img.height)
  const canvas = document.createElement("canvas")
  canvas.width = canvas.height = SIZE
  canvas.getContext("2d")!.drawImage(img, (img.width - side) / 2, (img.height - side) / 2, side, side, 0, 0, SIZE, SIZE)
  img.close()
  return canvas.toDataURL("image/jpeg", 0.85)
}

// Uploaded photos (notes, whiteboards) are stored as WebP, at most 2048 px on the long side: usually a
// fraction of the original, so IndexedDB fills slower and AI requests are lighter. GIFs (maybe animated)
// and existing WebPs are kept; so is the original whenever conversion fails or wouldn't save space.
const MAX_SIDE = 2048

export async function toWebp(file: File): Promise<File> {
  if (!/^image\/(png|jpeg|bmp)$/.test(file.type)) return file
  try {
    const img = await createImageBitmap(file)
    const scale = Math.min(1, MAX_SIDE / Math.max(img.width, img.height))
    const canvas = document.createElement("canvas")
    canvas.width = Math.round(img.width * scale)
    canvas.height = Math.round(img.height * scale)
    canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height)
    img.close()
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", 0.82))
    // Browsers without a WebP encoder hand back a PNG instead.
    if (!blob || blob.type !== "image/webp" || blob.size >= file.size) return file
    return new File([blob], file.name.replace(/\.[^.]+$/, "") + ".webp", { type: "image/webp" })
  } catch {
    return file
  }
}
