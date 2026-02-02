// Debug endpoint для проверки статистики
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';
import { prisma } from '@/lib/prisma';
import { MOVIE_STATUS_IDS, getStatusIdByName, getStatusNameById } from '@/lib/movieStatusConstants';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    
    // Собираем всю отладочную информацию
    const debugInfo = {
      userId,
      statusConstants: {
        MOVIE_STATUS_IDS,
        MOVIE_STATUS_NAMES: {
          [MOVIE_STATUS_IDS.WANT_TO_WATCH]: 'Хочу посмотреть',
          [MOVIE_STATUS_IDS.WATCHED]: 'Просмотрено',
          [MOVIE_STATUS_IDS.REWATCHED]: 'Пересмотрено',
          [MOVIE_STATUS_IDS.DROPPED]: 'Брошено',
        }
      },
      statusTests: {
        'Брошено': getStatusIdByName('Брошено'),
        'Хочу посмотреть': getStatusIdByName('Хочу посмотреть'),
        'Просмотрено': getStatusIdByName('Просмотрено'),
        'Пересмотрено': getStatusIdByName('Пересмотрено'),
      },
      databaseCounts: {},
      sampleRecords: []
    };

    // Считаем количество записей по каждому статусу
    const counts = await Promise.all([
      prisma.watchList.count({ where: { userId, statusId: MOVIE_STATUS_IDS.WANT_TO_WATCH } }),
      prisma.watchList.count({ where: { userId, statusId: MOVIE_STATUS_IDS.WATCHED } }),
      prisma.watchList.count({ where: { userId, statusId: MOVIE_STATUS_IDS.REWATCHED } }),
      prisma.watchList.count({ where: { userId, statusId: MOVIE_STATUS_IDS.DROPPED } }),
    ]);

    debugInfo.databaseCounts = {
      wantToWatch: counts[0],
      watched: counts[1],
      rewatched: counts[2],
      dropped: counts[3],
      totalWatched: counts[1] + counts[2], // watched + rewatched
    };

    // Получаем несколько записей со статусом DROPPED для примера
    const droppedRecords = await prisma.watchList.findMany({
      where: { 
        userId, 
        statusId: MOVIE_STATUS_IDS.DROPPED 
      },
      select: {
        id: true,
        tmdbId: true,
        mediaType: true,
        title: true,
        statusId: true,
        addedAt: true,
        userRating: true,
      },
      take: 5, // максимум 5 записей для примера
      orderBy: { addedAt: 'desc' }
    });

    debugInfo.sampleRecords = droppedRecords.map(record => ({
      ...record,
      statusName: getStatusNameById(record.statusId),
      addedAt: record.addedAt.toISOString(),
    }));

    return NextResponse.json(debugInfo);

  } catch (error) {
    console.error('Debug endpoint error:', error);
    return NextResponse.json(
      { error: 'Debug endpoint failed', details: error.message }, 
      { status: 500 }
    );
  }
}
