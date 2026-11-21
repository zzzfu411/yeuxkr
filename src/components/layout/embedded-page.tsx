"use client";

import { createContext, useContext } from "react";

const EmbeddedPageContext = createContext(false);

export function EmbeddedPage({ children }: { children: React.ReactNode }) {
  return <EmbeddedPageContext.Provider value>{children}</EmbeddedPageContext.Provider>;
}

export function useEmbeddedPage() {
  return useContext(EmbeddedPageContext);
}
