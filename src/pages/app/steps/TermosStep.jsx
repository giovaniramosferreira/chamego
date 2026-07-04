import { useState } from 'react';
import { api } from '../../../lib/api.js';
import { useSession } from '../../../lib/session-context.js';
import { Btn, Card, AppHeader } from '../../../ui/kit.jsx';
import Icon from '../../../ui/icons.jsx';

export default function TermosStep({ onDone }) {
  const { refresh } = useSession();
  const [checked, setChecked] = useState(false);
  const [saving, setSaving] = useState(false);

  async function accept() {
    setSaving(true);
    try {
      await api('/api/me', { method: 'PATCH', body: { acceptTerms: true } });
      await refresh();
      onDone();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <AppHeader title="Termos e privacidade" />
      <Card className="mb-6 text-[.9rem] text-ink-2 leading-relaxed max-h-[320px] overflow-y-auto">
        <p className="mb-3"><strong className="text-ink">Seu espaço é privado.</strong> Tudo que vocês registram no Chamego — fotos, listas, conversas — é visível apenas para o casal, nunca para terceiros.</p>
        <p className="mb-3">Você pode exportar ou excluir seus dados a qualquer momento, nas Configurações.</p>
        <p>Ao continuar, você concorda com os Termos de Uso e a Política de Privacidade do Chamego.</p>
      </Card>
      <button onClick={() => setChecked(!checked)} className="w-full flex items-center gap-3 bg-surface rounded-card px-4 py-3.5 mb-6 text-left shadow-[inset_0_0_0_1px_var(--line-2)]">
        <span className={`flex-none w-5 h-5 rounded grid place-items-center transition-colors ${checked ? 'bg-accent text-accent-ink' : 'shadow-[inset_0_0_0_1.5px_var(--line-2)]'}`}>
          {checked && <Icon name="check" size={12} />}
        </span>
        <span className="text-[.92rem] font-medium">Li e aceito os termos e a política de privacidade</span>
      </button>
      <Btn block disabled={!checked || saving} onClick={accept}>Continuar</Btn>
    </div>
  );
}
