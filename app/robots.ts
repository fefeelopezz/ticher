import type { MetadataRoute } from "next"

// Only the landing ("/" without a session) and the login page are public; the rest needs a session.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: ["/", "/login"], disallow: ["/api/", "/exams", "/activity", "/calendar", "/settings", "/welcome"] },
    sitemap: "https://www.ticher.pro/sitemap.xml",
  }
}
