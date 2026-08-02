// Foto da geladeira → lista de ingredientes. Duas regras de produto aqui:
//
// 1. O modelo NUNCA decide sozinho. O que sai daqui vai para uma tela de
//    confirmação editável — visão computacional erra com embalagem opaca,
//    geladeira lotada e luz ruim, e errar em silêncio destrói a confiança.
// 2. Sem chave configurada, a feature não quebra: cai no modo manual (a mesma
//    tela de confirmação, começando vazia).
//
// A foto é dado sensível (revela renda, hábito, saúde). Guardamos a lista de
// itens; o arquivo original é apagado depois da extração.
import fs from 'fs';

const MODELO = 'claude-haiku-4-5-20251001';
const MAX_ITENS = 25;
const UNIDADES = ['kg', 'g', 'un', 'L', 'ml', 'pacote', 'duzia', 'maco'];
const QTD_MIN = 0.1;
const QTD_MAX = 50;

export function visaoDisponivel() {
  return !!process.env.ANTHROPIC_API_KEY;
}

const PROMPT = `Você recebe a foto de uma geladeira, bancada ou sacola de compras no Brasil
(pode ser mercado, feira ou geladeira — mesma tarefa nos três casos).

Liste APENAS os alimentos e bebidas que você realmente VÊ na imagem.

Regras rígidas:
- Devolva SÓ um JSON válido, sem texto antes ou depois.
- Formato: {"itens":[{"nome":"cebola","confianca":0.9,"quantidade":1,"unidade":"kg"}]}
- "nome": em português brasileiro, no singular, como se escreve na lista de
  mercado ("leite", "peito de frango", "queijo mussarela").
- "confianca": 0 a 1. Use ABAIXO de 0.5 quando a embalagem esconde o conteúdo,
  a imagem está escura ou o item aparece parcialmente.
- "quantidade" e "unidade": um palpite pela proporção que aparece na imagem
  (ex.: um punhado de tomates soltos ≈ "quantidade":1,"unidade":"kg"; uma caixa
  de leite ≈ "quantidade":1,"unidade":"L"). Unidade é sempre uma destas:
  ${UNIDADES.join(', ')}. Quando não der pra estimar peso ou volume, conte
  unidades ("quantidade":6,"unidade":"un"). É só um ponto de partida — o casal
  ajusta na hora de confirmar, então não precisa ser exato.
- NÃO invente itens que não estão visíveis. É melhor devolver poucos itens
  certos do que muitos duvidosos.
- Ignore o que não é comida: potes vazios, panos, ímãs, utensílios, pessoas.
- Ignore temperos básicos (sal, óleo, açúcar): partimos do princípio que existem.
- No máximo ${MAX_ITENS} itens.`;

function extrairJson(texto) {
  // O modelo às vezes embrulha em ```json — pega o primeiro objeto e ignora o resto.
  const match = String(texto || '').match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    return JSON.parse(match[0]);
  } catch {
    return null;
  }
}

/**
 * Extrai ingredientes de uma imagem em disco.
 * Devolve sempre `{ disponivel, itens }` — nunca lança por causa da IA, porque
 * a tela de confirmação funciona igual sem ela.
 */
export async function extrairIngredientes(caminhoArquivo, mimeType = 'image/jpeg') {
  if (!visaoDisponivel()) return { disponivel: false, itens: [] };

  try {
    const base64 = fs.readFileSync(caminhoArquivo).toString('base64');
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: process.env.ANTHROPIC_MODEL || MODELO,
        max_tokens: 1024,
        messages: [{
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: mimeType, data: base64 } },
            { type: 'text', text: PROMPT },
          ],
        }],
      }),
    });

    if (!res.ok) {
      console.error('visao: HTTP', res.status, await res.text().catch(() => ''));
      return { disponivel: true, itens: [], erro: 'nao_deu' };
    }

    const data = await res.json();
    const texto = (data.content || []).filter((c) => c.type === 'text').map((c) => c.text).join('\n');
    const parsed = extrairJson(texto);
    if (!parsed?.itens) return { disponivel: true, itens: [], erro: 'resposta_invalida' };

    const itens = parsed.itens
      .filter((it) => it && typeof it.nome === 'string' && it.nome.trim())
      .slice(0, MAX_ITENS)
      .map((it) => ({
        nome: String(it.nome).trim().slice(0, 60),
        confianca: Math.min(1, Math.max(0, Number(it.confianca) || 0.5)),
        quantidade: Math.min(QTD_MAX, Math.max(QTD_MIN, Number(it.quantidade) || 1)),
        unidade: UNIDADES.includes(it.unidade) ? it.unidade : 'un',
      }));

    return { disponivel: true, itens };
  } catch (e) {
    console.error('visao error', e.message);
    return { disponivel: true, itens: [], erro: 'nao_deu' };
  }
}
