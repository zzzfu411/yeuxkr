import type { MetadataRoute } from "next";
import { lessons } from "@/data/curriculum-runtime";
import { getSiteOrigin, privateRoutes, sitePages } from "@/lib/site-metadata";

export default function sitemap(): MetadataRoute.Sitemap {
  const origin = getSiteOrigin();
  if (!origin) return [];
  const paths = [...Object.keys(sitePages).filter(path => !privateRoutes.has(path)), ...lessons.map(lesson => `/learn/${lesson.id}`)];
  return paths.map(path => ({ url: new URL(path, origin).href }));
}
