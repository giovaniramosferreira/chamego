import { useState } from 'react';
import { api } from '../../../lib/api.js';
import { useSession } from '../../../lib/session-context.js';
import { Btn, Field, SelectField, AppHeader, Chip, Spinner } from '../../../ui/kit.jsx';
import InviteActions from '../../../components/InviteActions.jsx';

const LABELS = ['Início do namoro', 'Primeiro encontro', 'Noivado', 'Casamento', 'Outro'];

// Nome e data numa tela só, com a data opcional: não travar quem não lembra
// a data exata era o que mais segurava gente no meio do caminho.
export default function EspacoSteps({ goal, onDone }) {
  const { user, refresh } = useSession();
  const firstName = (user.name || user.email).split(/[\s@]/)[0];
  const [step, setStep] = useState('espaco'); // espaco | convite
  const [name, setName] = useState(`${firstName} & `);
  const [date, setDate] = useState('');
  const [semData, setSemData] = useState(false);
  const [label, setLabel] = useState(LABELS[0]);
  const [invite, setInvite] = useState(null);
  const [coupleId, setCoupleId] = useState(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function createSpace(e) {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const { couple } = await api('/api/couples', {
        method: 'POST',
        body: { name: name.trim(), milestoneDate: semData ? '' : date, milestoneLabel: label, seed: goal || 'rotina' },
      });
      const { invite: inv } = await api(`/api/couples/${couple.id}/invites`, { method: 'POST' });
      setCoupleId(couple.id);
      setInvite(inv);
      setStep('convite');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function finish() {
    await refresh();
    onDone();
  }

  if (step === 'espaco') {
    return (
      <div>
        <AppHeader title="O espaço de vocês" />
        <p className="text-ink-2 mb-6">Um nome carinhoso e, se quiser, a data que virou o começo de tudo.</p>
        <form onSubmit={createSpace}>
          <Field label="Nome do casal ou espaço" required placeholder="Ex.: Mari & João"
            value={name} onChange={(e) => setName(e.target.value)} autoFocus />

          <div className="flex gap-2 mb-3">
            <Chip active={!semData} onClick={() => setSemData(false)}>Tenho uma data</Chip>
            <Chip active={semData} onClick={() => setSemData(true)}>Escolho depois</Chip>
          </div>
          {!semData && (
            <>
              <Field label="Data do contador" type="date" required value={date} onChange={(e) => setDate(e.target.value)} />
              <SelectField label="O que essa data representa?" value={label} onChange={(e) => setLabel(e.target.value)}>
                {LABELS.map((l) => <option key={l}>{l}</option>)}
              </SelectField>
            </>
          )}

          <Btn block type="submit" disabled={saving || !name.trim() || (!semData && !date)}>
            {saving ? <Spinner /> : 'Criar nosso espaço'}
          </Btn>
          {error && <p className="text-accent-press text-sm mt-3 text-center">{error}</p>}
        </form>
      </div>
    );
  }

  return (
    <div>
      <AppHeader title="Chame seu par" />
      <p className="text-ink-2 mb-5">Um toque e ele(a) entra no mesmo espaço. Dá pra fazer isso depois também.</p>
      <InviteActions invite={invite} coupleId={coupleId} coupleName={name.trim()} />
      <Btn block variant="ghost" className="mt-4" onClick={finish}>Ver meu espaço</Btn>
    </div>
  );
}
