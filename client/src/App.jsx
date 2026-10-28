import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowDownLeft,
  ArrowRight,
  ArrowUpRight,
  Bell,
  CalendarDays,
  Check,
  CircleHelp,
  CreditCard,
  LayoutDashboard,
  LogOut,
  Menu,
  Plus,
  Search,
  Settings,
  Sparkles,
  Target,
  Trash2,
  TrendingUp,
  Wallet,
  X,
} from 'lucide-react';
import { categoryLabel, languages, localeByLanguage, translate } from './i18n.js';
import { createDemoData } from './demoData.js';

const categories = [
  { id: 'food', label: 'Sakafo', color: '#db8c4c' },
  { id: 'transport', label: 'Fitaterana', color: '#7195d2' },
  { id: 'housing', label: 'Trano', color: '#9885c8' },
  { id: 'study', label: 'Fianarana', color: '#54a891' },
  { id: 'health', label: 'Fahasalamana', color: '#d67879' },
  { id: 'leisure', label: 'Fialam-boly', color: '#d4ae54' },
  { id: 'salary', label: 'Karama', color: '#53a78d' },
  { id: 'other', label: 'Hafa', color: '#87938b' },
];

const currencies = ['MGA', 'EUR', 'USD', 'GBP', 'CAD', 'CHF', 'JPY', 'AUD', 'NZD', 'XOF', 'XAF', 'INR'];
const malagasyMonths = [
  'Janoary',
  'Febroary',
  'Martsa',
  'Aprily',
  'Mey',
  'Jona',
  'Jolay',
  'Aogositra',
  'Septambra',
  'Oktobra',
  'Novambra',
  'Desambra',
];
const currentMonth = new Date().toISOString().slice(0, 7);
const DEMO_ONLY = import.meta.env.VITE_DEMO_ONLY === 'true';

async function api(path, options = {}) {
  const response = await fetch(`/api${path}`, {
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });
  if (response.status === 204) return null;
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    throw new Error('Nahazo valiny tsy JSON ny app. Hamarino fa mandeha ny API ary andramo indray.');
  }

  let body;
  try {
    body = await response.json();
  } catch {
    throw new Error('Nahazo valiny tsy JSON ny app. Hamarino fa mandeha ny API ary andramo indray.');
  }
  if (!response.ok) throw new Error(body.error || 'Nisy olana. Andramo indray.');
  return body;
}

function categoryName(id, language) {
  return categoryLabel(language, id);
}

function formatMoney(value, currency, language) {
  const locale = language === 'mg' ? 'fr-FR' : localeByLanguage[language];
  const formatted = new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    maximumFractionDigits: currency === 'MGA' || currency === 'JPY' ? 0 : 2,
  }).format(Number(value) || 0);
  if (language === 'mg' && currency === 'MGA') {
    return `${new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(Number(value) || 0)} Ar`;
  }
  return formatted;
}

function formatDate(value, language) {
  if (language === 'mg') {
    const [, month, day] = value.split('-').map(Number);
    return `${day} ${malagasyMonths[month - 1]}`;
  }
  return new Intl.DateTimeFormat(localeByLanguage[language], { day: 'numeric', month: 'short' }).format(
    new Date(`${value}T12:00:00`),
  );
}

function formatMonth(month, language) {
  if (language === 'mg') {
    const [year, monthNumber] = month.split('-').map(Number);
    return `${malagasyMonths[monthNumber - 1]} ${year}`;
  }
  return new Intl.DateTimeFormat(localeByLanguage[language], { month: 'long', year: 'numeric' }).format(
    new Date(`${month}-01T12:00:00`),
  );
}

function monthOffset(month, offset) {
  const date = new Date(`${month}-01T12:00:00`);
  date.setMonth(date.getMonth() + offset);
  return date.toISOString().slice(0, 7);
}

function App() {
  const [language, setLanguage] = useState(() => {
    const saved = window.localStorage.getItem('budgetzen-language');
    return languages.some((option) => option.code === saved) ? saved : 'mg';
  });
  const t = (key, values) => translate(language, key, values);
  const [user, setUser] = useState(null);
  const [demo, setDemo] = useState(DEMO_ONLY);
  const [authLoading, setAuthLoading] = useState(!DEMO_ONLY);
  const [authView, setAuthView] = useState('login');
  const [month, setMonth] = useState(currentMonth);
  const [dashboard, setDashboard] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [activePage, setActivePage] = useState('overview');
  const [modal, setModal] = useState('');
  const [modalError, setModalError] = useState('');
  const [editing, setEditing] = useState(null);
  const [search, setSearch] = useState('');
  const [mobileNav, setMobileNav] = useState(false);

  const currency = user?.currency || 'MGA';
  useEffect(() => {
    window.localStorage.setItem('budgetzen-language', language);
    document.documentElement.lang = language;
    document.title = translate(language, 'BudgetZen — Fitantanam-bola');
    document.querySelector('meta[name="description"]')?.setAttribute(
      'content',
      translate(language, 'BudgetZen — tantano amin’ny fomba tsotra ny volanao.'),
    );
  }, [language]);
  const refresh = useCallback(async () => {
    if (demo) {
      if (DEMO_ONLY) {
        const data = createDemoData(month);
        setDashboard(data);
        setTransactions(data.transactions);
        setError('');
        return;
      }
      setLoading(true);
      try {
        const data = await api(`/demo?month=${month}`);
        setDashboard(data);
        setTransactions(data.transactions);
      } catch (loadError) {
        setError(t(loadError.message));
      } finally {
        setLoading(false);
      }
      return;
    }
    if (!user) return;
    setLoading(true);
    try {
      const [overview, list] = await Promise.all([
        api(`/dashboard?month=${month}`),
        api(`/transactions?month=${month}`),
      ]);
      setDashboard(overview);
      setTransactions(list.transactions);
      setError('');
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setLoading(false);
    }
  }, [demo, month, user, language]);

  useEffect(() => {
    if (DEMO_ONLY) return;
    api('/auth/me')
      .then(({ user: currentUser }) => setUser(currentUser))
      .catch(() => {})
      .finally(() => setAuthLoading(false));
  }, []);

  useEffect(() => {
    if (user || demo) refresh();
  }, [user, demo, refresh]);

  const filteredTransactions = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return transactions;
    return transactions.filter(
      (transaction) =>
        transaction.note.toLowerCase().includes(query) ||
        categoryName(transaction.category, language).toLowerCase().includes(query),
    );
  }, [transactions, search, language]);

  async function submitAuth(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setError('');
    setLoading(true);
    try {
      const body = {
        email: form.get('email'),
        password: form.get('password'),
      };
      if (authView === 'register') {
        body.name = form.get('name');
        body.currency = form.get('currency');
      }
      const result = await api(`/auth/${authView}`, {
        method: 'POST',
        body: JSON.stringify(body),
      });
      setUser(result.user);
      setDemo(false);
    } catch (authError) {
      setError(t(authError.message));
    } finally {
      setLoading(false);
    }
  }

  async function logout() {
    try {
      await api('/auth/logout', { method: 'POST' });
      setUser(null);
      setDashboard(null);
      setTransactions([]);
      setActivePage('overview');
    } catch (logoutError) {
      setError(t(logoutError.message));
    }
  }

  function startDemo() {
    setUser(null);
    setDemo(true);
    setError('');
    setActivePage('overview');
  }

  async function saveTransaction(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const body = Object.fromEntries(form.entries());
    body.amount = String(body.amount).replace(',', '.');
    setError('');
    try {
      await api(editing ? `/transactions/${editing.id}` : '/transactions', {
        method: editing ? 'PATCH' : 'POST',
        body: JSON.stringify(body),
      });
      setModal('');
      setEditing(null);
      await refresh();
      setNotice(t(editing ? 'Nohavaozina ny fifanakalozana.' : 'Voatahiry ny fifanakalozana.'));
      window.setTimeout(() => setNotice(''), 2800);
    } catch (saveError) {
      setModalError(t(saveError.message));
    }
  }

  async function deleteTransaction(transaction) {
    if (!window.confirm(t('Fafàna tokoa ve ity fifanakalozana ity?'))) return;
    try {
      await api(`/transactions/${transaction.id}`, { method: 'DELETE' });
      await refresh();
    } catch (deleteError) {
      setError(t(deleteError.message));
    }
  }

  async function saveBudget(event) {
    event.preventDefault();
    const body = Object.fromEntries(new FormData(event.currentTarget).entries());
    body.limitAmount = String(body.limitAmount).replace(',', '.');
    body.month = month;
    try {
      await api('/budgets', { method: 'PUT', body: JSON.stringify(body) });
      setModal('');
      await refresh();
    } catch (budgetError) {
      setModalError(t(budgetError.message));
    }
  }

  async function updateCurrency(event) {
    const nextCurrency = event.target.value;
    if (!window.confirm(t('Ny fanovana vola dia tsy mamadika ny sandan’ny fifanakalozana efa voatahiry. Hanohy ve ianao?'))) {
      event.target.value = currency;
      return;
    }
    try {
      await api('/settings', {
        method: 'PATCH',
        body: JSON.stringify({ currency: nextCurrency }),
      });
      setUser((previous) => ({ ...previous, currency: nextCurrency }));
      setNotice(t('Nohavaozina ny vola ampiasaina.'));
      window.setTimeout(() => setNotice(''), 2800);
    } catch (settingsError) {
      setError(t(settingsError.message));
    }
  }

  async function saveProfile(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const body = Object.fromEntries(new FormData(form).entries());
    try {
      const result = await api('/profile', {
        method: 'PATCH',
        body: JSON.stringify(body),
      });
      setUser((previous) => ({ ...previous, ...result.user }));
      form.reset();
      setNotice(t('Nohavaozina ny mombamomba anao.'));
      window.setTimeout(() => setNotice(''), 2800);
    } catch (profileError) {
      setError(t(profileError.message));
    }
  }

  async function changePassword(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const body = Object.fromEntries(new FormData(form).entries());
    try {
      await api('/auth/change-password', {
        method: 'POST',
        body: JSON.stringify(body),
      });
      form.reset();
      setNotice(t('Nohavaozina ny tenimiafina.'));
      window.setTimeout(() => setNotice(''), 2800);
    } catch (passwordError) {
      setError(t(passwordError.message));
    }
  }

  if (authLoading) {
    return <div className="loading-screen"><div className="brand-mark"><Wallet size={22} /></div><span>{t('Manokatra BudgetZen...')}</span></div>;
  }

  if (!user && !demo) {
    return (
      <AuthScreen
        view={authView}
        setView={(view) => { setError(''); setAuthView(view); }}
        onSubmit={submitAuth}
        onDemo={startDemo}
        loading={loading}
        error={error}
        language={language}
        setLanguage={setLanguage}
        t={t}
      />
    );
  }

  const totals = dashboard?.totals || { income: 0, expenses: 0 };
  const balance = Number(totals.income) - Number(totals.expenses);

  return (
    <div className={`app-shell ${mobileNav ? 'nav-open' : ''}`}>
      {mobileNav && <button className="mobile-backdrop" onClick={() => setMobileNav(false)} aria-label={t('Akatona ny menu')} />}
      <aside className="sidebar">
        <a className="brand" href="#" onClick={(event) => { event.preventDefault(); setActivePage('overview'); }}>
          <span className="brand-mark"><Wallet size={22} strokeWidth={2.2} /></span>
          <span>budget<span className="brand-accent">zen</span><small>{t('FITANTANAM-BOLA')}</small></span>
        </a>
        <div className="side-label">{t('MENU')}</div>
        <nav className="side-nav" aria-label={t('MENU')}>
          <button className={activePage === 'overview' ? 'nav-link active' : 'nav-link'} onClick={() => { setActivePage('overview'); setMobileNav(false); }}>
            <LayoutDashboard size={18} /> {t('Topy maso')}
          </button>
          <button className={activePage === 'transactions' ? 'nav-link active' : 'nav-link'} onClick={() => { setActivePage('transactions'); setMobileNav(false); }}>
            <CreditCard size={18} /> {t('Fifanakalozana')}
          </button>
          <button className={activePage === 'budgets' ? 'nav-link active' : 'nav-link'} onClick={() => { setActivePage('budgets'); setMobileNav(false); }}>
            <Target size={18} /> {t('Teti-bola')}
          </button>
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-tip">
            <span className="tip-icon"><Sparkles size={16} /></span>
            <strong>{t('Ny dingana kely dia zava-dehibe.')}</strong>
            <p>{t('Jereo tsy tapaka ny fandanianao mba hanatratrarana ny tanjonao.')}</p>
          </div>
          <div className="profile-card">
            <div className="avatar">{(user?.name || 'Demo').slice(0, 1).toUpperCase()}</div>
            <div className="profile-info"><strong>{user?.name || 'Demo'}</strong><span>{demo ? t('Kaonty andrana') : user?.email}</span></div>
            {user && <button className="icon-button profile-action" onClick={logout} title={t('Hivoaka')} aria-label={t('Hivoaka')}><LogOut size={17} /></button>}
          </div>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <button className="icon-button mobile-menu" onClick={() => setMobileNav(true)} aria-label={t('Sokafy ny menu')}><Menu size={20} /></button>
          <div className="breadcrumb">{t('Pejy')} <span>/</span> <strong>{t(activePage === 'overview' ? 'Topy maso' : activePage === 'transactions' ? 'Fifanakalozana' : activePage === 'budgets' ? 'Teti-bola' : 'Fikirana')}</strong></div>
          <div className="topbar-actions">
            {demo && <span className="demo-badge"><span /> DEMO</span>}
            <LanguageSelector language={language} setLanguage={setLanguage} />
            <button className="icon-button notification-button" aria-label={t('Fampandrenesana')}><Bell size={18} /><i /></button>
            <button className="settings-button" onClick={() => setActivePage('settings')}><Settings size={17} /><span>{t('Fikirana')}</span></button>
          </div>
        </header>

        <div className="page-wrap">
          {error && <div className="alert error-alert" role="alert">{error}<button onClick={() => setError('')} aria-label={t('Hidio')}><X size={16} /></button></div>}
          {notice && <div className="alert success-alert" role="status"><Check size={17} />{notice}</div>}
          {demo && <div className="demo-banner"><Sparkles size={17} /><span><strong>{t('Mode démo.')}</strong> {t('Ireo tarehimarika aseho dia santionany noforonina, ary tsy azo ovaina.')}</span>{!DEMO_ONLY && <button onClick={() => { setDemo(false); setDashboard(null); setTransactions([]); }}>{t('Hiditra / Hanokatra kaonty')} <ArrowRight size={15} /></button>}</div>}

          {activePage === 'overview' && (
            <Overview
              dashboard={dashboard}
              month={month}
              setMonth={setMonth}
              currency={currency}
              onAdd={() => { setEditing(null); setModalError(''); setModal('transaction'); }}
              onBudgets={() => setActivePage('budgets')}
              loading={loading}
              language={language}
              t={t}
            />
          )}
          {activePage === 'transactions' && (
            <TransactionsPage
              transactions={filteredTransactions}
              currency={currency}
              month={month}
              setMonth={setMonth}
              search={search}
              setSearch={setSearch}
              demo={demo}
              onAdd={() => { setEditing(null); setModalError(''); setModal('transaction'); }}
              onEdit={(transaction) => { setEditing(transaction); setModalError(''); setModal('transaction'); }}
              onDelete={deleteTransaction}
              language={language}
              t={t}
            />
          )}
          {activePage === 'budgets' && (
            <BudgetsPage
              budgets={dashboard?.budgets || []}
              currency={currency}
              month={month}
              setMonth={setMonth}
              demo={demo}
              onAdd={() => { setModalError(''); setModal('budget'); }}
              language={language}
              t={t}
            />
          )}
          {activePage === 'settings' && (
            <SettingsPage user={user} currency={currency} updateCurrency={updateCurrency} demo={demo} language={language} t={t} onSaveProfile={saveProfile} onChangePassword={changePassword} />
          )}
        </div>
      </main>

      {modal === 'transaction' && !demo && <TransactionModal onClose={() => { setModal(''); setEditing(null); }} onSubmit={saveTransaction} initial={editing} error={modalError} t={t} language={language} />}
      {modal === 'budget' && !demo && <BudgetModal onClose={() => setModal('')} onSubmit={saveBudget} error={modalError} t={t} language={language} />}
    </div>
  );
}

function AuthScreen({ view, setView, onSubmit, onDemo, loading, error, language, setLanguage, t }) {
  const isRegister = view === 'register';
  const [passwordMismatch, setPasswordMismatch] = useState(false);

  function validatePasswordConfirmation(event) {
    const form = event.currentTarget.form;
    if (!form || !isRegister) return;
    const password = form.elements.password.value;
    const confirmation = form.elements.confirmPassword.value;
    const mismatch = confirmation.length > 0 && password !== confirmation;
    setPasswordMismatch(mismatch);
    form.elements.confirmPassword.setCustomValidity(mismatch ? t('Tsy mitovy ny tenimiafina roa.') : '');
  }

  function handleSubmit(event) {
    if (isRegister) {
      validatePasswordConfirmation({ currentTarget: { form: event.currentTarget } });
      if (!event.currentTarget.reportValidity()) {
        event.preventDefault();
        return;
      }
    }
    onSubmit(event);
  }

  return (
    <div className="auth-page">
      <div className="auth-visual">
        <a className="brand auth-brand" href="#"><span className="brand-mark"><Wallet size={22} /></span><span>budget<span className="brand-accent">zen</span></span></a>
        <div className="auth-hero-copy">
          <span className="eyebrow"><span /> {t('Fitantanana vola tsotra')}</span>
          <h1>{t('Fantaro izay alehan’ny volanao.')}</h1>
          <p>{t('Fanaraha-maso tsotra sy milamina, hanampy anao hanatratra ny tanjonao ara-bola.')}</p>
          <div className="auth-preview">
            <div className="preview-top"><span>{t('Fandaniana tamin’ity volana ity')}</span><span className="preview-dot" /></div>
            <strong>169 000 <small>Ar</small></strong>
            <div className="preview-bars"><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /></div>
            <div className="preview-foot"><span>{t('Volana teo aloha')}</span><b><TrendingUp size={14} /> 8.4%</b></div>
          </div>
        </div>
        <div className="auth-visual-foot"><span>© 2026 BudgetZen</span><span>{t('Tsotra. Mazava. Milamina.')}</span></div>
      </div>
      <div className="auth-form-side">
        <div className="auth-form-wrap">
          <div className="auth-language"><LanguageSelector language={language} setLanguage={setLanguage} /></div>
          <div className="auth-mobile-brand"><span className="brand-mark"><Wallet size={20} /></span> budget<span className="brand-accent">zen</span></div>
          <div className="auth-heading">
            <span className="eyebrow">{t('Mankasitraka anao eto')}</span>
            <h2>{t(isRegister ? 'Mamoròna kaonty' : 'Tongasoa indray')}</h2>
            <p>{t(isRegister ? 'Atombohy anio ny fitantanana ny volanao.' : 'Midira ao amin’ny kaontinao mba hanohizana.')}</p>
          </div>
          <form className="auth-form" onSubmit={handleSubmit}>
            {isRegister && <label>{t('Anarana feno')}<input name="name" placeholder={t('Ohatra: Soa Rakoto')} autoComplete="name" minLength="2" maxLength="80" required /></label>}
            <label>{t('Adiresy mailaka')}<input name="email" type="email" placeholder="name@example.com" autoComplete="email" maxLength="254" required /></label>
            <label>{t('Tenimiafina')}<input name="password" type="password" placeholder={t(isRegister ? 'Farafahakeliny litera 10' : 'Ampidiro ny tenimiafinao')} autoComplete={isRegister ? 'new-password' : 'current-password'} minLength={isRegister ? 10 : 1} maxLength="72" required onChange={validatePasswordConfirmation} /></label>
            {isRegister && <label>{t('Hamarino ny tenimiafina')}<input name="confirmPassword" type="password" placeholder={t('Ampidiro indray ny tenimiafinao')} autoComplete="new-password" minLength="10" maxLength="72" required aria-invalid={passwordMismatch} aria-describedby={passwordMismatch ? 'password-mismatch-error' : undefined} onChange={validatePasswordConfirmation} /></label>}
            {passwordMismatch && <div className="auth-error" id="password-mismatch-error" role="alert">{t('Tsy mitovy ny tenimiafina roa.')}</div>}
            {isRegister && <label>{t('Vola ampiasaina')}
              <select name="currency" defaultValue="MGA">{currencies.map((code) => <option value={code} key={code}>{code} — {new Intl.DisplayNames([localeByLanguage[language]], { type: 'currency' }).of(code)}</option>)}</select>
            </label>}
            {error && <div className="auth-error" role="alert">{error}</div>}
            <button className="primary-button auth-submit" disabled={loading}>{t(loading ? 'Miandry kely...' : isRegister ? 'Mamoròna kaonty' : 'Hiditra')} <ArrowRight size={17} /></button>
          </form>
          <div className="auth-switch">{t(isRegister ? 'Efa manana kaonty?' : 'Mbola tsy manana kaonty?')} <button onClick={() => setView(isRegister ? 'login' : 'register')}>{t(isRegister ? 'Hiditra' : 'Hisoratra anarana')}</button></div>
          <div className="auth-divider"><span>{t('NA')}</span></div>
          <button className="demo-entry" onClick={onDemo}><span className="demo-entry-icon"><Sparkles size={17} /></span><span><strong>{t('Andramo ny demo')}</strong><small>{t('Jereo ny app, tsy mila kaonty')}</small></span><ArrowRight size={17} /></button>
          <p className="privacy-note"><CircleHelp size={14} /> {t('Tsy mampifandray amin’ny banky ity app ity.')}</p>
        </div>
      </div>
    </div>
  );
}

function Overview({ dashboard, month, setMonth, currency, onAdd, onBudgets, loading, language, t }) {
  const income = Number(dashboard?.totals?.income || 0);
  const expenses = Number(dashboard?.totals?.expenses || 0);
  const balance = income - expenses;
  const maxCategory = Math.max(...(dashboard?.expensesByCategory || []).map((item) => Number(item.amount)), 1);
  return (
    <>
      <div className="page-heading heading-row">
        <div><span className="eyebrow">{t('FITANTANAM-BOLA')}</span><h1>{t('Topy maso')}</h1><p>{t('Indro ny toetry ny volanao amin’ity volana ity.')}</p></div>
        <button className="primary-button" onClick={onAdd}><Plus size={18} /> {t('Hampiditra vola')}</button>
      </div>
      <MonthPicker month={month} setMonth={setMonth} language={language} t={t} />
      {loading && !dashboard ? <LoadingBlock t={t} /> : (
        <>
          <section className="stats-grid">
            <article className="stat-card balance-card">
              <div className="stat-top"><span>{t('Vola sisa')}</span><span className="stat-icon balance-icon"><Wallet size={17} /></span></div>
              <strong className="stat-value">{formatMoney(balance, currency, language)}</strong>
              <span className="stat-caption"><span className="positive-dot" /> {t('Ny fifandanjan’ny volanao')}</span>
              <div className="balance-decoration"><i /><i /><i /><i /><i /><i /></div>
            </article>
            <article className="stat-card">
              <div className="stat-top"><span>{t('Vola miditra')}</span><span className="stat-icon income-icon"><ArrowDownLeft size={17} /></span></div>
              <strong className="stat-value">{formatMoney(income, currency, language)}</strong>
              <span className="stat-caption">{language === 'mg' ? 'Tamin’ny' : language === 'fr' ? 'En' : 'In'} {formatMonth(month, language)}</span>
            </article>
            <article className="stat-card">
              <div className="stat-top"><span>{t('Vola mivoaka')}</span><span className="stat-icon expense-icon"><ArrowUpRight size={17} /></span></div>
              <strong className="stat-value">{formatMoney(expenses, currency, language)}</strong>
              <span className="stat-caption">{language === 'mg' ? 'Tamin’ny' : language === 'fr' ? 'En' : 'In'} {formatMonth(month, language)}</span>
            </article>
          </section>

          <section className="content-grid">
            <article className="panel expense-panel">
              <div className="panel-header"><div><h2>{t('Fandaniana araka ny sokajy')}</h2><p>{t('Ny fizaran’ny vola nivoaka')}</p></div><span className="panel-icon"><TrendingUp size={17} /></span></div>
              {dashboard?.expensesByCategory?.length ? (
                <div className="category-chart">
                  <div className="chart-bars">
                    {dashboard.expensesByCategory.slice(0, 6).map((item, index) => {
                      const category = categories.find((entry) => entry.id === item.category) || categories[7];
                      return <div className="chart-column" key={item.category}>
                        <div className="bar-track"><div className="bar-fill" style={{ height: `${Math.max(7, Number(item.amount) / maxCategory * 100)}%`, background: category.color }} /></div>
                        <span className="bar-label">{categoryName(category.id, language)}</span>
                      </div>;
                    })}
                  </div>
                  <div className="chart-total"><span>{t('Totalin’ny fandaniana')}</span><strong>{formatMoney(expenses, currency, language)}</strong></div>
                </div>
              ) : <EmptyState icon={<TrendingUp size={22} />} text={t('Tsy mbola misy fandaniana amin’ity volana ity.')} />}
            </article>
            <article className="panel budget-panel">
              <div className="panel-header"><div><h2>{t('Teti-bola')}</h2><p>{t('Fanaraha-maso ny fetra napetrakao')}</p></div><button className="text-button" onClick={onBudgets}>{t('Hijery azy')} <ArrowRight size={14} /></button></div>
              {dashboard?.budgets?.length ? <div className="budget-list">
                {dashboard.budgets.slice(0, 3).map((budget) => {
                  const amount = Number(budget.spent);
                  const limit = Number(budget.limitAmount);
                  const percent = limit ? Math.min(amount / limit * 100, 100) : 0;
                  return <div className="budget-item" key={budget.category}>
                    <div className="budget-item-heading"><span className={`category-dot dot-${budget.category}`} /> <strong>{categoryName(budget.category, language)}</strong><span>{formatMoney(amount, currency, language)} <small>/ {formatMoney(limit, currency, language)}</small></span></div>
                    <div className="progress-track"><div className={`progress-fill ${percent > 85 ? 'progress-warning' : ''}`} style={{ width: `${percent}%` }} /></div>
                  </div>;
                })}
              </div> : <EmptyState icon={<Target size={22} />} text={t('Mametraha fetra isam-bolana ho an’ny fandanianao.')} />}
            </article>
          </section>

          <section className="panel recent-panel">
            <div className="panel-header"><div><h2>{t('Fifanakalozana farany')}</h2><p>{t('Ny hetsika farany tamin’ity volana ity')}</p></div><span className="recent-count">{dashboard?.recent?.length || 0} {t('hetsika')}</span></div>
            <TransactionTable transactions={dashboard?.recent || []} currency={currency} language={language} t={t} />
          </section>
        </>
      )}
    </>
  );
}

function TransactionsPage({ transactions, currency, month, setMonth, search, setSearch, demo, onAdd, onEdit, onDelete, language, t }) {
  return <>
    <div className="page-heading heading-row">
      <div><span className="eyebrow">{t('FANARAHA-MASO')}</span><h1>{t('Fifanakalozana')}</h1><p>{t('Jereo sy tantano ny vola miditra sy mivoaka.')}</p></div>
      {!demo && <button className="primary-button" onClick={onAdd}><Plus size={18} /> {t('Hampiditra vola')}</button>}
    </div>
    <div className="table-toolbar"><MonthPicker month={month} setMonth={setMonth} language={language} t={t} /><label className="search-field"><Search size={17} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={t('Mitady fifanakalozana...')} /></label></div>
    <section className="panel transaction-page-panel">
      <div className="panel-header"><div><h2>{t('Ny fifanakalozana rehetra')}</h2><p>{transactions.length} {t('hetsika')} {t('tamin’ny')} {formatMonth(month, language)}</p></div></div>
      <TransactionTable transactions={transactions} currency={currency} language={language} t={t} editable={!demo} onEdit={onEdit} onDelete={onDelete} />
    </section>
  </>;
}

function BudgetsPage({ budgets, currency, month, setMonth, demo, onAdd, language, t }) {
  return <>
    <div className="page-heading heading-row">
      <div><span className="eyebrow">{t('TANJONA ARA-BOLA')}</span><h1>{t('Teti-bola')}</h1><p>{t('Farito mialoha ny vola tianao holaniana isam-bolana.')}</p></div>
      {!demo && <button className="primary-button" onClick={onAdd}><Plus size={18} /> {t('Mametraha fetra')}</button>}
    </div>
    <MonthPicker month={month} setMonth={setMonth} language={language} t={t} />
    <section className="panel budget-page-panel">
      <div className="panel-header"><div><h2>{t('Fetra isam-bolana')}</h2><p>{formatMonth(month, language)}</p></div><span className="panel-icon"><Target size={18} /></span></div>
      {budgets.length ? <div className="budget-cards">{budgets.map((budget) => {
        const spent = Number(budget.spent);
        const limit = Number(budget.limitAmount);
        const percent = limit ? Math.min(spent / limit * 100, 100) : 0;
        const category = categories.find((entry) => entry.id === budget.category) || categories[7];
        return <article className="budget-card" key={budget.category}>
          <div className="budget-card-top"><span className="category-icon" style={{ color: category.color, background: `${category.color}18` }}><Target size={17} /></span><span className={`budget-status ${percent > 85 ? 'status-warning' : ''}`}>{t(percent > 85 ? 'Manakaiky ny fetra' : 'Mandeha tsara')}</span></div>
          <h3>{categoryName(category.id, language)}</h3>
          <p><strong>{formatMoney(spent, currency, language)}</strong> <span>{t('amin’ny')} {formatMoney(limit, currency, language)}</span></p>
          <div className="progress-track"><div className={`progress-fill ${percent > 85 ? 'progress-warning' : ''}`} style={{ width: `${percent}%` }} /></div>
          <small>{Math.round(percent)}% {t('no efa lany')}</small>
        </article>;
      })}</div> : <EmptyState icon={<Target size={22} />} text={t('Tsy mbola misy teti-bola amin’ity volana ity.')} />}
      {!demo && budgets.length > 0 && <button className="secondary-button budget-add-inline" onClick={onAdd}><Plus size={17} /> {t('Manampy teti-bola')}</button>}
    </section>
  </>;
}

function SettingsPage({ user, currency, updateCurrency, demo, language, t, onSaveProfile, onChangePassword }) {
  const [passwordMismatch, setPasswordMismatch] = useState(false);

  function validatePasswordChange(event) {
    const form = event.currentTarget.form;
    if (!form) return;
    const newPassword = form.elements.newPassword.value;
    const confirmation = form.elements.confirmPassword.value;
    const mismatch = confirmation.length > 0 && newPassword !== confirmation;
    setPasswordMismatch(mismatch);
    form.elements.confirmPassword.setCustomValidity(mismatch ? t('Tsy mitovy ny tenimiafina roa.') : '');
  }

  function submitPasswordChange(event) {
    validatePasswordChange({ currentTarget: { form: event.currentTarget } });
    if (!event.currentTarget.reportValidity()) {
      event.preventDefault();
      return;
    }
    onChangePassword(event);
  }

  return <>
    <div className="page-heading"><span className="eyebrow">{t('KAONTINAO')}</span><h1>{t('Fikirana')}</h1><p>{t('Amboary araka izay ilainao ny BudgetZen.')}</p></div>
    <section className="panel settings-panel">
      {!demo && <>
        <div className="settings-section-head"><span className="settings-icon"><CircleHelp size={18} /></span><div><h2>{t('Mombamomba')}</h2><p>{t('Jereo sy ovao ny anaranao sy ny adiresy mailakao.')}</p></div></div>
        <form className="account-form" onSubmit={onSaveProfile}>
          <label>{t('Anarana feno')}<input name="name" autoComplete="name" minLength="2" maxLength="80" defaultValue={user?.name || ''} required /></label>
          <label>{t('Adiresy mailaka')}<input name="email" type="email" autoComplete="email" maxLength="254" defaultValue={user?.email || ''} required /></label>
          <label>{t('Tenimiafina ankehitriny')}<input name="currentPassword" type="password" autoComplete="current-password" maxLength="72" required /></label>
          <button className="primary-button" type="submit"><Check size={16} /> {t('Tehirizo ny mombamomba')}</button>
        </form>
        <div className="settings-divider" />
        <div className="settings-section-head"><span className="settings-icon"><Settings size={18} /></span><div><h2>{t('Hanova tenimiafina')}</h2><p>{t('Ampidiro ny tenimiafinao ankehitriny mba hametrahana tenimiafina vaovao.')}</p></div></div>
        <form className="account-form" onSubmit={submitPasswordChange}>
          <label>{t('Tenimiafina ankehitriny')}<input name="currentPassword" type="password" autoComplete="current-password" maxLength="72" required /></label>
          <label>{t('Tenimiafina vaovao')}<input name="newPassword" type="password" autoComplete="new-password" minLength="10" maxLength="72" required onChange={validatePasswordChange} /></label>
          <label>{t('Hamarino ny tenimiafina')}<input name="confirmPassword" type="password" autoComplete="new-password" minLength="10" maxLength="72" required aria-invalid={passwordMismatch} aria-describedby={passwordMismatch ? 'settings-password-mismatch' : undefined} onChange={validatePasswordChange} /></label>
          {passwordMismatch && <div className="auth-error" id="settings-password-mismatch" role="alert">{t('Tsy mitovy ny tenimiafina roa.')}</div>}
          <button className="primary-button" type="submit"><Check size={16} /> {t('Hanavao tenimiafina')}</button>
        </form>
        <div className="settings-divider" />
      </>}
      <div className="settings-section-head"><span className="settings-icon"><Wallet size={18} /></span><div><h2>{t('Vola ampiasaina')}</h2><p>{t('Mitovy ny vola ampiasaina amin’ny fifanakalozana rehetra. Tsy mamadika ny sandan’ny vola taloha ny fanovana azy.')}</p></div></div>
      <label className="settings-select-label">{t('Safidio ny vola')}
        <select value={currency} disabled={demo} onChange={updateCurrency}>{currencies.map((code) => <option value={code} key={code}>{code} — {new Intl.DisplayNames([localeByLanguage[language]], { type: 'currency' }).of(code)}</option>)}</select>
      </label>
      <div className="settings-divider" />
      <div className="settings-section-head"><span className="settings-icon"><CircleHelp size={18} /></span><div><h2>{t('Kaonty sy tsiambaratelo')}</h2><p>{demo ? t('Mampiasa angona foronina amin’ny demo ianao.') : t('Miditra amin’ny maha {email} anao.', { email: user?.email })}</p></div></div>
      <p className="privacy-callout">{t('Tsy mifandray amin’ny kaonty banky i BudgetZen. Aza mampiditra tenimiafina na antsipirian-kaonty banky.')}</p>
    </section>
  </>;
}

function TransactionTable({ transactions, currency, language, t, editable = false, onEdit, onDelete }) {
  if (!transactions.length) return <EmptyState icon={<CreditCard size={22} />} text={t('Tsy mbola misy fifanakalozana aseho.')} />;
  return <div className="table-scroll"><table className="transactions-table">
    <thead><tr><th>{t('FIFANAKALOZANA')}</th><th>{t('SOKAJY')}</th><th>{t('DATY')}</th><th>{t('VOLA')}</th>{editable && <th />}</tr></thead>
    <tbody>{transactions.map((transaction) => <tr key={transaction.id}>
      <td><div className="transaction-name"><span className={`transaction-type-icon ${transaction.type}`} >{transaction.type === 'income' ? <ArrowDownLeft size={16} /> : <ArrowUpRight size={16} />}</span><span><strong>{t(transaction.note) || categoryName(transaction.category, language)}</strong><small>{t(transaction.type === 'income' ? 'Vola miditra' : 'Vola mivoaka')}</small></span></div></td>
      <td><span className="category-pill"><span className={`category-dot dot-${transaction.category}`} />{categoryName(transaction.category, language)}</span></td>
      <td className="date-cell">{formatDate(transaction.date, language)}</td>
      <td className={`amount-cell ${transaction.type}`}>{transaction.type === 'income' ? '+' : '−'}{formatMoney(transaction.amount, currency, language)}</td>
      {editable && <td><div className="row-actions"><button title={t('Hanova')} aria-label={t('Hanova')} onClick={() => onEdit(transaction)}><Settings size={15} /></button><button title={t('Hamafa')} aria-label={t('Hamafa')} onClick={() => onDelete(transaction)}><Trash2 size={15} /></button></div></td>}
    </tr>)}</tbody>
  </table></div>;
}

function MonthPicker({ month, setMonth, language, t }) {
  return <div className="month-picker"><button onClick={() => setMonth(monthOffset(month, -1))} aria-label={t('Volana teo aloha')}>‹</button><CalendarDays size={16} /><span>{formatMonth(month, language)}</span><button onClick={() => setMonth(monthOffset(month, 1))} aria-label={t('Volana manaraka')}>›</button></div>;
}

function EmptyState({ icon, text }) {
  return <div className="empty-state"><span>{icon}</span><p>{text}</p></div>;
}

function LoadingBlock({ t }) {
  return <div className="loading-block"><span className="spinner" /> {t('Mampiditra ny angona...')}</div>;
}

function TransactionModal({ onClose, onSubmit, initial, error, t, language }) {
  const [type, setType] = useState(initial?.type || 'expense');
  const [category, setCategory] = useState(initial?.category || (type === 'income' ? 'salary' : 'food'));
  return <Modal title={t(initial ? 'Hanova fifanakalozana' : 'Fifanakalozana vaovao')} onClose={onClose} error={error} t={t}>
    <form className="modal-form" onSubmit={onSubmit}>
      <div className="type-toggle"><button type="button" className={type === 'expense' ? 'selected expense-selected' : ''} onClick={() => { setType('expense'); if (category === 'salary') setCategory('food'); }}><ArrowUpRight size={16} /> {t('Vola mivoaka')}</button><button type="button" className={type === 'income' ? 'selected income-selected' : ''} onClick={() => { setType('income'); if (!['salary', 'other'].includes(category)) setCategory('salary'); }}><ArrowDownLeft size={16} /> {t('Vola miditra')}</button></div>
      <input type="hidden" name="type" value={type} />
      <label>{t('VOLA')}<input name="amount" type="number" step="any" min="0.0001" max="999999999999" placeholder="0" defaultValue={initial?.amount || ''} required autoFocus /></label>
      <label>{t('SOKAJY')}<select name="category" value={category} onChange={(event) => setCategory(event.target.value)}>{categories.filter((entry) => type === 'income' ? ['salary', 'other'].includes(entry.id) : entry.id !== 'salary').map((entry) => <option value={entry.id} key={entry.id}>{categoryName(entry.id, language)}</option>)}</select></label>
      <label>{t('DATY')}<input name="date" type="date" defaultValue={initial?.date || new Date().toISOString().slice(0, 10)} required /></label>
      <label>{t('Fanamarihana')} <span className="optional">{t('(tsy voatery)')}</span><input name="note" maxLength="160" placeholder={t('Ohatra: Vidin’ny sakafo atoandro')} defaultValue={initial?.note || ''} /></label>
      <div className="modal-actions"><button className="secondary-button" type="button" onClick={onClose}>{t('Hiverina')}</button><button className="primary-button" type="submit"><Check size={17} /> {t(initial ? 'Tehirizo ny fanovana' : 'Tehirizo')}</button></div>
    </form>
  </Modal>;
}

function BudgetModal({ onClose, onSubmit, error, t, language }) {
  return <Modal title={t('Mametraha teti-bola')} onClose={onClose} error={error} t={t}>
    <form className="modal-form" onSubmit={onSubmit}>
      <label>{t('SOKAJY')}<select name="category" defaultValue="food">{categories.filter((category) => category.id !== 'salary').map((category) => <option value={category.id} key={category.id}>{categoryName(category.id, language)}</option>)}</select></label>
      <label>{t('Fetra isam-bolana')}<input name="limitAmount" type="number" min="0.0001" max="999999999999" step="any" placeholder="0" required autoFocus /></label>
      <p className="form-hint">{t('Hampiharina amin’ny volana voafidy ilay fetra.')}</p>
      <div className="modal-actions"><button className="secondary-button" type="button" onClick={onClose}>{t('Hiverina')}</button><button className="primary-button" type="submit"><Check size={17} /> {t('Tehirizo')}</button></div>
    </form>
  </Modal>;
}

function Modal({ title, onClose, children, error, t }) {
  useEffect(() => {
    function onKeyDown(event) {
      if (event.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  return <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <section className="modal-card" role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <div className="modal-heading"><div><span className="eyebrow">BUDGETZEN</span><h2 id="modal-title">{title}</h2></div><button className="icon-button" onClick={onClose} aria-label={t('Hidio')}><X size={19} /></button></div>
      {error && <div className="auth-error modal-error" role="alert">{error}</div>}
      {children}
    </section>
  </div>;
}

function LanguageSelector({ language, setLanguage }) {
  return <label className="language-selector">
    <span className="sr-only">{translate(language, 'Fiteny')}</span>
    <select value={language} onChange={(event) => setLanguage(event.target.value)} aria-label={translate(language, 'Fiteny')}>
      {languages.map((option) => <option value={option.code} key={option.code}>{option.label}</option>)}
    </select>
  </label>;
}

export default App;
