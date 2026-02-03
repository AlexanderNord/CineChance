import { prisma } from '@/lib/prisma';
import { calculateWeightedRating } from '@/lib/calculateWeightedRating';

/**
 * Фоновый скрипт для массового пересчета взвешенных оценок
 * Используется для обновления существующих записей после внедрения новой системы
 */
async function updateWeightedRatings() {
  console.log('🚀 Начинаем массовое обновление взвешенных оценок...');
  
  try {
    // Получаем все записи с оценками
    const recordsToUpdate = await prisma.watchList.findMany({
      where: {
        userRating: { not: null },
      },
      select: {
        id: true,
        userId: true,
        tmdbId: true,
        mediaType: true,
        userRating: true,
        weightedRating: true,
      },
    });

    console.log(`📊 Найдено ${recordsToUpdate.length} записей для обновления`);

    let updatedCount = 0;
    let errorCount = 0;
    const errors: string[] = [];

    // Обрабатываем записи пачками по 50
    const batchSize = 50;
    for (let i = 0; i < recordsToUpdate.length; i += batchSize) {
      const batch = recordsToUpdate.slice(i, i + batchSize);
      
      console.log(`⚡ Обработка пакета ${Math.floor(i / batchSize) + 1}/${Math.ceil(recordsToUpdate.length / batchSize)} (${batch.length} записей)`);
      
      for (const record of batch) {
        try {
          // Расчитываем взвешенную оценку
          const result = await calculateWeightedRating(
            record.userId,
            record.tmdbId,
            record.mediaType
          );

          if (result.weightedRating !== null) {
            // Обновляем запись
            await prisma.watchList.update({
              where: { id: record.id },
              data: { weightedRating: result.weightedRating },
            });
            
            updatedCount++;
            
            // Показываем прогресс каждые 10 обновлений
            if (updatedCount % 10 === 0) {
              console.log(`✅ Обновлено: ${updatedCount}/${recordsToUpdate.length}`);
            }
          }
        } catch (error) {
          errorCount++;
          const errorMsg = `Ошибка при обновлении записи ${record.id}: ${error instanceof Error ? error.message : 'Unknown error'}`;
          errors.push(errorMsg);
          console.error(`❌ ${errorMsg}`);
        }
      }
      
      // Небольшая задержка между пачками для снижения нагрузки
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log('\n📈 Результаты:');
    console.log(`✅ Успешно обновлено: ${updatedCount} записей`);
    console.log(`❌ Ошибок: ${errorCount} записей`);
    
    if (errors.length > 0) {
      console.log('\n🔍 Первые 10 ошибок:');
      errors.slice(0, 10).forEach(error => console.log(`  - ${error}`));
    }

    // Статистика по результатам
    const finalStats = await prisma.watchList.aggregate({
      where: { userRating: { not: null } },
      _count: {
        userRating: true,
        weightedRating: true,
      },
    });

    console.log('\n📊 Финальная статистика:');
    console.log(`  Всего записей с оценками: ${finalStats._count.userRating}`);
    console.log(`  Записей со взвешенными оценками: ${finalStats._count.weightedRating}`);
    console.log(`  Покрытие: ${Math.round((finalStats._count.weightedRating / finalStats._count.userRating) * 100)}%`);

  } catch (error) {
    console.error('💥 Критическая ошибка при выполнении скрипта:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Запуск скрипта
if (require.main === module) {
  updateWeightedRatings()
    .then(() => {
      console.log('🎉 Скрипт завершен успешно!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Скрипт завершился с ошибкой:', error);
      process.exit(1);
    });
}

export { updateWeightedRatings };
