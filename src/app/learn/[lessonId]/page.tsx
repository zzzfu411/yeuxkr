import { notFound } from "next/navigation";
import { getLessonById, lessons } from "@/data/curriculum";
import { LessonClient } from "./lesson-client";

export function generateStaticParams() {
  return lessons.map((lesson: any) => ({ lessonId: lesson.id }));
}

export default async function LessonPage({ params }: { params: Promise<{ lessonId: string }> }) {
  const { lessonId } = await params;
  const lesson = getLessonById(lessonId);
  if (!lesson) notFound();

  return <LessonClient lesson={lesson} />;
}
