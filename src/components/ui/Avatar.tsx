/**
 * Аватар-заглушка: цветной кружок с инициалами.
 * Загрузку изображений ТЗ не требует, а брать «фото» неоткуда —
 * инициалы на стабильном цвете читаются лучше, чем серый силуэт.
 */
import { avatarClass, initials } from '@/lib/format';

type Props = {
  displayName: string;
  avatarColor: string;
  size?: 'sm' | 'md' | 'lg';
};

const SIZES = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-20 w-20 text-2xl',
};

export function Avatar({ displayName, avatarColor, size = 'md' }: Props) {
  return (
    <span
      className={`inline-flex shrink-0 select-none items-center justify-center rounded-full font-semibold text-white ${avatarClass(
        avatarColor,
      )} ${SIZES[size]}`}
      aria-hidden="true"
    >
      {initials(displayName)}
    </span>
  );
}
