import { pageMetadata, sitePages } from "@/lib/site-metadata";

export const metadata = pageMetadata("/onboarding", ...sitePages["/onboarding"]);

export default function ModuleLayout({ children }: { children: React.ReactNode }) { return children; }
