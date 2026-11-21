import { Suspense } from "react";
import { StudioWorkspace } from "@/components/layout/studio-workspace";
import { StudioIntro } from "@/components/layout/studio-intro";

export default function PracticePage() {
  return <div className="studio-workspace"><StudioIntro studio="practice" /><Suspense fallback={<p role="status">正在打开练习空间…</p>}><StudioWorkspace studio="practice" /></Suspense></div>;
}
