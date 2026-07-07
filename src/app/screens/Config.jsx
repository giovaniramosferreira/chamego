import I from '../icons';
import { useGo } from '../nav';
import { AppHeader, Row, Tgl, Chev, Chip, Field } from '../ui';

function ConfigHub() {
  const go = useGo();
  return (
    <div className="screen-scroll">
      <AppHeader back title="Configurações" />
      <div className="card mb-lg" style={{ display: 'flex', alignItems: 'center', gap: '.9rem', cursor: 'pointer' }} onClick={() => go('profile')}>
        <div className="avatar" style={{ width: 52, height: 52, fontSize: '1.1rem' }}>M</div>
        <div style={{ flex: 1 }}><div className="r-title" style={{ fontSize: '1.05rem' }}>Mariana Costa</div><div className="r-sub">mariana@email.com</div></div>
        <Chev />
      </div>

      <div className="section-title" style={{ marginTop: 0 }}>Casal</div>
      <div className="row-list mb-md">
        <Row icon="together" title="Perfil do casal" sub="Mari & João" go="couple-profile" right="chev" />
        <Row icon="user" title="Gerenciar parceiro" go="manage-partner" right="chev" />
        <Row icon="gift" title="Assinatura" sub="Plano gratuito" go="paywall" right="chev" />
      </div>

      <div className="section-title">Preferências</div>
      <div className="row-list mb-md">
        <Row icon="bell" title="Notificações" go="notif-settings" right="chev" />
        <Row icon="shield" title="Privacidade e permissões" go="privacy-settings" right="chev" />
        <Row icon="lock" title="Conta, segurança e idioma" go="account-settings" right="chev" />
      </div>

      <div className="section-title">Suporte</div>
      <div className="row-list mb-lg">
        <Row icon="chat" title="Ajuda e suporte" right="chev" />
      </div>
      <button className="btn btn-ghost btn-block" onClick={() => go('welcome')}><I name="logout" size={16} /> Sair da conta</button>
    </div>
  );
}

function Profile() {
  return (
    <div className="screen-scroll">
      <AppHeader back title="Meu perfil" />
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.2rem' }}>
        <div style={{ width: 88, height: 88, borderRadius: '50%', background: 'var(--accent-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-display)', fontSize: '2rem', color: 'var(--accent-press)' }}>M</div>
      </div>
      <Field label="Nome"><input type="text" defaultValue="Mariana Costa" /></Field>
      <Field label="E-mail"><input type="email" defaultValue="mariana@email.com" /></Field>
      <Field label="Telefone"><input type="tel" placeholder="Opcional" /></Field>
      <button className="btn btn-primary btn-block">Salvar alterações</button>
    </div>
  );
}

function CoupleProfile() {
  return (
    <div className="screen-scroll">
      <AppHeader back title="Perfil do casal" />
      <Field label="Nome do espaço"><input type="text" defaultValue="Mari & João" /></Field>
      <Field label="Data principal (contador)"><input type="date" defaultValue="2024-06-22" /></Field>
      <div className="row-list mb-md">
        <Row icon="calendar" title="Integração com calendário" sub="Google Calendar conectado" right={<Tgl initial />} />
        <Row icon="shield" title="Compromissos individuais visíveis" right={<Tgl initial />} />
      </div>
      <button className="btn btn-primary btn-block">Salvar</button>
    </div>
  );
}

function ManagePartner() {
  return (
    <div className="screen-scroll">
      <AppHeader back title="Gerenciar parceiro" />
      <div className="card mb-lg" style={{ display: 'flex', alignItems: 'center', gap: '.9rem' }}>
        <div className="avatar" style={{ width: 46, height: 46 }}>J</div>
        <div style={{ flex: 1 }}><div className="r-title">João Pereira</div><div className="r-sub">Conectado desde jan/2024</div></div>
        <Chip on>Ativo</Chip>
      </div>
      <div className="section-title" style={{ marginTop: 0 }}>Convites</div>
      <div className="row-list mb-lg">
        <Row icon="link" title="Gerar novo convite" go="invite-partner" right="chev" />
      </div>
      <button className="btn btn-ghost btn-block" style={{ color: '#b23b3b' }}><I name="close" size={16} /> Desconectar parceiro</button>
    </div>
  );
}

function NotifSettings() {
  return (
    <div className="screen-scroll">
      <AppHeader back title="Notificações" />
      <div className="row-list mb-md">
        <Row title="Eventos e lembretes" right={<Tgl initial />} />
        <Row title="Tarefas atribuídas a mim" right={<Tgl initial />} />
        <Row title="Mensagens do chat" right={<Tgl initial />} />
        <Row title="Check-in diário" right={<Tgl />} />
        <Row title="Novidades e packs" right={<Tgl />} />
      </div>
    </div>
  );
}

function PrivacySettings() {
  return (
    <div className="screen-scroll">
      <AppHeader back title="Privacidade" />
      <div className="row-list mb-md">
        <Row icon="calendar" title="Acesso ao calendário" right={<Tgl initial />} />
        <Row icon="image" title="Acesso a fotos" right={<Tgl initial />} />
        <Row icon="bell" title="Notificações do sistema" right={<Tgl initial />} />
      </div>
      <p className="muted" style={{ fontSize: '.85rem' }}>Seus dados são visíveis apenas para você e seu par. Nada é compartilhado publicamente.</p>
    </div>
  );
}

function AccountSettings() {
  return (
    <div className="screen-scroll">
      <AppHeader back title="Conta e segurança" />
      <div className="row-list mb-md">
        <Row icon="lock" title="Alterar senha" right="chev" />
        <Row icon="shield" title="Verificação em duas etapas" right={<Tgl />} />
        <Row icon="globe" title="Idioma" sub="Português (Brasil)" right="chev" />
      </div>
      <div className="row-list mb-lg">
        <Row title="Excluir minha conta" sub="Remove todos os dados permanentemente" titleStyle={{ color: '#b23b3b' }} />
      </div>
    </div>
  );
}

export default {
  'config-hub': { component: ConfigHub, hideTabs: true },
  'profile': { component: Profile, hideTabs: true },
  'couple-profile': { component: CoupleProfile, hideTabs: true },
  'manage-partner': { component: ManagePartner, hideTabs: true },
  'notif-settings': { component: NotifSettings, hideTabs: true },
  'privacy-settings': { component: PrivacySettings, hideTabs: true },
  'account-settings': { component: AccountSettings, hideTabs: true },
};
