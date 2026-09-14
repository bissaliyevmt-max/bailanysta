/**
 * СТРАНИЦА ПРОФИЛЯ  (уровень 1 ТЗ: «страница профиля, где он может создавать посты»)
 * ------------------------------------------------------------------
 * Серверный компонент разбирает адрес и отдаёт имя пользователя
 * клиентскому компоненту, который грузит данные через API.
 */

import type { Metadata } from 'next';
import { ProfileView } from '@/components/ProfileView';

type Props = { params: Promise<{ username: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username } = await params;
  return { title: `@${username} — Bailanysta` };
}

export default async function ProfilePage({ params }: Props) {
  const { username } = await params;
  return <ProfileView username={username} />;
}
