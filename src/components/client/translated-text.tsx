'use client';

import { useLanguage } from '@/contexts/LanguageContext';
import { createElement } from 'react';

interface TranslatedTextProps {
  translationKey: string;
  fallback: string;
  className?: string;
  as?: keyof JSX.IntrinsicElements;
}

export function TranslatedText({
  translationKey,
  fallback,
  className,
  as = 'span'
}: TranslatedTextProps) {
  const { t } = useLanguage();

  return createElement(
    as,
    { className },
    t(translationKey, fallback)
  );
}