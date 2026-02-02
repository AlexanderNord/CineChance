// Тест для проверки параметров API
console.log('=== ТЕСТ ПАРАМЕТРОВ API ===');

// Проверяем правильность параметров для разных вкладок
const tabs = {
  watched: {
    statusName: ['Просмотрено', 'Пересмотрено'],
    includeHidden: false,
    description: 'Просмотрено + Пересмотрено'
  },
  wantToWatch: {
    statusName: 'Хочу посмотреть',
    includeHidden: false,
    description: 'Хочу посмотреть'
  },
  dropped: {
    statusName: 'Брошено',
    includeHidden: false,
    description: 'Брошено'
  },
  hidden: {
    statusName: null,
    includeHidden: true,
    description: 'Скрытые (blacklist)'
  }
};

Object.entries(tabs).forEach(([tab, config]) => {
  console.log(`\n--- Вкладка: ${tab} (${config.description}) ---`);
  console.log('statusName:', config.statusName);
  console.log('includeHidden:', config.includeHidden);
  
  if (config.statusName) {
    const params = new URLSearchParams();
    if (Array.isArray(config.statusName)) {
      params.set('statusName', config.statusName.join(','));
    } else {
      params.set('statusName', config.statusName);
    }
    if (config.includeHidden) {
      params.set('includeHidden', 'true');
    }
    params.set('page', '1');
    params.set('limit', '20');
    
    console.log('Query params:', params.toString());
    console.log('Full URL:', `/api/my-movies?${params.toString()}`);
  } else {
    const params = new URLSearchParams();
    params.set('includeHidden', 'true');
    params.set('page', '1');
    params.set('limit', '20');
    console.log('Query params:', params.toString());
    console.log('Full URL:', `/api/my-movies?${params.toString()}`);
  }
});

console.log('\n=== ОЖИДАЕМЫЕ ЛОГИ В КОНСОЛИ СЕРВЕРА ===');
console.log('1. При заходе в профиль:');
console.log('   - "=== СТАТИСТИКА ПОЛЬЗОВАТЕЛЯ ==="');
console.log('   - "Dropped count: X" (где X > 0)');
console.log('\n2. При заходе в "Мои фильмы" → "Брошено":');
console.log('   - "=== API MY-MOVIES DEBUG ==="');
console.log('   - "Status name param: Брошено"');
console.log('   - "Status names: [\'Брошено\']"');
console.log('   - "Status IDs: [4]"');
console.log('   - "Total count for where clause: X" (где X > 0)');
console.log('\n3. При загрузке страницы "Мои фильмы":');
console.log('   - "=== GET MOVIES COUNTS DEBUG ==="');
console.log('   - "Counts result: { ..., dropped: X, ...}" (где X > 0)');
