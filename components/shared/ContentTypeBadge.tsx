import { Badge } from '@/components/ui/badge';
import { CONTENT_TYPE_COLORS, CONTENT_TYPE_LABELS } from '@/lib/utils/fileHelpers';
import type { ContentType } from '@/types';
import { cn } from '@/lib/utils';

interface ContentTypeBadgeProps {
  contentType: ContentType | null | undefined;
  className?: string;
}

export function ContentTypeBadge({ contentType, className }: ContentTypeBadgeProps) {
  if (!contentType) return null;
  const color = CONTENT_TYPE_COLORS[contentType] ?? 'bg-gray-100 text-gray-800';
  const label = CONTENT_TYPE_LABELS[contentType] ?? contentType;

  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
        color,
        className
      )}
    >
      {label}
    </span>
  );
}

export { Badge };
