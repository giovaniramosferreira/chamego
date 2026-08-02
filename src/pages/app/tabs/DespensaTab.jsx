import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api, apiUpload } from '../../../lib/api.js';
import { useToast } from '../../../lib/toast-context.js';
import { AppHeader, Card, Btn, Chip, Field, Row, RowList, Sheet, Spinner, CheckRow } from '../../../ui/kit.jsx';
import Icon from '../../../ui/icons.jsx';

// Unidades que o prompt de visão (backend/receita/visao.js) também usa —
// mesmo vocabulário fechado dos dois lados.
const UNIDADES = [
  ['kg', 'kg'], ['g', 'g'], ['un', 'un'], ['L', 'L'], ['ml', 'ml'],
  ['pacote', 'pacote'], ['duzia', 'dúzia'], ['maco', 'maço'],
];

// Junta número + unidade num texto só, do jeito que se escreve numa lista de
// verdade — é isso que vai pro campo `qtd` (texto livre no banco).
function formatarQtd(quantidade, unidade) {
  const n = Number(quantidade);
  if (!n || n <= 0) return '';
  const numero = Number.isInteger(n) ? String(n) : n.toFixed(1).replace(/\.0$/, '');
  const label = UNIDADES.find(([valor]) => valor === unidade)?.[1] || unidade;
  return `${numero} ${label}`;
}

// Despensa + foto de compras. A confirmação editável é obrigatória: visão
// computacional erra com embalagem opaca e luz ruim, e errar em silêncio faria
// o app sugerir receita impossível.
export default function DespensaTab() {
  const nav = useNavigate();
  const { toast } = useToast();
  const [params] = useSearchParams();
  const [dados, setDados] = useState(null);
  const [sugestoes, setSugestoes] = useState(null);
  const [texto, setTexto] = useState('');
  const [lendo, setLendo] = useState(false);
  // { sessaoId, itens: [{nome, marcado, confianca, quantidade, unidade, cadenciaDias, aberto}], modoManual }
  const [confirmacao, setConfirmacao] = useState(null);
  const [edicao, setEdicao] = useState(null); // { id, qtd, cadenciaDias }
  const fotoRef = useRef(null);

  const carregar = useCallback(() => {
    api('/api/despensa').then(setDados).catch(() => setDados({ itens: [], conhecidos: [] }));
    api('/api/mercado/sugestoes').then(setSugestoes).catch(() => setSugestoes(null));
  }, []);
  useEffect(() => { carregar(); }, [carregar]);

  // Chegou de "fotografar a geladeira": abre a câmera direto.
  useEffect(() => {
    if (params.get('foto') === '1') fotoRef.current?.click();
  }, [params]);

  async function adicionar(e) {
    e?.preventDefault();
    // Aceita "ovo, leite, tomate" de uma vez — é como as pessoas escrevem.
    const itens = texto.split(',').map((t) => t.trim()).filter(Boolean);
    if (!itens.length) return;
    try {
      const d = await api('/api/despensa', { method: 'POST', body: { itens } });
      setDados((atual) => ({ ...atual, itens: d.itens }));
      setTexto('');
    } catch (err) {
      if (!err.upgrade) toast(err.message, { tone: 'error' });
    }
  }

  async function lerFoto(e) {
    const arquivo = e.target.files?.[0];
    if (!arquivo) return;
    setLendo(true);
    try {
      const comprimida = await comprimir(arquivo);
      const fd = new FormData();
      fd.append('foto', comprimida, 'geladeira.jpg');
      const res = await apiUpload('/api/cozinha/foto', fd);
      setConfirmacao({
        sessaoId: res.sessaoId,
        modoManual: res.modoManual,
        // Confiança baixa entra desmarcada: o padrão é não errar por nós.
        itens: (res.detectado || []).map((it) => ({
          nome: it.nome, marcado: it.confianca >= 0.5, confianca: it.confianca,
          quantidade: it.quantidade || 1, unidade: it.unidade || 'un', cadenciaDias: '', aberto: false,
        })),
      });
    } catch (err) {
      if (!err.upgrade) toast(err.message, { tone: 'error' });
    } finally {
      setLendo(false);
      if (fotoRef.current) fotoRef.current.value = '';
    }
  }

  function atualizarItemConfirmacao(idx, patch) {
    setConfirmacao((c) => ({ ...c, itens: c.itens.map((it, i) => (i === idx ? { ...it, ...patch } : it)) }));
  }

  async function confirmar() {
    const marcados = confirmacao.itens.filter((i) => i.marcado).map((i) => {
      const item = { nome: i.nome, qtd: formatarQtd(i.quantidade, i.unidade) };
      const dias = Number(i.cadenciaDias);
      if (Number.isInteger(dias) && dias >= 1 && dias <= 180) item.cadenciaDias = dias;
      return item;
    });
    try {
      const d = await api(`/api/cozinha/foto/${confirmacao.sessaoId}/confirmar`, { method: 'POST', body: { itens: marcados } });
      setDados((atual) => ({ ...atual, itens: d.itens }));
      setConfirmacao(null);
      if (d.ignorados > 0) toast(`${d.ignorados} item(ns) não couberam na despensa grátis.`);
      else toast('Despensa atualizada ✓');
      carregar();
    } catch (err) {
      if (!err.upgrade) toast(err.message, { tone: 'error' });
    }
  }

  async function salvarEdicao() {
    const patch = { qtd: edicao.qtd.trim() };
    if (edicao.cadenciaDias !== '') {
      const dias = Number(edicao.cadenciaDias);
      if (!Number.isInteger(dias) || dias < 1 || dias > 180) {
        toast('Duração precisa ser um número de dias entre 1 e 180', { tone: 'error' });
        return;
      }
      patch.cadenciaDias = dias;
    }
    try {
      await api(`/api/despensa/${edicao.id}`, { method: 'PATCH', body: patch });
      setEdicao(null);
      carregar();
      toast('Item atualizado ✓');
    } catch (err) {
      toast(err.message, { tone: 'error' });
    }
  }

  async function feedback(item, tipo) {
    try {
      await api(`/api/despensa/${item.id}/feedback`, { method: 'POST', body: { tipo } });
      carregar();
      const frases = {
        comprou: 'Anotado: comprado hoje.',
        acabou: 'Anotado: acabou. Já entrou na lista.',
        'ainda-tenho': 'Ok — a gente vai perguntar mais tarde da próxima vez.',
        'nao-compro-mais': 'Não sugerimos mais esse item.',
      };
      toast(frases[tipo]);
    } catch (err) {
      toast(err.message, { tone: 'error' });
    }
  }

  if (dados === null) return <div className="py-20 text-center"><Spinner /></div>;

  return (
    <div className="pt-3">
      <AppHeader back={() => nav('/app/cozinha')} title="Despensa de vocês" />
      <p className="text-ink-2 text-[.95rem] mb-4">
        O que tem em casa melhora o sorteio e alimenta a lista de mercado.
      </p>

      <input ref={fotoRef} type="file" accept="image/*" capture="environment" hidden onChange={lerFoto} />
      <Btn block variant="ghost" onClick={() => fotoRef.current?.click()} disabled={lendo} className="mb-1.5">
        {lendo ? <Spinner /> : <><Icon name="camera" size={18} /> Fotografar compras</>}
      </Btn>
      <p className="text-xs text-ink-3 mb-4">Geladeira, sacola do mercado ou feira — a foto vira despensa atualizada.</p>

      <form onSubmit={adicionar} className="mb-5">
        <Field label="Ou escreva o que tem" placeholder="ovo, leite, tomate" value={texto} onChange={(e) => setTexto(e.target.value)} />
        <Btn block type="submit" disabled={!texto.trim()}>Adicionar à despensa</Btn>
      </form>

      {/* Lista de mercado proativa: cada item vem com o motivo. */}
      {sugestoes?.sugestoes?.length > 0 && (
        <>
          <p className="text-xs font-semibold tracking-[.15em] uppercase text-ink-3 mb-2">Está na hora de comprar</p>
          <div className="space-y-2 mb-5">
            {sugestoes.sugestoes.map((s) => (
              <Card key={s.id} className="!p-4">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="font-medium">{s.nome}</span>
                  <span className={`text-xs font-semibold ${s.urgencia === 'logo' ? 'text-ink-3' : 'text-accent-press'}`}>
                    {s.urgencia === 'acabou' ? 'acabou' : s.urgencia === 'acabando' ? 'acabando' : `em ${s.emDias}d`}
                  </span>
                </div>
                <p className="text-sm text-ink-2 mt-0.5">{s.motivo}{s.qtd ? ` · costuma comprar ${s.qtd}` : ''}</p>
                <div className="flex flex-wrap gap-2 mt-3">
                  <Chip onClick={() => feedback({ id: s.id }, 'comprou')}>Comprei</Chip>
                  <Chip onClick={() => feedback({ id: s.id }, 'ainda-tenho')}>Ainda temos</Chip>
                  <Chip onClick={() => feedback({ id: s.id }, 'nao-compro-mais')}>Não compro mais</Chip>
                </div>
              </Card>
            ))}
          </div>
        </>
      )}

      <p className="text-xs font-semibold tracking-[.15em] uppercase text-ink-3 mb-2">
        Na despensa {dados.limite > 0 ? `(${dados.itens.length} de ${dados.limite})` : ''}
      </p>
      {dados.itens.length === 0 ? (
        <Card className="text-center text-sm text-ink-2 py-6">
          Nada aqui ainda. Uma foto da geladeira resolve em 10 segundos.
        </Card>
      ) : (
        <RowList className="mb-6">
          {dados.itens.map((item) => (
            <Row key={item.id} icon="shopping" title={item.name}
              sub={item.silenciado ? 'silenciado' : [item.qtd, `${item.eventos.length} ${item.eventos.length === 1 ? 'registro' : 'registros'}`].filter(Boolean).join(' · ')}
              right={
                <div className="flex gap-1">
                  <button onClick={() => setEdicao({ id: item.id, qtd: item.qtd || '', cadenciaDias: item.cadencia_dias ? String(item.cadencia_dias) : '' })}
                    className="text-xs text-ink-2 px-2 py-1">editar</button>
                  <button onClick={() => feedback(item, 'acabou')} className="text-xs text-accent px-2 py-1">acabou</button>
                  <button onClick={async () => { await api(`/api/despensa/${item.id}`, { method: 'DELETE' }); carregar(); }}
                    aria-label="Remover" className="text-ink-3 p-1"><Icon name="close" size={15} /></button>
                </div>
              } />
          ))}
        </RowList>
      )}

      {confirmacao && (
        <Sheet title={confirmacao.modoManual ? 'Escreva o que tem' : 'Confirma o que a gente viu?'} onClose={() => setConfirmacao(null)}>
          <p className="text-sm text-ink-2 mb-3">
            {confirmacao.modoManual
              ? 'Não deu pra ler a foto. Digite os itens separados por vírgula.'
              : 'Desmarque o que erramos e acrescente o que faltou. Nada entra sem vocês confirmarem.'}
          </p>

          {confirmacao.itens.length > 0 && (
            <Card className="!p-0 mb-3">
              {confirmacao.itens.map((it, idx) => (
                <div key={`${it.nome}-${idx}`} className="border-b border-line last:border-0">
                  <CheckRow done={it.marcado} text={it.nome}
                    right={
                      <div className="flex items-center gap-2">
                        {it.confianca < 0.5 && <span className="text-xs text-ink-3">incerto</span>}
                        <button type="button" onClick={() => atualizarItemConfirmacao(idx, { aberto: !it.aberto })}
                          className="text-xs text-accent-press">{it.aberto ? 'ok' : 'ajustar'}</button>
                      </div>
                    }
                    onToggle={() => atualizarItemConfirmacao(idx, { marcado: !it.marcado })} />
                  {it.aberto && (
                    <div className="px-4 pb-3 -mt-1 flex flex-wrap items-center gap-2">
                      <div className="flex items-center gap-1">
                        <button type="button" aria-label="Diminuir" onClick={() => atualizarItemConfirmacao(idx, { quantidade: Math.max(0.1, Number(it.quantidade) - 1) })}
                          className="w-7 h-7 rounded-full shadow-[inset_0_0_0_1px_var(--line-2)] text-ink-2">−</button>
                        <input type="number" step="0.1" min="0.1" value={it.quantidade}
                          onChange={(e) => atualizarItemConfirmacao(idx, { quantidade: e.target.value })}
                          className="w-14 text-center rounded-btn bg-surface px-1 py-1.5 shadow-[inset_0_0_0_1px_var(--line-2)] outline-none" />
                        <button type="button" aria-label="Aumentar" onClick={() => atualizarItemConfirmacao(idx, { quantidade: Number(it.quantidade) + 1 })}
                          className="w-7 h-7 rounded-full shadow-[inset_0_0_0_1px_var(--line-2)] text-ink-2">+</button>
                        <select value={it.unidade} onChange={(e) => atualizarItemConfirmacao(idx, { unidade: e.target.value })}
                          className="rounded-btn bg-surface px-2 py-1.5 text-sm shadow-[inset_0_0_0_1px_var(--line-2)] outline-none">
                          {UNIDADES.map(([valor, label]) => <option key={valor} value={valor}>{label}</option>)}
                        </select>
                      </div>
                      <input type="number" min="1" max="180" placeholder="dias até acabar" value={it.cadenciaDias}
                        onChange={(e) => atualizarItemConfirmacao(idx, { cadenciaDias: e.target.value })}
                        className="w-32 rounded-btn bg-surface px-2 py-1.5 text-sm shadow-[inset_0_0_0_1px_var(--line-2)] outline-none" />
                    </div>
                  )}
                </div>
              ))}
            </Card>
          )}

          <Field label="Acrescentar" placeholder="cebola, queijo" value={texto} onChange={(e) => setTexto(e.target.value)} />
          <Btn block variant="ghost" className="mb-3" disabled={!texto.trim()} onClick={() => {
            const novos = texto.split(',').map((t) => t.trim()).filter(Boolean)
              .map((nome) => ({ nome, marcado: true, confianca: 1, quantidade: 1, unidade: 'un', cadenciaDias: '', aberto: false }));
            setConfirmacao((c) => ({ ...c, itens: [...c.itens, ...novos] }));
            setTexto('');
          }}>Adicionar à lista</Btn>

          <Btn block onClick={confirmar} disabled={!confirmacao.itens.some((i) => i.marcado)}>
            Está certo, guardar
          </Btn>
        </Sheet>
      )}

      {edicao && (
        <Sheet title="Ajustar item" onClose={() => setEdicao(null)}>
          <Field label="Quantidade" placeholder="1 kg, 6 un..." value={edicao.qtd}
            onChange={(e) => setEdicao((d) => ({ ...d, qtd: e.target.value }))} />
          <Field label="Dura quantos dias" type="number" min="1" max="180" placeholder="ex.: 14" value={edicao.cadenciaDias}
            onChange={(e) => setEdicao((d) => ({ ...d, cadenciaDias: e.target.value }))} />
          <Btn block onClick={salvarEdicao}>Salvar</Btn>
        </Sheet>
      )}
    </div>
  );
}

// Comprime no cliente antes de subir: geladeira de celular moderno passa de 4MB
// e a foto só precisa ser legível pelo modelo.
async function comprimir(arquivo, maxLado = 1280, qualidade = 0.75) {
  try {
    const bitmap = await createImageBitmap(arquivo);
    const escala = Math.min(1, maxLado / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * escala);
    canvas.height = Math.round(bitmap.height * escala);
    canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise((r) => canvas.toBlob(r, 'image/jpeg', qualidade));
    return blob && blob.size < arquivo.size ? blob : arquivo;
  } catch {
    return arquivo; // navegador antigo: sobe o original
  }
}
