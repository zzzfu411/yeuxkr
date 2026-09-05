import { pageMetadata, sitePages } from "@/lib/site-metadata";

export const metadata = pageMetadata("/vocabulary", ...sitePages["/vocabulary"]);

export default function ModuleLayout({ children }: { children: React.ReactNode }) { return children; }
