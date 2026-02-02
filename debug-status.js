// Временный файл для отладки статусов
const { getStatusIdByName, getStatusNameById, MOVIE_STATUS_IDS, MOVIE_STATUS_NAMES } = require('./src/lib/movieStatusConstants.ts');

console.log('=== ОТЛАДКА СТАТУСОВ ===');
console.log('MOVIE_STATUS_IDS:', MOVIE_STATUS_IDS);
console.log('MOVIE_STATUS_NAMES:', MOVIE_STATUS_NAMES);

// Проверяем получение ID по имени
console.log('\n=== ПРОВЕРКА ПОЛУЧЕНИЯ ID ПО ИМЕНИ ===');
const testStatuses = ['Хочу посмотреть', 'Просмотрено', 'Пересмотрено', 'Брошено'];
testStatuses.forEach(statusName => {
  const id = getStatusIdByName(statusName);
  console.log(`"${statusName}" -> ID: ${id}`);
});

// Проверяем получение имени по ID
console.log('\n=== ПРОВЕРКА ПОЛУЧЕНИЯ ИМЕНИ ПО ID ===');
Object.values(MOVIE_STATUS_IDS).forEach(id => {
  const name = getStatusNameById(id);
  console.log(`ID: ${id} -> "${name}"`);
});

// Проверяем прямое обращение
console.log('\n=== ПРЯМОЕ ОБРАЩЕНИЕ К КОНСТАНТАМ ===');
console.log('DROPPED ID:', MOVIE_STATUS_IDS.DROPPED);
console.log('DROPPED Name:', MOVIE_STATUS_NAMES[MOVIE_STATUS_IDS.DROPPED]);
