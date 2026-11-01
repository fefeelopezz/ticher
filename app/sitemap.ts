import type { MetadataRoute } from "next"

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: "https://www.ticher.pro/", changeFrequency: "monthly", priority: 1 },
    { url: "https://www.ticher.pro/login", changeFrequency: "yearly", priority: 0.5 },
    { url: "https://www.ticher.pro/terminos", changeFrequency: "yearly", priority: 0.3 },
    { url: "https://www.ticher.pro/privacidad", changeFrequency: "yearly", priority: 0.3 },
  ]
}
