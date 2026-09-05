import { pageMetadata, sitePages } from "@/lib/site-metadata";

export const metadata = pageMetadata("/mistakes", ...sitePages["/mistakes"]);

export default function ModuleLayout({ children }: { children: React.ReactNode }) { return children; }
