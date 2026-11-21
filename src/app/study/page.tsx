import { Suspense } from "react";
import { StudioWorkspace } from "@/components/layout/studio-workspace";
import { StudioIntro } from "@/components/layout/studio-intro";

export default function StudyPage() {
  return <div className="studio-workspace"><StudioIntro studio="study" /><Suspense fallback={<p role="status">正在打开学习空间…</p>}><StudioWorkspace studio="study" /></Suspense></div>;
}
