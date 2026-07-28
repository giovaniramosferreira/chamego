// Interpreta o texto do "+" global: "jantar sexta 20h no Oliva" vira título,
// data, hora e local. O que não for reconhecido continua no título — o
// parser nunca engole o que a pessoa escreveu.
const WEEKDAYS = [
  ['domingo', 0], ['segunda', 1], ['terça', 2], ['terca', 2], ['quarta', 3],
  ['quinta', 4], ['sexta', 5], ['sábado', 6], ['sabado', 6],
];
const MONTHS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

function iso(date) {
  return date.toLocaleDateString('en-CA');
}

// Lê "jantar sexta 20h no Oliva" e devolve {title, date, time, location}.
// O que não for reconhecido continua no título — nunca engole texto.
export function parseQuickText(input) {
  let rest = ` ${String(input || '').trim()} `;
  const out = { title: '', date: '', time: '', location: '' };
  const cut = (re) => {
    const m = rest.match(re);
    if (!m) return null;
    rest = `${rest.slice(0, m.index)} ${rest.slice(m.index + m[0].length)}`;
    return m;
  };

  // hora: 20h, 20h30, 20:30, às 9h. Exige o "h" ou os dois pontos — número
  // solto ("comprar 2 pães", "20 de junho") não é hora e continua no título.
  const timeMatch = rest.match(/\s(?:às\s+)?(\d{1,2})(?:h(\d{2})?|:(\d{2}))(?=\s)/i);
  if (timeMatch) {
    const h = Number(timeMatch[1]);
    const min = Number(timeMatch[2] ?? timeMatch[3] ?? 0);
    if (h <= 23 && min <= 59) {
      out.time = `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
      rest = `${rest.slice(0, timeMatch.index)} ${rest.slice(timeMatch.index + timeMatch[0].length)}`;
    }
  }

  // data: hoje, amanhã, dia da semana, 12/03, 12 de março
  const today = new Date();
  if (cut(/\shoje(?=\s)/i)) out.date = iso(today);
  else if (cut(/\samanh[ãa](?=\s)/i)) out.date = iso(new Date(Date.now() + 86_400_000));
  else {
    const dm = cut(/\s(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?(?=\s)/);
    if (dm) {
      const year = dm[3] ? Number(dm[3].length === 2 ? `20${dm[3]}` : dm[3]) : today.getFullYear();
      const d = new Date(year, Number(dm[2]) - 1, Number(dm[1]));
      if (!dm[3] && d < today) d.setFullYear(year + 1);
      out.date = iso(d);
    } else {
      const named = cut(new RegExp(`\\s(\\d{1,2})\\s+de\\s+(${MONTHS.join('|')})\\w*(?=\\s)`, 'i'));
      if (named) {
        const month = MONTHS.indexOf(named[2].toLowerCase().slice(0, 3));
        const d = new Date(today.getFullYear(), month, Number(named[1]));
        if (d < today) d.setFullYear(today.getFullYear() + 1);
        out.date = iso(d);
      } else {
        for (const [word, dow] of WEEKDAYS) {
          const m = cut(new RegExp(`\\s(?:na\\s+|no\\s+)?${word}(?:-feira)?(?=\\s)`, 'i'));
          if (m) {
            const d = new Date(today);
            const delta = (dow - today.getDay() + 7) % 7 || 7;
            d.setDate(today.getDate() + delta);
            out.date = iso(d);
            break;
          }
        }
      }
    }
  }

  // local: "no/na X" no fim da frase
  const where = cut(/\s(?:no|na|em)\s+([A-ZÁÉÍÓÚÂÊÔÃÕÇ][\wÀ-ÿ'’]*(?:\s+[\wÀ-ÿ'’]+){0,2})\s*$/);
  if (where) out.location = where[1].trim();

  out.title = rest.replace(/\s+/g, ' ').trim();
  return out;
}
