'use client';

import { useState, useEffect, useRef } from 'react';
import { Edit2, Check, X, Loader2 } from 'lucide-react';

interface NicknameEditorProps {
  initialName: string;
  onNicknameChange?: (newName: string | null) => void;
}

export default function NicknameEditor({ initialName, onNicknameChange }: NicknameEditorProps) {
  const [nickname, setNickname] = useState(initialName);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Обновляем состояние при изменении initialName
  useEffect(() => {
    setNickname(initialName);
  }, [initialName]);

  // Фокус на инпут при начале редактирования
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleSave = async () => {
    setError(null);
    setSuccess(false);

    const trimmedName = nickname.trim();
    const nameToSave = trimmedName === '' ? null : trimmedName;

    // Если имя не изменилось, просто выходим из режима редактирования
    if (nameToSave === initialName?.trim()) {
      setIsEditing(false);
      return;
    }

    setIsSaving(true);

    try {
      const res = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: nameToSave }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Ошибка при сохранении');
      } else {
        setSuccess(true);
        setIsEditing(false);
        onNicknameChange?.(nameToSave);
        setTimeout(() => setSuccess(false), 3000);
      }
    } catch {
      setError('Ошибка при сохранении');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setNickname(initialName);
    setError(null);
    setIsEditing(false);
  };

  // Обработка нажатия Enter
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  if (isEditing) {
    return (
      <div className="space-y-2 md:space-y-3 w-full">
        <div className="flex flex-col xs:flex-row items-stretch xs:items-center gap-2">
          <input
            ref={inputRef}
            type="text"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ваше имя или никнейм"
            className="flex-1 px-3 py-2 md:px-4 md:py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 text-sm md:text-base"
            minLength={2}
            maxLength={30}
            disabled={isSaving}
          />
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex-1 xs:flex-none p-2 bg-green-600 hover:bg-green-700 rounded-lg text-white transition disabled:opacity-50 flex items-center justify-center gap-1"
              title="Сохранить"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 md:w-5 md:h-5 animate-spin" />
                  <span className="text-xs md:text-sm hidden sm:inline">Сохранение</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 md:w-5 md:h-5" />
                  <span className="text-xs md:text-sm hidden sm:inline">Сохранить</span>
                </>
              )}
            </button>
            <button
              onClick={handleCancel}
              disabled={isSaving}
              className="flex-1 xs:flex-none p-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-white transition disabled:opacity-50 flex items-center justify-center gap-1"
              title="Отмена"
            >
              <X className="w-4 h-4 md:w-5 md:h-5" />
              <span className="text-xs md:text-sm hidden sm:inline">Отмена</span>
            </button>
          </div>
        </div>
        {error && <p className="text-red-400 text-xs md:text-sm">{error}</p>}
        {success && <p className="text-green-400 text-xs md:text-sm">Никнейм успешно сохранён</p>}
        <p className="text-gray-500 text-xs">
          От 2 до 30 символов. Если оставить пустым, будет отображаться ваш email
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 w-full">
      <div className="flex items-center gap-2">
        <span className="text-gray-300 text-base md:text-lg font-medium truncate">
          {nickname || 'Не указан'}
        </span>
        <button
          onClick={() => setIsEditing(true)}
          className="p-1.5 bg-gray-800 hover:bg-gray-700 rounded-lg text-gray-400 hover:text-white transition flex-shrink-0"
          title="Изменить никнейм"
        >
          <Edit2 className="w-4 h-4" />
        </button>
      </div>
      {success && (
        <p className="text-green-400 text-xs md:text-sm bg-green-900/30 px-2 py-1 rounded">
          Никнейм успешно сохранён
        </p>
      )}
    </div>
  );
}