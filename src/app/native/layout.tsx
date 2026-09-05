import { pageMetadata, sitePages } from "@/lib/site-metadata";

export const metadata = pageMetadata("/native", ...sitePages["/native"]);

export default function ModuleLayout({ children }: { children: React.ReactNode }) { return children; }
