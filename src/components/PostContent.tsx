'use client';

/**
 * ОТРИСОВКА ТЕКСТА ПОСТА
 * ------------------------------------------------------------------
 * Текст показывается как есть, но хэштеги превращаются в ссылки на поиск.
 *
 * Важно: мы НЕ используем dangerouslySetInnerHTML. Текст разбивается
 * на части и вставляется как React-узлы, поэтому вставить в пост
 * <script> или чужую разметку невозможно — React экранирует текст сам.
 */

import Link from 'next/link';
import { Fragment } from 'react';

const HASHTAG_RE = /(#[\p{L}\p{N}_]{2,30})/gu;

export function PostContent({ content }: { content: string }) {
  return (
    <p className="whitespace-pre-wrap break-words text-[15px] leading-relaxed text-slate-800 dark:text-slate-200">
      {content.split(HASHTAG_RE).map((part, index) => {
        if (part.startsWith('#')) {
          const tag = part.slice(1).toLowerCase();
          return (
            <Link
              key={index}
              href={`/?query=${encodeURIComponent(tag)}`}
              className="font-medium text-violet-600 hover:underline dark:text-violet-400"
            >
              {part}
            </Link>
          );
        }
        return <Fragment key={index}>{part}</Fragment>;
      })}
    </p>
  );
}
