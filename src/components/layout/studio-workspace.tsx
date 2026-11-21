"use client";

import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { EmbeddedPage } from "@/components/layout/embedded-page";
import { StudioNavigation } from "@/components/layout/studio-navigation";
import { resolvePracticeView, resolveStudyView, type Studio } from "@/lib/studio-navigation";
import { stopSpeech } from "@/lib/speech";

const loading = () => <p className="studio-loading" role="status">正在打开学习内容…</p>;
const pages = {
  courses: dynamic(() => import("@/app/path/page"), { loading }),
  hangul: dynamic(() => import("@/app/hangul/page"), { loading }),
  vocabulary: dynamic(() => import("@/app/vocabulary/page"), { loading }),
  grammar: dynamic(() => import("@/app/grammar/page"), { loading }),
  listening: dynamic(() => import("@/app/immersion/page"), { loading }),
  expression: dynamic(() => import("@/app/native/page"), { loading }),
  review: dynamic(() => import("@/app/review/page"), { loading }),
  mistakes: dynamic(() => import("@/app/mistakes/page"), { loading }),
  quiz: dynamic(() => import("@/app/quiz/page"), { loading })
};

export function StudioWorkspace({ studio }: { studio: Studio }) {
  const searchParams = useSearchParams();
  const view = studio === "study" ? resolveStudyView(searchParams.get("view")) : resolvePracticeView(searchParams.get("view"));
  const Content = pages[view];
  useEffect(() => () => { stopSpeech(); }, [view]);

  return <>
    <StudioNavigation studio={studio} view={view} />
    <div className="studio-content" key={view}>
      <EmbeddedPage><Content /></EmbeddedPage>
    </div>
  </>;
}
