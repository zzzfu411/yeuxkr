import { pageMetadata, sitePages } from "@/lib/site-metadata";

export const metadata = pageMetadata("/self-study", ...sitePages["/self-study"]);

export default function ModuleLayout({ children }: { children: React.ReactNode }) { return children; }
