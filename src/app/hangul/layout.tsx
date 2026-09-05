import { pageMetadata, sitePages } from "@/lib/site-metadata";

export const metadata = pageMetadata("/hangul", ...sitePages["/hangul"]);

export default function ModuleLayout({ children }: { children: React.ReactNode }) { return children; }
