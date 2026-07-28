import { useEffect, useState } from 'react';
import { Card, Btn, Sheet } from '../ui/kit.jsx';
import Icon from '../ui/icons.jsx';

const DISMISSED = 'chamego:install-dismissed';

const isStandalone = () => window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
const isIOS = () => /iphone|ipad|ipod/i.test(window.navigator.userAgent);

// Convite pra instalar na tela de início: é o que transforma o site em app
// (abre sem barra do navegador e fica junto dos outros ícones).
export default function InstallPrompt() {
  const [deferred, setDeferred] = useState(null);
  // iOS não dispara beforeinstallprompt: lá o caminho é Compartilhar →
  // Adicionar à Tela de Início, então mostramos o passo a passo.
  const [ios] = useState(() => isIOS() && !isStandalone());
  const [howTo, setHowTo] = useState(false);
  const [hidden, setHidden] = useState(() => !!localStorage.getItem(DISMISSED) || isStandalone());

  useEffect(() => {
    if (hidden) return;
    const onPrompt = (e) => { e.preventDefault(); setDeferred(e); };
    window.addEventListener('beforeinstallprompt', onPrompt);
    return () => window.removeEventListener('beforeinstallprompt', onPrompt);
  }, [hidden]);

  function dismiss() {
    localStorage.setItem(DISMISSED, '1');
    setHidden(true);
  }

  async function install() {
    if (!deferred) return setHowTo(true);
    deferred.prompt();
    await deferred.userChoice.catch(() => {});
    setDeferred(null);
    dismiss();
  }

  if (hidden || (!deferred && !ios)) return null;

  return (
    <>
      <Card className="mb-4 flex items-center gap-3.5">
        <span className="flex-none w-9 h-9 rounded-full bg-accent-soft grid place-items-center text-accent-press"><Icon name="heart" size={17} /></span>
        <span className="flex-1">
          <span className="block font-medium text-[.95rem]">Deixe o Chamego na tela de início</span>
          <span className="block text-sm text-ink-2">Abre como app, sem barra de navegador.</span>
        </span>
        <Btn onClick={install} className="!px-4 !py-2 !text-sm">Instalar</Btn>
        <button onClick={dismiss} aria-label="Agora não" className="flex-none text-ink-3 p-1"><Icon name="close" size={16} /></button>
      </Card>

      {howTo && (
        <Sheet title="Adicionar à tela de início" onClose={() => setHowTo(false)}>
          <ol className="text-[.95rem] text-ink-2 space-y-2 mb-5 list-decimal pl-5">
            <li>Toque no botão <strong className="text-ink">Compartilhar</strong> do navegador.</li>
            <li>Escolha <strong className="text-ink">Adicionar à Tela de Início</strong>.</li>
            <li>Confirme — o coração do Chamego aparece junto dos seus apps.</li>
          </ol>
          <Btn block onClick={() => { setHowTo(false); dismiss(); }}>Entendi</Btn>
        </Sheet>
      )}
    </>
  );
}
