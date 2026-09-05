import { pageMetadata, sitePages } from "@/lib/site-metadata";

export const metadata = pageMetadata("/path", ...sitePages["/path"]);

export default function ModuleLayout({ children }: { children: React.ReactNode }) { return children; }
