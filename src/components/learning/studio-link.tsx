import NextLink from "next/link";
import type { ComponentProps } from "react";
import { studioHref } from "@/lib/studio-navigation";

/** Preserve Next's ref, prefetch and URL-object behavior; normalize local string links. */
export default function StudioLink({ href, ...props }: ComponentProps<typeof NextLink>) {
  return <NextLink {...props} href={typeof href === "string" ? studioHref(href) : href} />;
}
