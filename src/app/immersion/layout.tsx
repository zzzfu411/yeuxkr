import { pageMetadata, sitePages } from "@/lib/site-metadata";

export const metadata = pageMetadata("/immersion", ...sitePages["/immersion"]);

export default function ModuleLayout({ children }: { children: React.ReactNode }) { return children; }
