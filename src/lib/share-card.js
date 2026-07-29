// Card do contador para compartilhar: o objeto mais orgulhoso do app virando
// imagem pronta pro story. Desenho separado da UI para poder ser testado.
const BG = '#f6f0e7';
const SURFACE = '#fffdf8';
const ACCENT = '#bd6a4b';
const INK = '#2b2521';
const INK_2 = '#6f645b';

export const CARD = { w: 1080, h: 1920 };

export function daysTogether(iso, now = Date.now()) {
  if (!iso) return 0;
  return Math.max(0, Math.floor((now - new Date(`${iso}T00:00:00`).getTime()) / 86_400_000));
}

// Milhar com ponto, como se escreve em português: 1.243 dias.
export function formatDays(n) {
  return new Intl.NumberFormat('pt-BR').format(n);
}

export function formatMilestone(iso) {
  if (!iso) return '';
  return new Date(`${iso}T00:00:00`).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' });
}

// Legenda sugerida — vai junto no compartilhamento nativo.
export function buildCaption({ coupleName, days, milestoneDate }) {
  const partes = [`${formatDays(days)} dias de ${coupleName || 'nós dois'} 💛`];
  if (milestoneDate) partes.push(`desde ${formatMilestone(milestoneDate)}`);
  partes.push('feito no Chamego · chamego.online');
  return partes.join('\n');
}

// Quebra o texto respeitando a largura, usando a métrica do próprio contexto.
export function wrapText(ctx, text, maxWidth) {
  const palavras = String(text || '').split(/\s+/).filter(Boolean);
  const linhas = [];
  let atual = '';
  for (const palavra of palavras) {
    const teste = atual ? `${atual} ${palavra}` : palavra;
    if (atual && ctx.measureText(teste).width > maxWidth) {
      linhas.push(atual);
      atual = palavra;
    } else {
      atual = teste;
    }
  }
  if (atual) linhas.push(atual);
  return linhas;
}

const serif = (size, weight = '400') => `${weight} ${size}px Fraunces, Georgia, serif`;
const sans = (size, weight = '500') => `${weight} ${size}px "Hanken Grotesk", ui-sans-serif, system-ui, sans-serif`;

// Coração da marca, desenhado em vez de importado (nada de asset externo).
function heart(ctx, cx, cy, size, color) {
  ctx.save();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(cx, cy + size * 0.35);
  ctx.bezierCurveTo(cx - size, cy - size * 0.35, cx - size * 0.5, cy - size, cx, cy - size * 0.35);
  ctx.bezierCurveTo(cx + size * 0.5, cy - size, cx + size, cy - size * 0.35, cx, cy + size * 0.35);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

export function drawCounterCard(ctx, { coupleName, days, milestoneLabel, milestoneDate, w = CARD.w, h = CARD.h }) {
  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, w, h);

  const pad = 80;
  const cx = w / 2;
  ctx.textAlign = 'center';

  // O nome é medido antes de tudo: a altura do cartão sai do conteúdo, e não
  // de um número fixo (era isso que deixava um vazio embaixo).
  ctx.font = serif(72, '500');
  const linhasNome = wrapText(ctx, coupleName || 'Nós dois', w - pad * 2 - 100).slice(0, 2);

  const alturaConteudo = 150 /* coração */ + linhasNome.length * 86 + 90 /* rótulo */
    + 240 /* número */ + 80 /* "dias" */ + (milestoneDate ? 90 : 0) + 150 /* respiros */;
  const cardH = alturaConteudo;
  const cardTop = Math.max(h * 0.13, (h - cardH) / 2 - 40);

  ctx.fillStyle = SURFACE;
  if (ctx.roundRect) {
    ctx.beginPath();
    ctx.roundRect(pad, cardTop, w - pad * 2, cardH, 56);
    ctx.fill();
  } else {
    ctx.fillRect(pad, cardTop, w - pad * 2, cardH);
  }

  // Marca: o ponto acompanha a largura real da palavra, medida na hora.
  ctx.font = `italic ${serif(58)}`;
  const larguraMarca = ctx.measureText('chamego').width;
  ctx.textAlign = 'left';
  ctx.fillStyle = INK;
  const marcaX = cx - (larguraMarca + 16) / 2;
  ctx.fillText('chamego', marcaX, cardTop - 70);
  ctx.fillStyle = ACCENT;
  ctx.fillText('.', marcaX + larguraMarca + 2, cardTop - 70);
  ctx.textAlign = 'center';

  heart(ctx, cx, cardTop + 130, 58, ACCENT);

  let y = cardTop + 250;
  ctx.fillStyle = INK;
  ctx.font = serif(72, '500');
  linhasNome.forEach((linha, i) => ctx.fillText(linha, cx, y + i * 86));
  y += linhasNome.length * 86;

  ctx.fillStyle = INK_2;
  ctx.font = sans(38, '600');
  ctx.fillText((milestoneLabel || 'Juntos há').toUpperCase(), cx, y + 60);

  // O número, protagonista
  ctx.fillStyle = ACCENT;
  ctx.font = serif(220, '500');
  ctx.fillText(formatDays(days), cx, y + 280);

  ctx.fillStyle = INK_2;
  ctx.font = sans(52, '500');
  ctx.fillText(days === 1 ? 'dia' : 'dias', cx, y + 360);

  if (milestoneDate) {
    ctx.font = sans(38, '400');
    ctx.fillText(`desde ${formatMilestone(milestoneDate)}`, cx, y + 440);
  }

  // Assinatura discreta — é o que transforma o card em convite.
  ctx.fillStyle = INK_2;
  ctx.font = sans(40, '600');
  ctx.fillText('chamego.online', cx, cardTop + cardH + 130);
  ctx.font = sans(34, '400');
  ctx.fillText('a vida a dois, organizada com carinho', cx, cardTop + cardH + 190);

  return ctx;
}

// Gera o PNG do card. Fica aqui (e não no componente) para o componente só
// cuidar de interface.
export async function renderCounterPng(dados) {
  const canvas = document.createElement('canvas');
  canvas.width = CARD.w;
  canvas.height = CARD.h;
  const ctx = canvas.getContext('2d');
  // Sem esperar as fontes, o card sai em serif genérica.
  if (document.fonts?.ready) await document.fonts.ready.catch(() => {});
  drawCounterCard(ctx, dados);
  return new Promise((resolve) => canvas.toBlob((blob) => resolve(blob), 'image/png'));
}
