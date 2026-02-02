// Тест для проверки брошенных фильмов
const fetch = require('node-fetch');

async function testDroppedMovies() {
  try {
    console.log('=== ТЕСТИРОВАНИЕ БРОШЕННЫХ ФИЛЬМОВ ===');
    
    // Проверяем API для моих фильмов с параметром dropped
    const response = await fetch('http://localhost:3000/api/my-movies?status=dropped&page=1', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    });
    
    console.log('Status:', response.status);
    console.log('Status Text:', response.statusText);
    
    const text = await response.text();
    console.log('Response:', text);
    
  } catch (error) {
    console.error('Ошибка:', error.message);
  }
}

testDroppedMovies();
