import { pageMetadata, sitePages } from "@/lib/site-metadata";

export const metadata = pageMetadata("/grammar", ...sitePages["/grammar"]);

export default function ModuleLayout({ children }: { children: React.ReactNode }) { return children; }
