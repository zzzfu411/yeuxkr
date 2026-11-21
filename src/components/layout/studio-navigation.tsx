import Link from "@/components/learning/studio-link";
import type { PracticeView, Studio, StudyView } from "@/lib/studio-navigation";
import { cn } from "@/lib/utils";

const wordViews = ["hangul", "vocabulary", "grammar"];
const soundViews = ["listening", "expression"];

export function StudioNavigation({ studio, view }: { studio: Studio; view: StudyView | PracticeView }) {
  const words = wordViews.includes(view);
  const sounds = soundViews.includes(view);
  const tabs = studio === "study" ? [
    { view: "courses", label: "课程", active: view === "courses" },
    { view: words ? view : "vocabulary", label: "字词", active: words },
    { view: sounds ? view : "listening", label: "听说", active: sounds }
  ] : [
    { view: "review", label: "复习", active: view === "review" },
    { view: "mistakes", label: "错题", active: view === "mistakes" },
    { view: "quiz", label: "测验", active: view === "quiz" }
  ];
  const subTabs = studio === "study" && words
    ? [{ view: "hangul", label: "韩文" }, { view: "vocabulary", label: "词汇" }, { view: "grammar", label: "语法" }]
    : studio === "study" && sounds ? [{ view: "listening", label: "听读" }, { view: "expression", label: "表达" }] : [];

  return <div className="studio-navigation">
    <nav className="studio-tabs" aria-label={studio === "study" ? "学习栏目" : "练习栏目"}>
      {tabs.map((tab) => <Link key={tab.label} href={`/${studio}?view=${tab.view}`} scroll={false} aria-current={tab.active ? "page" : undefined} className={cn("focus-ring", tab.active && "is-active")}>{tab.label}</Link>)}
    </nav>
    {subTabs.length ? <nav className="studio-subtabs" aria-label={words ? "字词内容" : "听说内容"}>
      {subTabs.map((tab) => <Link key={tab.view} href={`/${studio}?view=${tab.view}`} scroll={false} aria-current={tab.view === view ? "page" : undefined} className={cn("focus-ring", tab.view === view && "is-active")}>{tab.label}</Link>)}
    </nav> : null}
  </div>;
}
