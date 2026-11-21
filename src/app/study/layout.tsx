import { pageMetadata, sitePages } from "@/lib/site-metadata";

export const metadata = pageMetadata("/study", ...sitePages["/study"]);
export default function StudyLayout({ children }: { children: React.ReactNode }) { return children; }
