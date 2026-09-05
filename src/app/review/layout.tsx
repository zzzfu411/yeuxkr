import { pageMetadata, sitePages } from "@/lib/site-metadata";

export const metadata = pageMetadata("/review", ...sitePages["/review"]);

export default function ModuleLayout({ children }: { children: React.ReactNode }) { return children; }
