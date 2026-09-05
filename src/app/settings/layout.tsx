import { pageMetadata, sitePages } from "@/lib/site-metadata";

export const metadata = pageMetadata("/settings", ...sitePages["/settings"]);

export default function ModuleLayout({ children }: { children: React.ReactNode }) { return children; }
