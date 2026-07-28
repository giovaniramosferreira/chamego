// Geração de .ics (RFC 5545) para os eventos do casal — o Chamego passa a
// existir dentro do calendário que a pessoa já usa, sem app nativo.

function escape(text) {
  return String(text || '').replace(/([,;\\])/g, '\\$1').replace(/\n/g, '\\n');
}

// Linhas de mais de 75 octetos precisam ser dobradas com espaço à frente.
function fold(line) {
  if (line.length <= 74) return line;
  const parts = [line.slice(0, 74)];
  let rest = line.slice(74);
  while (rest.length > 73) {
    parts.push(` ${rest.slice(0, 73)}`);
    rest = rest.slice(73);
  }
  if (rest) parts.push(` ${rest}`);
  return parts.join('\r\n');
}

const stamp = (d = new Date()) => `${d.toISOString().replace(/[-:]/g, '').slice(0, 15)}Z`;

// Evento com hora vira DTSTART local (sem timezone: o calendário assume o do
// aparelho, que é o do casal); sem hora vira evento de dia inteiro.
function eventLines(ev, uidDomain) {
  const date = String(ev.date).replace(/-/g, '');
  const lines = [
    'BEGIN:VEVENT',
    `UID:evento-${ev.id}@${uidDomain}`,
    `DTSTAMP:${stamp()}`,
    `SUMMARY:${escape(ev.title)}`,
  ];
  if (ev.time) {
    const start = `${date}T${ev.time.replace(':', '')}00`;
    const endHour = String((Number(ev.time.slice(0, 2)) + 1) % 24).padStart(2, '0');
    lines.push(`DTSTART:${start}`, `DTEND:${date}T${endHour}${ev.time.slice(3, 5)}00`);
  } else {
    const next = new Date(`${ev.date}T00:00:00`);
    next.setDate(next.getDate() + 1);
    lines.push(`DTSTART;VALUE=DATE:${date}`, `DTEND;VALUE=DATE:${next.toISOString().slice(0, 10).replace(/-/g, '')}`);
  }
  if (ev.location) lines.push(`LOCATION:${escape(ev.location)}`);
  if (ev.notes) lines.push(`DESCRIPTION:${escape(ev.notes)}`);
  lines.push('END:VEVENT');
  return lines;
}

export function buildIcs(events, { name = 'Chamego', domain = 'chamego.online' } = {}) {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Chamego//PT-BR//',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${escape(name)}`,
    ...events.flatMap((e) => eventLines(e, domain)),
    'END:VCALENDAR',
  ];
  return `${lines.map(fold).join('\r\n')}\r\n`;
}
