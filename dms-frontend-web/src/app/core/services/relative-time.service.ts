import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class RelativeTimeService {
  formatRelativeTime(value: string | Date | undefined | null): string {
    if (!value) return '';
    const timestamp =
      typeof value === 'string' ? Date.parse(value) : value instanceof Date ? value.getTime() : Number.NaN;
    if (Number.isNaN(timestamp)) return '';

    const diffMs = Date.now() - timestamp;
    if (diffMs <= 0) return 'a few seconds ago';

    const diffSeconds = Math.floor(diffMs / 1000);
    if (diffSeconds < 60) return 'a few seconds ago';

    const diffMinutes = Math.floor(diffSeconds / 60);
    if (diffMinutes < 60) return `${diffMinutes} minute${diffMinutes === 1 ? '' : 's'} ago`;

    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return diffHours === 1 ? 'an hour ago' : `${diffHours} hours ago`;

    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
  }
}
