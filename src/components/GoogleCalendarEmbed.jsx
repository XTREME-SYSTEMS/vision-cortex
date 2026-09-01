import React from 'react';
import { cn } from '@/lib/utils';
import { Calendar } from 'lucide-react';

// GoogleCalendarEmbed — reusable Google Calendar component.
// Pass a Google Calendar embed URL via the `src` prop.
// To get your embed URL: Google Calendar → Settings → Integrate calendar → Embed code → extract the src URL.
// Can be placed on any page.

export default function GoogleCalendarEmbed({ src, title = 'Google Calendar', className, height = '500px' }) {
  // Default to a public Google Calendar embed (user can override with their own)
  const calendarSrc = src || 'https://calendar.google.com/calendar/embed?src=en.usa%23holiday%40group.v.calendar.google.com&ctz=America%2FNew_York';

  return (
    <div className={cn('rounded-xl border border-border/60 overflow-hidden bg-card', className)}>
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border/60 bg-muted/30">
        <Calendar className="w-4 h-4 text-muted-foreground" />
        <span className="text-sm font-medium">{title}</span>
      </div>
      <iframe
        src={calendarSrc}
        style={{ border: 0, width: '100%', height }}
        frameBorder="0"
        scrolling="no"
        title={title}
        className="w-full"
      />
    </div>
  );
}