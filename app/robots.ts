import type { MetadataRoute } from "next"

// Only the landing ("/" without a session), login and legal pages are public; the rest needs a session.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: ["/", "/login", "/terminos", "/privacidad"], disallow: ["/api/", "/exams", "/activity", "/calendar", "/settings", "/welcome", "/admin"] },
    sitemap: "https://www.ticher.pro/sitemap.xml",
  }
}
