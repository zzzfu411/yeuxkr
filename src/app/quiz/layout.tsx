import { pageMetadata, sitePages } from "@/lib/site-metadata";

export const metadata = pageMetadata("/quiz", ...sitePages["/quiz"]);

export default function ModuleLayout({ children }: { children: React.ReactNode }) { return children; }
