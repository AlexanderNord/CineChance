#!/usr/bin/env node
// Скрипт проверки конфигурации загрузки постеров
// Запустите: node scripts/check-poster-config.js

const fs = require('fs');
const path = require('path');

console.log('=== Проверка конфигурации загрузки постеров ===\n');

// 1. Проверка .env файла
console.log('1. Проверка .env файла:');
const envPath = path.join(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  const hasFanartKey = envContent.includes('FANART_TV_API_KEY=');
  const fanartKeyValue = envContent.match(/FANART_TV_API_KEY=(.+)/)?.[1]?.trim();
  
  if (hasFanartKey && fanartKeyValue && fanartKeyValue.length > 0) {
    console.log('   ✅ FANART_TV_API_KEY установлен');
  } else {
    console.log('   ❌ FANART_TV_API_KEY НЕ УСТАНОВЛЕН или пустой');
    console.log('   📝 Решение: Добавьте FANART_TV_API_KEY=ваш_ключ в .env файл');
    console.log('   📝 Получить ключ: https://fanart.tv/');
  }
} else {
  console.log('   ❌ Файл .env НЕ СУЩЕСТВУЕТ');
  console.log('   📝 Решение: Создайте файл .env с необходимыми переменными');
}

// 2. Проверка placeholder файла
console.log('\n2. Проверка файла заглушки:');
const placeholderPath = path.join(process.cwd(), 'public', 'placeholder-poster.svg');
if (fs.existsSync(placeholderPath)) {
  console.log('   ✅ placeholder-poster.svg существует');
} else {
  console.log('   ❌ placeholder-poster.svg НЕ НАЙДЕН');
}

// 3. Проверка конфигурации Next.js
console.log('\n3. Проверка next.config.ts:');
const nextConfigPath = path.join(process.cwd(), 'next.config.ts');
if (fs.existsSync(nextConfigPath)) {
  const configContent = fs.readFileSync(nextConfigPath, 'utf-8');
  const hasTmdb = configContent.includes('image.tmdb.org');
  const hasFanart = configContent.includes('assets.fanart.tv');
  
  console.log(`   ${hasTmdb ? '✅' : '❌'} image.tmdb.org в remotePatterns`);
  console.log(`   ${hasFanart ? '✅' : '❌'} assets.fanart.tv в remotePatterns`);
} else {
  console.log('   ❌ next.config.ts не найден');
}

// 4. Проверка MoviePoster компонента
console.log('\n4. Проверка MoviePoster компонента:');
const moviePosterPath = path.join(process.cwd(), 'src/app/components/MoviePoster.tsx');
if (fs.existsSync(moviePosterPath)) {
  const posterContent = fs.readFileSync(moviePosterPath, 'utf-8');
  const hasFanartApi = posterContent.includes('/api/fanart-poster');
  const hasFallback = posterContent.includes('fanartPoster');
  console.log(`   ${hasFanartApi ? '✅' : '❌'} Есть запрос к /api/fanart-poster`);
  console.log(`   ${hasFallback ? '✅' : '❌'} Есть fallback логика`);
} else {
  console.log('   ❌ MoviePoster.tsx не найден');
}

console.log('\n=== Рекомендации ===');
console.log('1. Без FANART_TV_API_KEY fallback на Fanart.tv работать НЕ БУДЕТ');
console.log('2. Если TMDB изображения не загружаются — проверьте:');
console.log('   - Интернет-соединение');
console.log('   - CORS политику браузера (DevTools → Network)');
console.log('   - Доступность https://image.tmdb.org напрямую');
console.log('3. Для тестирования откройте DevTools → Network и обновите страницу');
