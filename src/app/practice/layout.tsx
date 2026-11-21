import { pageMetadata, sitePages } from "@/lib/site-metadata";

export const metadata = pageMetadata("/practice", ...sitePages["/practice"]);
export default function PracticeLayout({ children }: { children: React.ReactNode }) { return children; }
