// Тестирование API статистики
const fetch = require('node-fetch');

async function testStatsAPI() {
  try {
    console.log('=== ТЕСТИРОВАНИЕ API СТАТИСТИКИ ===');
    
    // Сначала нужно получить сессию или использовать cookie
    // Для простоты попробуем прямой запрос
    const response = await fetch('http://localhost:3000/api/user/stats', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    });
    
    console.log('Status:', response.status);
    console.log('Status Text:', response.statusText);
    
    const text = await response.text();
    console.log('Response:', text);
    
    if (response.ok) {
      const data = JSON.parse(text);
      console.log('\n=== АНАЛИЗ СТАТИСТИКИ ===');
      console.log('Всего просмотрено:', data.total?.watched || 0);
      console.log('Хочу посмотреть:', data.total?.wantToWatch || 0);
      console.log('Брошено:', data.total?.dropped || 0);
      console.log('Скрыто:', data.total?.hidden || 0);
      console.log('totalForPercentage:', data.total?.totalForPercentage || 0);
      
      console.log('\n=== ТИПЫ КОНТЕНТА ===');
      console.log('Фильмы:', data.typeBreakdown?.movie || 0);
      console.log('Сериалы:', data.typeBreakdown?.tv || 0);
      console.log('Мультфильмы:', data.typeBreakdown?.cartoon || 0);
      console.log('Аниме:', data.typeBreakdown?.anime || 0);
    }
    
  } catch (error) {
    console.error('Ошибка:', error.message);
  }
}

testStatsAPI();
