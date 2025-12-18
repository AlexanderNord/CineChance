// src/app/page.tsx
import HorizontalMovieGridServer from './components/HorizontalMovieGridServer';

export default function Home() {
  return (
    <div className="w-full max-w-full">
      <HorizontalMovieGridServer />
      
      {/* Дополнительные блоки можно добавить позже */}
      <div className="mt-12">
        <h2 className="text-2xl font-bold mb-6">Что посмотреть дальше?</h2>
        <p className="text-gray-400">
          Скоро здесь появятся персонализированные рекомендации и новые релизы.
        </p>
      </div>
      
      <div className="h-12"></div>
    </div>
  );
}