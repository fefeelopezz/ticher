import type { MetadataRoute } from "next"

// Only the login page is public; everything else needs a session, so crawlers stay out of it.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/login", disallow: ["/api/", "/exams", "/activity", "/calendar", "/settings"] },
    sitemap: "https://www.ticher.pro/sitemap.xml",
  }
}
