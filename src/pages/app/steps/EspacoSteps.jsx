import { useState } from 'react';
import { api } from '../../../lib/api.js';
import { useSession } from '../../../lib/session-context.js';
import { Btn, Field, SelectField, AppHeader, Row, RowList } from '../../../ui/kit.jsx';
import Icon from '../../../ui/icons.jsx';

const LABELS = ['Primeiro encontro', 'Início do namoro', 'Noivado', 'Casamento', 'Outro'];

export default function EspacoSteps({ onDone }) {
  const { refresh } = useSession();
  const [step, setStep] = useState('nome'); // nome | data | convite
  const [name, setName] = useState('');
  const [date, setDate] = useState('');
  const [label, setLabel] = useState(LABELS[0]);
  const [invite, setInvite] = useState(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function createSpace(e) {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const { couple } = await api('/api/couples', { method: 'POST', body: { name, milestoneDate: date, milestoneLabel: label } });
      const { invite: inv } = await api(`/api/couples/${couple.id}/invites`, { method: 'POST' });
      setInvite(inv);
      setStep('convite');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function copyLink() {
    await navigator.clipboard.writeText(invite.url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function finish() {
    await refresh();
    onDone();
  }

  if (step === 'nome') {
    return (
      <div>
        <AppHeader title="Seu espaço" />
        <p className="text-ink-2 mb-6">Dê um nome carinhoso ao espaço de vocês.</p>
        <form onSubmit={(e) => { e.preventDefault(); if (name.trim()) setStep('data'); }}>
          <Field label="Nome do casal ou espaço" required placeholder="Ex.: Mari & João"
            value={name} onChange={(e) => setName(e.target.value)} />
          <Btn block type="submit" disabled={!name.trim()}>Continuar</Btn>
        </form>
      </div>
    );
  }

  if (step === 'data') {
    return (
      <div>
        <AppHeader back={() => setStep('nome')} title="Data importante" />
        <p className="text-ink-2 mb-6">Escolha a data que vai virar o contador de dias juntos.</p>
        <form onSubmit={createSpace}>
          <Field label="Data" type="date" required value={date} onChange={(e) => setDate(e.target.value)} />
          <SelectField label="O que essa data representa?" value={label} onChange={(e) => setLabel(e.target.value)}>
            {LABELS.map((l) => <option key={l}>{l}</option>)}
          </SelectField>
          <Btn block type="submit" disabled={!date || saving}>{saving ? 'Criando…' : 'Continuar'}</Btn>
          {error && <p className="text-accent-press text-sm mt-3 text-center">{error}</p>}
        </form>
      </div>
    );
  }

  const shareText = encodeURIComponent(`Criei um espaço pra nós dois no Chamego 💛 Entra aqui: ${invite.url}`);
  return (
    <div>
      <AppHeader title="Convide seu par" />
      <p className="text-ink-2 mb-5">Envie o convite agora ou pule e convide depois nas configurações.</p>
      <RowList className="mb-5">
        <Row icon="link" title={copied ? 'Link copiado!' : 'Copiar link do convite'} sub={invite.url.replace(/^https?:\/\//, '')} onClick={copyLink} />
        <Row icon="whatsapp" title="Enviar pelo WhatsApp" onClick={() => window.open(`https://wa.me/?text=${shareText}`, '_blank')} />
        <Row icon="shield" title="Usar código de pareamento" sub={`Código: ${invite.code}`} right={<span />} />
      </RowList>
      <Btn block variant="ghost" onClick={finish}>Continuar por enquanto</Btn>
      <p className="text-ink-3 text-sm text-center mt-4 flex items-center justify-center gap-1.5">
        <Icon name="clock" size={14} /> Assim que seu par aceitar, o espaço se conecta sozinho.
      </p>
    </div>
  );
}
