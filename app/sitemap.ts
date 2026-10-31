import type { MetadataRoute } from "next"

export default function sitemap(): MetadataRoute.Sitemap {
  return [{ url: "https://www.ticher.pro/login", changeFrequency: "monthly", priority: 1 }]
}
