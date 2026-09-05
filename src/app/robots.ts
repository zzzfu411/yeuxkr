import type { MetadataRoute } from "next";
import { getSiteOrigin } from "@/lib/site-metadata";

export default function robots(): MetadataRoute.Robots {
  const origin = getSiteOrigin();
  return { rules: { userAgent: "*", allow: "/" }, ...(origin ? { sitemap: new URL("/sitemap.xml", origin).href } : {}) };
}
