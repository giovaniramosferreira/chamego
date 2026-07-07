import { useState } from 'react';
import I from '../icons';
import { useGo } from '../nav';
import { AppHeader, Choice, ProgressDots, Row, Tgl, Chk, Chev, EmptyState, Field, Chip } from '../ui';
import abraco from '../../assets/app/abraco.png';

function Splash() {
  const go = useGo();
  return (
    <div className="screen-scroll" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', padding: '0 20px', textAlign: 'center', gap: '1.2rem' }}>
      <div style={{ width: 84, height: 84, borderRadius: 26, background: 'var(--accent-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'inset 0 0 0 1px var(--accent-line)' }}>
        <I name="heart" size={38} />
      </div>
      <div className="auth-brand" style={{ margin: 0 }}>
        <div className="logo">chamego<span className="dot">.</span></div>
      </div>
      <p className="muted" style={{ maxWidth: '24ch' }}>a vida a dois, organizada com carinho</p>
      <button className="btn btn-primary" style={{ marginTop: '1.5rem' }} onClick={() => go('welcome')}>Continuar</button>
    </div>
  );
}

function Welcome() {
  const go = useGo();
  return (
    <div className="screen-scroll auth-body">
      <div className="onb-illustration"><img src={abraco} alt="" /></div>
      <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.9rem', marginBottom: '.5rem' }}>Um espaço só de <span className="display-em">vocês dois</span></h1>
      <p className="muted mb-lg">Organize rotina, compromissos, listas e memórias em um lugar privado — e feito para durar.</p>
      <button className="btn btn-primary btn-block mb-sm" onClick={() => go('signup')}>Criar conta</button>
      <button className="btn btn-ghost btn-block" onClick={() => go('login')}>Já tenho conta</button>
    </div>
  );
}

function Login() {
  const go = useGo();
  return (
    <div className="screen-scroll auth-body">
      <AppHeader back />
      <div className="auth-brand"><div className="logo">chamego<span className="dot">.</span></div></div>
      <button className="btn btn-social mb-sm"><I name="apple" size={18} /> Continuar com Apple</button>
      <button className="btn btn-social"><I name="google" size={18} /> Continuar com Google</button>
      <div className="divider-or">ou</div>
      <Field label="E-mail"><input type="email" placeholder="voce@email.com" /></Field>
      <Field label="Senha"><input type="password" placeholder="••••••••" /></Field>
      <p style={{ textAlign: 'right', marginBottom: '1.2rem' }}><a className="link-accent" style={{ fontSize: '.85rem' }} onClick={() => go('forgot')}>Esqueci minha senha</a></p>
      <button className="btn btn-primary btn-block" onClick={() => go('onb-goal')}>Entrar</button>
      <p className="center-note">Não tem conta? <a className="link-accent" onClick={() => go('signup')}>Criar agora</a></p>
    </div>
  );
}

function Signup() {
  const go = useGo();
  return (
    <div className="screen-scroll auth-body">
      <AppHeader back />
      <div className="auth-brand"><div className="logo">chamego<span className="dot">.</span></div></div>
      <button className="btn btn-social mb-sm"><I name="apple" size={18} /> Continuar com Apple</button>
      <button className="btn btn-social"><I name="google" size={18} /> Continuar com Google</button>
      <div className="divider-or">ou crie com e-mail</div>
      <Field label="Nome"><input type="text" placeholder="Seu nome" /></Field>
      <Field label="E-mail"><input type="email" placeholder="voce@email.com" /></Field>
      <Field label="Senha"><input type="password" placeholder="Mínimo 8 caracteres" /></Field>
      <button className="btn btn-primary btn-block" onClick={() => go('terms')}>Criar conta</button>
      <p className="center-note">Já tem conta? <a className="link-accent" onClick={() => go('login')}>Entrar</a></p>
    </div>
  );
}

function Forgot() {
  const go = useGo();
  return (
    <div className="screen-scroll auth-body">
      <AppHeader back title="Recuperar senha" />
      <p className="muted mb-lg">Envie o código de recuperação para o seu e-mail cadastrado.</p>
      <Field label="E-mail"><input type="email" placeholder="voce@email.com" /></Field>
      <button className="btn btn-primary btn-block" onClick={() => go('reset')}>Enviar código</button>
    </div>
  );
}

function Reset() {
  const go = useGo();
  return (
    <div className="screen-scroll auth-body">
      <AppHeader back title="Nova senha" />
      <p className="muted mb-lg">Digite o código enviado e escolha uma nova senha.</p>
      <Field label="Código de 6 dígitos"><input type="text" placeholder="000000" /></Field>
      <Field label="Nova senha"><input type="password" placeholder="Mínimo 8 caracteres" /></Field>
      <button className="btn btn-primary btn-block" onClick={() => go('login')}>Redefinir e entrar</button>
    </div>
  );
}

function Terms() {
  const go = useGo();
  const [accepted, setAccepted] = useState(false);
  return (
    <div className="screen-scroll auth-body">
      <AppHeader back title="Termos e privacidade" />
      <div className="card mb-lg" style={{ fontSize: '.88rem', color: 'var(--ink-2)', lineHeight: 1.7, maxHeight: 320, overflowY: 'auto' }}>
        <p className="mb-sm"><strong style={{ color: 'var(--ink)' }}>Seu espaço é privado.</strong> Tudo que vocês registram no Chamego — fotos, listas, conversas — é visível apenas para o casal, nunca para terceiros.</p>
        <p className="mb-sm">Você pode exportar ou excluir seus dados a qualquer momento, nas Configurações.</p>
        <p>Ao continuar, você concorda com os Termos de Uso e a Política de Privacidade do Chamego.</p>
      </div>
      <div className="row-list mb-lg">
        <div className="row" style={{ cursor: 'pointer' }} onClick={() => setAccepted(!accepted)}>
          <Chk checked={accepted} />
          <div className="r-body"><div className="r-title" style={{ fontWeight: 500, fontSize: '.92rem' }}>Li e aceito os termos e a política de privacidade</div></div>
        </div>
      </div>
      <button className="btn btn-primary btn-block" onClick={() => go('verify')}>Continuar</button>
    </div>
  );
}

function Verify() {
  const go = useGo();
  return (
    <div className="screen-scroll auth-body">
      <AppHeader back title="Verifique seu e-mail" />
      <EmptyState icon="mail" title="Enviamos um código" text="Confira sua caixa de entrada e digite os 6 dígitos abaixo." />
      <Field><input type="text" placeholder="000000" style={{ textAlign: 'center', letterSpacing: '.5em', fontSize: '1.2rem' }} /></Field>
      <button className="btn btn-primary btn-block mb-sm" onClick={() => go('onb-goal')}>Confirmar</button>
      <p className="center-note">Não recebeu? <a className="link-accent">Reenviar código</a></p>
    </div>
  );
}

/* ---------------- onboarding ---------------- */
function OnbGoal() {
  const go = useGo();
  const [goal, setGoal] = useState(null);
  return (
    <div className="screen-scroll auth-body">
      <AppHeader back />
      <ProgressDots step={0} total={4} />
      <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.7rem', marginBottom: '.4rem' }}>O que você mais busca agora?</h1>
      <p className="muted mb-lg">Vamos usar isso pra personalizar seu início.</p>
      <Choice icon="list" title="Organizar a rotina" sub="Tarefas, compras e casa" sel={goal === 'rotina'} onClick={() => setGoal('rotina')} />
      <Choice icon="heart" title="Fortalecer a conexão" sub="Check-ins e momentos" sel={goal === 'conexao'} onClick={() => setGoal('conexao')} />
      <Choice icon="calendar" title="Lembrar datas importantes" sub="Aniversários e eventos" sel={goal === 'datas'} onClick={() => setGoal('datas')} />
      <Choice icon="together" title="Planejar a vida a dois" sub="Metas e objetivos" sel={goal === 'planejar'} onClick={() => setGoal('planejar')} />
      <button className="btn btn-primary btn-block" style={{ marginTop: '1.2rem' }} onClick={() => go('onb-stage')}>Continuar</button>
    </div>
  );
}

function OnbStage() {
  const go = useGo();
  const [stage, setStage] = useState(null);
  return (
    <div className="screen-scroll auth-body">
      <AppHeader back />
      <ProgressDots step={1} total={4} />
      <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.7rem', marginBottom: '.4rem' }}>Em que fase vocês estão?</h1>
      <p className="muted mb-lg">Isso ajusta as sugestões que aparecem pra vocês.</p>
      <Choice icon="home" title="Morando juntos" sel={stage === 'morando'} onClick={() => setStage('morando')} />
      <Choice icon="heart" title="Namorando" sel={stage === 'namorando'} onClick={() => setStage('namorando')} />
      <Choice icon="star" title="Noivos" sel={stage === 'noivos'} onClick={() => setStage('noivos')} />
      <Choice icon="pin" title="À distância" sel={stage === 'distancia'} onClick={() => setStage('distancia')} />
      <Choice icon="together" title="Outro" sel={stage === 'outro'} onClick={() => setStage('outro')} />
      <button className="btn btn-primary btn-block" style={{ marginTop: '1.2rem' }} onClick={() => go('onb-alone')}>Continuar</button>
    </div>
  );
}

function OnbAlone() {
  const go = useGo();
  const [alone, setAlone] = useState(null);
  return (
    <div className="screen-scroll auth-body">
      <AppHeader back />
      <ProgressDots step={2} total={4} />
      <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.7rem', marginBottom: '.4rem' }}>Como quer começar?</h1>
      <p className="muted mb-lg">Você pode usar sozinho(a) agora e convidar seu par depois — sem pressa.</p>
      <Choice icon="user" title="Usar sozinho(a) por enquanto" sub="Convido meu par mais tarde" sel={alone === 'sozinho'} onClick={() => setAlone('sozinho')} />
      <Choice icon="together" title="Convidar meu par agora" sub="Criamos o espaço juntos" sel={alone === 'convidar'} onClick={() => setAlone('convidar')} />
      <button className="btn btn-primary btn-block" style={{ marginTop: '1.2rem' }} onClick={() => go('onb-perm')}>Continuar</button>
    </div>
  );
}

function OnbPerm() {
  const go = useGo();
  return (
    <div className="screen-scroll auth-body">
      <AppHeader back />
      <ProgressDots step={3} total={4} />
      <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.7rem', marginBottom: '.4rem' }}>Só mais três permissões</h1>
      <p className="muted mb-lg">Você pode mudar isso quando quiser, nas configurações.</p>
      <div className="row-list mb-lg">
        <Row icon="bell" title="Notificações" sub="Lembretes de eventos e tarefas" right={<Tgl initial />} />
        <Row icon="calendar" title="Calendário" sub="Sincronizar com seu calendário" right={<Tgl initial />} />
        <Row icon="image" title="Fotos" sub="Adicionar fotos aos momentos" right={<Tgl initial />} />
      </div>
      <button className="btn btn-primary btn-block" onClick={() => go('couple-name')}>Continuar</button>
    </div>
  );
}

/* ---------------- criação do espaço do casal ---------------- */
function CoupleName() {
  const go = useGo();
  return (
    <div className="screen-scroll auth-body">
      <AppHeader back title="Seu espaço" />
      <p className="muted mb-lg">Dê um nome carinhoso ao espaço de vocês.</p>
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.4rem' }}>
        <div style={{ width: 88, height: 88, borderRadius: '50%', background: 'var(--accent-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'inset 0 0 0 1px var(--accent-line)', position: 'relative' }}>
          <I name="camera" size={26} />
          <div style={{ position: 'absolute', bottom: -2, right: -2, width: 28, height: 28, borderRadius: '50%', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 6px rgba(0,0,0,.15)' }}>
            <I name="plus" size={14} stroke="#fff" />
          </div>
        </div>
      </div>
      <Field label="Nome do casal ou espaço"><input type="text" placeholder="Ex.: Mari & João" /></Field>
      <button className="btn btn-primary btn-block" onClick={() => go('couple-date')}>Continuar</button>
    </div>
  );
}

function CoupleDate() {
  const go = useGo();
  return (
    <div className="screen-scroll auth-body">
      <AppHeader back title="Data importante" />
      <p className="muted mb-lg">Escolha a data que vai virar o contador de dias juntos.</p>
      <Field label="Data"><input type="date" defaultValue="2024-06-22" /></Field>
      <Field label="O que essa data representa?">
        <select defaultValue="Primeiro encontro">
          <option>Primeiro encontro</option><option>Início do namoro</option><option>Noivado</option><option>Casamento</option><option>Outro</option>
        </select>
      </Field>
      <button className="btn btn-primary btn-block" onClick={() => go('invite-partner')}>Continuar</button>
    </div>
  );
}

function InvitePartner() {
  const go = useGo();
  return (
    <div className="screen-scroll auth-body">
      <AppHeader back title="Convide seu par" />
      <p className="muted mb-lg">Envie o convite agora ou pule e convide depois nas configurações.</p>
      <div className="row-list mb-md">
        <Row icon="link" title="Copiar link do convite" sub="chamego.app/convite/8f2a" go="partner-pending" right="chev" />
        <Row icon="whatsapp" title="Enviar pelo WhatsApp" go="partner-pending" right="chev" />
        <Row icon="mail" title="Enviar por e-mail" go="partner-pending" right="chev" />
        <Row icon="shield" title="Usar código de pareamento" sub="Código: 8F2A" go="partner-pending" right="chev" />
      </div>
      <button className="btn btn-ghost btn-block" onClick={() => go('home-root')}>Pular por enquanto</button>
    </div>
  );
}

function PartnerPending() {
  const go = useGo();
  return (
    <div className="screen-scroll auth-body" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', paddingTop: '10%' }}>
      <AppHeader back />
      <div className="e-icon" style={{ width: 76, height: 76, marginBottom: '1rem' }}><I name="link" size={30} /></div>
      <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', marginBottom: '.4rem' }}>Convite enviado</h3>
      <p className="muted mb-lg" style={{ maxWidth: '26ch' }}>Assim que seu par aceitar, o espaço de vocês se conecta automaticamente.</p>
      <Chip on className="mb-lg">Aguardando aceite</Chip>
      <button className="btn btn-primary btn-block" onClick={() => go('partner-connected')}>Simular aceite ✦</button>
      <button className="btn btn-ghost btn-block" style={{ marginTop: '.6rem' }} onClick={() => go('home-root')}>Continuar sozinho por agora</button>
    </div>
  );
}

function PartnerConnected() {
  const go = useGo();
  return (
    <div className="screen-scroll auth-body" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', paddingTop: '10%' }}>
      <div className="e-icon" style={{ width: 76, height: 76, marginBottom: '1rem' }}><I name="heart" size={32} /></div>
      <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', marginBottom: '.4rem' }}>Parceiro conectado!</h3>
      <p className="muted mb-lg" style={{ maxWidth: '26ch' }}>A partir de agora, tudo que vocês criarem aparece para os dois.</p>
      <button className="btn btn-primary btn-block" onClick={() => go('home-root')}>Ir para o início</button>
    </div>
  );
}

export default {
  'splash': { component: Splash, hideTabs: true },
  'welcome': { component: Welcome, hideTabs: true },
  'login': { component: Login, hideTabs: true },
  'signup': { component: Signup, hideTabs: true },
  'forgot': { component: Forgot, hideTabs: true },
  'reset': { component: Reset, hideTabs: true },
  'terms': { component: Terms, hideTabs: true },
  'verify': { component: Verify, hideTabs: true },
  'onb-goal': { component: OnbGoal, hideTabs: true },
  'onb-stage': { component: OnbStage, hideTabs: true },
  'onb-alone': { component: OnbAlone, hideTabs: true },
  'onb-perm': { component: OnbPerm, hideTabs: true },
  'couple-name': { component: CoupleName, hideTabs: true },
  'couple-date': { component: CoupleDate, hideTabs: true },
  'invite-partner': { component: InvitePartner, hideTabs: true },
  'partner-pending': { component: PartnerPending, hideTabs: true },
  'partner-connected': { component: PartnerConnected, hideTabs: true },
};
