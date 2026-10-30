export async function downloadActivityIcs(activityId: string, label: string): Promise<void> {
  const token = localStorage.getItem('coro_token');
  const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/activities/${activityId}/ics`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const contentType = response.headers.get('content-type')?.toLowerCase() ?? '';
  if (!response.ok || !contentType.includes('text/calendar')) {
    throw new Error('Réponse calendrier invalide');
  }
  const content = await response.text();
  if (!content.includes('BEGIN:VCALENDAR') || !content.includes('END:VCALENDAR') ||
      !content.includes('BEGIN:VEVENT') || !content.includes('END:VEVENT')) {
    throw new Error('Fichier calendrier invalide');
  }
  const url = URL.createObjectURL(new Blob([content], { type: 'text/calendar;charset=utf-8' }));
  try {
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${label.replace(/[^a-z0-9à-ÿ _-]/gi, '').trim() || 'activite'}.ics`;
    anchor.click();
  } finally {
    URL.revokeObjectURL(url);
  }
}
