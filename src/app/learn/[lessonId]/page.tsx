import { notFound } from "next/navigation";
import { getLessonById, lessons } from "@/data/curriculum";
import { LessonClient } from "./lesson-client";
import { pageMetadata } from "@/lib/site-metadata";

export async function generateMetadata({ params }: { params: Promise<{ lessonId: string }> }) {
  const { lessonId } = await params;
  const lesson = getLessonById(lessonId);
  if (!lesson) notFound();
  return pageMetadata(`/learn/${lesson.id}`, `第 ${lesson.order} 课 · ${lesson.title}`, lesson.subtitle || `学习${lesson.title}，通过练习、复习与情境运用巩固韩语。`);
}

export function generateStaticParams() {
  return lessons.map((lesson: any) => ({ lessonId: lesson.id }));
}

export default async function LessonPage({ params }: { params: Promise<{ lessonId: string }> }) {
  const { lessonId } = await params;
  const lesson = getLessonById(lessonId);
  if (!lesson) notFound();

  return <LessonClient key={lesson.id} lesson={lesson} />;
}
