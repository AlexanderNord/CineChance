'use client';

import { useState, useEffect } from 'react';
import { Users, Database, TrendingUp, Calendar, RefreshCw } from 'lucide-react';

interface SimilarityStats {
  totalScores: number;
  uniqueUsers: number;
  averageMatch: number;
  lastComputed: string | null;
  schedulerLastRun: string | null;
}

export default function SimilarityMetrics() {
  const [stats, setStats] = useState<SimilarityStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/similarity/stats');
      const data = await res.json();
      if (data.success) {
        setStats(data.stats);
      } else {
        setError(data.error || 'Failed to load stats');
      }
    } catch (err) {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'Никогда';
    const date = new Date(dateStr);
    return date.toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getDaysSince = (dateStr: string | null) => {
    if (!dateStr) return null;
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  if (loading) {
    return (
      <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
        <div className="flex items-center gap-2 mb-4">
          <Users className="w-5 h-5 text-purple-400" />
          <h3 className="text-lg font-semibold text-white">Метрики Similarity</h3>
        </div>
        <div className="flex items-center justify-center py-8">
          <RefreshCw className="w-6 h-6 text-gray-500 animate-spin" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
        <div className="flex items-center gap-2 mb-4">
          <Users className="w-5 h-5 text-purple-400" />
          <h3 className="text-lg font-semibold text-white">Метрики Similarity</h3>
        </div>
        <div className="text-red-400 text-center py-4">
          Ошибка: {error}
        </div>
        <button
          onClick={fetchStats}
          className="mt-4 w-full px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors"
        >
          Повторить
        </button>
      </div>
    );
  }

  const daysSinceScheduler = getDaysSince(stats?.schedulerLastRun || null);
  const daysSinceLastComputed = getDaysSince(stats?.lastComputed || null);

  return (
    <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-purple-400" />
          <h3 className="text-lg font-semibold text-white">Метрики Similarity</h3>
        </div>
        <button
          onClick={fetchStats}
          className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
          title="Обновить"
        >
          <RefreshCw className="w-4 h-4 text-gray-400" />
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {/* Total Scores */}
        <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700">
          <div className="flex items-center gap-2 mb-2">
            <Database className="w-4 h-4 text-gray-500" />
            <p className="text-gray-400 text-sm">Всего scores</p>
          </div>
          <p className="text-2xl font-bold text-white">
            {stats?.totalScores?.toLocaleString() || 0}
          </p>
        </div>

        {/* Unique Users */}
        <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700">
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-4 h-4 text-gray-500" />
            <p className="text-gray-400 text-sm">Уникальных юзеров</p>
          </div>
          <p className="text-2xl font-bold text-white">
            {stats?.uniqueUsers || 0}
          </p>
        </div>

        {/* Average Match */}
        <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-gray-500" />
            <p className="text-gray-400 text-sm">Ср. match</p>
          </div>
          <p className="text-2xl font-bold text-white">
            {((stats?.averageMatch || 0) * 100).toFixed(1)}%
          </p>
        </div>

        {/* Scheduler Status */}
        <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700">
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="w-4 h-4 text-gray-500" />
            <p className="text-gray-400 text-sm">Scheduler</p>
          </div>
          <p className="text-2xl font-bold text-white">
            {daysSinceScheduler !== null ? `${daysSinceScheduler}д` : '-'}
          </p>
          <p className="text-xs text-gray-500 mt-1">назад</p>
        </div>
      </div>

      {/* Last Computed Info */}
      <div className="space-y-2">
        <div className="flex justify-between items-center p-3 bg-gray-800/30 rounded-lg">
          <span className="text-gray-400 text-sm">Последний scheduler:</span>
          <span className="text-white text-sm">
            {formatDate(stats?.schedulerLastRun || null)}
          </span>
        </div>
        <div className="flex justify-between items-center p-3 bg-gray-800/30 rounded-lg">
          <span className="text-gray-400 text-sm">Последний computed:</span>
          <span className="text-white text-sm">
            {formatDate(stats?.lastComputed || null)}
          </span>
        </div>
      </div>
    </div>
  );
}
