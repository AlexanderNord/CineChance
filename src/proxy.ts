import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Публичные пути, которые не требуют авторизации
const publicPaths = [
  '/api/auth',
  '/invite',
];

// Пути, которые нужно пропустить без редиректа (API и статика)
const skipRedirectPaths = [
  '/api/',      // Все API маршруты
  '/_next',     // Next.js internals
  '/static',    // Статические файлы
  '/favicon.ico',
  '/images',
];

export function proxy(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;

  // Проверяем, является ли путь публичным
  const isPublicPath = publicPaths.some(path => pathname.startsWith(path));

  // Если путь публичный, пропускаем
  if (isPublicPath) {
    return NextResponse.next();
  }

  // Пропускаем API и статику без редиректа (пусть сами обрабатывают)
  const shouldSkipRedirect = skipRedirectPaths.some(path => pathname.startsWith(path));
  if (shouldSkipRedirect) {
    return NextResponse.next();
  }

  // Главная страница с параметром auth - пропускаем (модалка откроется на клиенте)
  if (pathname === '/' && searchParams.has('auth')) {
    return NextResponse.next();
  }

  // Для всех остальных путей проверяем наличие сессионной куки
  const hasSession = request.cookies.has('next-auth.session-token') ||
                     request.cookies.has('next-auth.session-token.0') ||
                     request.cookies.has('__Secure-next-auth.session-token');

  if (!hasSession) {
    const url = new URL('/', request.url);
    url.searchParams.set('auth', 'required');
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - api/auth/* (authentication API)
     * - /invite/* (invitation pages)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, sitemap.xml, robots.txt
     * - public folder files
     */
    '/((?!api/auth|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)',
  ],
};
