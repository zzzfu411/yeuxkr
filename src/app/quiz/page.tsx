"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Radio, RefreshCcw } from "lucide-react";
import { DrillRunner } from "@/components/learning/drill-runner";
import { LearningCompass } from "@/components/learning/learning-compass";
import { LibraryGateNotice } from "@/components/learning/library-gate-notice";
import { Button } from "@/components/ui/button";
import { ModuleHero, PageHeader, Surface } from "@/components/ui/section";
import { buildProgressQuiz } from "@/lib/learning/quiz";
import { needsOnboardingFunnel } from "@/lib/learning/compass";
import { commitQuizSession, useLearningWorkspace } from "@/lib/learning/workspace";

export default function QuizPage() {
  const { workspace, srs, outputEntries, srsState } = useLearningWorkspace();
  const funnel = needsOnboardingFunnel(workspace.profile, workspace.progress);
  const nextTask = workspace.recommended.find((task) => task.id !== "quiz:mixed" && !String(task.href).startsWith("/quiz"));
  const followUp = funnel
    ? { href: "/onboarding", label: "先去入门" }
    : srs.due > 0
      ? { href: "/review", label: "先清到期复习" }
      : nextTask
        ? { href: nextTask.href, label: nextTask.title }
        : { href: "/path", label: "继续路径" };
  const [seed, setSeed] = useState(1);
  const [saveError, setSaveError] = useState("");
  const [savedQuizId, setSavedQuizId] = useState("");
  const questions = useMemo(() => buildProgressQuiz(workspace.progress, 10, seed, outputEntries, srsState), [workspace.progress, seed, outputEntries, srsState]);
  const quizId = `mixed:${seed}`;
  const nextQuiz = () => {
    setSaveError("");
    setSavedQuizId("");
    setSeed((value) => value + 1);
  };
  const saveQuizResult = useCallback((score: number, answers: Parameters<typeof commitQuizSession>[1]) => {
    if (savedQuizId === quizId) return true;
    if (!commitQuizSession(quizId, answers, score)) {
      setSaveError("测验结果没有保存。请释放浏览器空间后重试。");
      return false;
    }
    setSavedQuizId(quizId);
    setSaveError("");
    return true;
  }, [quizId, savedQuizId]);

  return (
    <div className="grid gap-6">
      <PageHeader
        kicker="섞어서 풀기 · 综合测验"
        title="综合测验：只考你学过的内容。"
        copy="题目来自课程、韩文、词汇、语法、情境听读和你保存过的改写。答错会加入错题复习，方便之后重练。"
        compact
      >
        {questions.length ? (
          <Button type="button" variant="secondary" onClick={nextQuiz}>
            换一组
          </Button>
        ) : null}
      </PageHeader>

      <LibraryGateNotice />

      <Surface>
        <DrillRunner
          key={seed}
          questions={questions}
          recordMistakes={false}
          finishLabel="查看结果"
          emptyState={{
            title: "还没有可出的题目。",
            detail: "先完成一课、加入几个词，或保存一段听写和复述。学过的内容会自动出现在这里。",
            action: (
              <>
                <Button asChild>
                  <Link href={followUp.href}>
                    <ArrowRight className="h-4 w-4" />
                    {followUp.label}
                  </Link>
                </Button>
                {funnel ? null : (
                  <>
                    {srs.due > 0 && followUp.href !== "/review" ? (
                      <Button asChild variant="secondary">
                        <Link href="/review">
                          <RefreshCcw className="h-4 w-4" />
                          先清复习
                        </Link>
                      </Button>
                    ) : null}
                    <Button asChild variant="secondary">
                      <Link href="/immersion">
                        <Radio className="h-4 w-4" />
                        去做听读
                      </Link>
                    </Button>
                  </>
                )}
              </>
            )
          }}
          resultAddon={({ score, answers, finish }) => (
            <div className="grid gap-3">
              {saveError ? (
                <p className="rounded-none border border-[var(--seal)] bg-[var(--seal-soft)] p-3 text-sm font-bold leading-6 text-[var(--cinnabar)]">
                  {saveError}
                </p>
              ) : savedQuizId === quizId ? (
                <p className="rounded-none border border-[var(--green)] bg-[var(--green-soft)] p-3 text-sm font-bold leading-6 text-[var(--celadon)]">
                  测验结果已保存。
                </p>
              ) : null}
              <div className="flex flex-wrap gap-2">
                {saveError && savedQuizId !== quizId ? (
                  <Button type="button" onClick={() => saveQuizResult(score, answers)}>
                    重试保存
                  </Button>
                ) : (
                  <Button asChild>
                    <Link href={followUp.href}>
                      {followUp.label}
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                )}
                <Button type="button" variant="secondary" onClick={finish}>
                  再来一组
                </Button>
              </div>
            </div>
          )}
          onResult={saveQuizResult}
          onFinish={() => nextQuiz()}
        />
      </Surface>

      <ModuleHero
        kicker="바꿔서 풀기 · 换题检查"
        title="换个题型，看看还能不能答对。"
        copy="题目会混合声音、拼写、词义和句型。分数不理想时，错题会进入复习，告诉你下一轮先补哪里。"
        asset="quiz"
        imageSize="22rem"
        imageClassName="min-h-64 rounded-none border-0"
      />

      <LearningCompass workspace={workspace} active="quiz" condensed />
    </div>
  );
}
