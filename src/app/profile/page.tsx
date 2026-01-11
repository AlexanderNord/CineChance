// src/app/profile/page.tsx - Overview page
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import ProfileOverviewClient from './components/ProfileOverviewClient';

export default async function ProfilePage() {
  const session = await getServerSession(authOptions);

  if (!session || !session.user) {
    redirect('/');
  }

  const userId = session.user.id;

  // Получаем данные пользователя, включая дату рождения
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { 
      id: true,
      name: true,
      email: true,
      birthDate: true,
      createdAt: true,
    },
  });

  if (!user) {
    redirect('/');
  }

  // Получаем статистику пользователя
  const watchListCount = await prisma.watchList.count({
    where: { userId },
  });

  const blacklistCount = await prisma.blacklist.count({
    where: { userId },
  });

  return (
    <ProfileOverviewClient 
      initialUserData={{
        id: user.id,
        name: user.name,
        email: user.email,
        birthDate: user.birthDate,
        createdAt: user.createdAt,
      }}
      watchListCount={watchListCount}
      blacklistCount={blacklistCount}
    />
  );
}
