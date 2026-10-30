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
