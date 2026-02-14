'use client';

import Link from 'next/link';

interface BackButtonProps {
  className?: string;
}

export default function BackButton({ className = 'text-blue-400 hover:underline mb-6 inline-block' }: BackButtonProps) {
  return (
    <Link href="/profile/stats" className={className}>
      ← На статистику
    </Link>
  );
}
