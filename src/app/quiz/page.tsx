"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Radio, RefreshCcw } from "lucide-react";
import { DrillRunner } from "@/components/learning/drill-runner";
import { LearningCompass } from "@/components/learning/learning-compass";
import { Button } from "@/components/ui/button";
import { ModuleHero, PageHeader, Surface } from "@/components/ui/section";
import { buildProgressQuiz } from "@/lib/learning/quiz";
import { commitQuizSession, useLearningWorkspace } from "@/lib/learning/workspace";

export default function QuizPage() {
  const { workspace, outputEntries, srsState } = useLearningWorkspace();
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
      setSaveError("测验结果没有写入本地进度，请释放浏览器存储空间后重试。");
      return false;
    }
    setSavedQuizId(quizId);
    setSaveError("");
    return true;
  }, [quizId, savedQuizId]);

  return (
    <div className="grid gap-6">
      <PageHeader
        kicker="Mixed Quiz"
        title="已学内容迁移测验。"
        copy="题目默认只从已经学过或加入过的韩文、发音、词汇、语法、真实材料和输出改写里抽取。答错会进入错题 SRS，低分只说明下一轮复习该照顾哪里。"
        compact
      >
        {questions.length ? (
          <Button type="button" variant="secondary" onClick={nextQuiz}>
            换一组
          </Button>
        ) : null}
      </PageHeader>

      <Surface>
        <DrillRunner
          key={seed}
          questions={questions}
          recordMistakes={false}
          finishLabel="再来一组"
          emptyState={{
            title: "还没有可迁移的题目。",
            detail: "测验只抽已经有证据的内容：完成过的课、到期复习卡、真实材料听写复述，以及绑定过的韩语输出。先补一段证据，题目会自然出现。",
            action: (
              <>
                <Button asChild>
                  <Link href="/path">
                    <ArrowRight className="h-4 w-4" />
                    继续路径
                  </Link>
                </Button>
                <Button asChild variant="secondary">
                  <Link href="/review">
                    <RefreshCcw className="h-4 w-4" />
                    先清复习
                  </Link>
                </Button>
                <Button asChild variant="secondary">
                  <Link href="/immersion">
                    <Radio className="h-4 w-4" />
                    积累材料
                  </Link>
                </Button>
              </>
            )
          }}
          resultAddon={({ score, answers }) => (
            <div className="grid gap-3">
              {saveError ? (
                <p className="rounded-[8px] border border-[rgba(185,78,60,0.45)] bg-[rgba(185,78,60,0.08)] p-3 text-sm font-bold leading-6 text-[var(--cinnabar)]">
                  {saveError}
                </p>
              ) : savedQuizId === quizId ? (
                <p className="rounded-[8px] border border-[rgba(79,140,118,0.42)] bg-[rgba(79,140,118,0.1)] p-3 text-sm font-bold leading-6 text-[var(--celadon)]">
                  测验结果已写入进度。
                </p>
              ) : null}
              <Button type="button" onClick={() => {
                if (saveError && savedQuizId !== quizId) {
                  saveQuizResult(score, answers);
                  return;
                }
                nextQuiz();
              }}>
                {saveError && savedQuizId !== quizId ? "重试保存" : "再来一组"}
              </Button>
            </div>
          )}
          onResult={saveQuizResult}
          onFinish={() => nextQuiz()}
        />
      </Surface>

      <ModuleHero
        kicker="Transfer Check"
        title="把已学知识拉到同一张桌上。"
        copy="这组题不按模块排队，重点检查你能不能在声音、拼写、词义、句型和自己的真实输出之间快速切换。低分不是失败，而是告诉 SRS 下一轮该优先照顾哪里。"
        asset="quiz"
        imageSize="22rem"
        imageClassName="min-h-64 rounded-none border-0"
      />

      <LearningCompass workspace={workspace} active="quiz" condensed />
    </div>
  );
}
