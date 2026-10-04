import { useEffect, useState, type FormEvent } from 'react';
import { toDataURL } from 'qrcode';
import { ShieldCheck, ShieldOff, Copy, Download } from 'lucide-react';
import { AppLayout } from '../components/AppLayout';
import { toast, getErrorMessage } from '../components/Toast';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';

type Step = 'idle' | 'setup' | 'codes' | 'disable';

/** "ABCD EFGH ..." so the key is easy to type by hand. */
const groupKey = (s: string) => s.replace(/(.{4})/g, '$1 ').trim();

export default function Security() {
  const { user, refreshUser } = useAuth();
  const enabled = !!user?.twoFactorEnabled;
  const [step, setStep] = useState<Step>('idle');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [secret, setSecret] = useState('');
  const [qr, setQr] = useState('');
  const [code, setCode] = useState('');
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [saved, setSaved] = useState(false);
  const [password, setPassword] = useState('');

  useEffect(() => {
    if (!secret || !user) return;
    const url = `otpauth://totp/${encodeURIComponent(`OrbitPM:${user.email}`)}?secret=${secret}&issuer=OrbitPM&algorithm=SHA1&digits=6&period=30`;
    // Drawn in the browser: the secret is never sent to a third-party QR service.
    toDataURL(url, { margin: 1, width: 192 }).then(setQr);
  }, [secret, user]);

  function reset(next: Step = 'idle') {
    setStep(next);
    setError(null);
    setCode('');
    setPassword('');
    setSecret('');
    setQr('');
  }

  async function startSetup() {
    setBusy(true);
    setError(null);
    try {
      const res = await api.post('/auth/2fa/setup');
      setSecret(res.data.data.secret);
      setStep('setup');
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function confirmEnable(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await api.post('/auth/2fa/enable', { code });
      setRecoveryCodes(res.data.data.recoveryCodes);
      setSaved(false);
      setStep('codes');
      setCode('');
      setSecret('');
      setQr('');
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function finish() {
    await refreshUser();
    setRecoveryCodes([]);
    toast.success('Two-factor authentication is on');
    reset();
  }

  async function disable(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api.post('/auth/2fa/disable', { password, code: code.trim() });
      await refreshUser();
      toast.success('Two-factor authentication is off');
      reset();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  const copyCodes = () => navigator.clipboard.writeText(recoveryCodes.join('\n')).then(() => toast.success('Recovery codes copied'));
  function downloadCodes() {
    const blob = new Blob([`OrbitPM recovery codes for ${user?.email}\nEach code works once.\n\n${recoveryCodes.join('\n')}\n`], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'orbitpm-recovery-codes.txt';
    a.click();
    URL.revokeObjectURL(url);
  }

  const errorBox = error && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>;

  return (
    <AppLayout>
      <div className="mx-auto max-w-2xl px-4 py-10 sm:px-8">
        <h1 className="text-2xl font-semibold tracking-tight text-space-50">Security</h1>
        <p className="mt-1 text-sm text-space-300">Protect your account with a second step when you sign in.</p>

        <div className="card mt-6 p-6">
          <div className="flex items-start gap-3">
            <span className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg ${enabled ? 'bg-emerald-50 text-emerald-700' : 'bg-space-800 text-space-300'}`}>
              {enabled ? <ShieldCheck size={20} /> : <ShieldOff size={20} />}
            </span>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-semibold text-space-50">Authenticator app</h2>
                <span className={`rounded px-1.5 py-0.5 text-[11px] font-semibold ${enabled ? 'bg-emerald-50 text-emerald-700' : 'bg-space-800 text-space-300'}`}>
                  {enabled ? 'On' : 'Off'}
                </span>
              </div>
              <p className="mt-1 text-sm text-space-300">
                Use an app such as Google Authenticator, Microsoft Authenticator or 1Password to generate a 6-digit code each time you sign in.
              </p>
            </div>
          </div>

          {step === 'idle' && (
            <div className="mt-5">
              {enabled ? (
                <button className="btn-secondary text-red-700" onClick={() => reset('disable')}>Turn off</button>
              ) : (
                <button className="btn-primary" onClick={startSetup} disabled={busy}>{busy ? 'Starting…' : 'Set up'}</button>
              )}
              {!enabled && error && <div className="mt-3">{errorBox}</div>}
            </div>
          )}

          {step === 'setup' && (
            <form onSubmit={confirmEnable} className="mt-6 space-y-5 border-t border-space-700 pt-5">
              <ol className="space-y-5 text-sm text-space-200">
                <li>
                  <p className="font-medium text-space-50">1. Scan this QR code with your app</p>
                  <div className="mt-3 flex flex-wrap items-center gap-4">
                    {qr ? <img src={qr} alt="QR code for your authenticator app" className="h-48 w-48 rounded-lg border border-space-700 bg-white p-1" /> : <div className="h-48 w-48 animate-pulse rounded-lg bg-space-800" />}
                    <div className="text-xs text-space-300">
                      <p>Can't scan? Enter this key manually:</p>
                      <p className="mt-1 select-all font-mono text-sm text-space-50">{groupKey(secret)}</p>
                    </div>
                  </div>
                </li>
                <li>
                  <label className="font-medium text-space-50" htmlFor="totp-code">2. Enter the 6-digit code it shows</label>
                  <input
                    id="totp-code"
                    autoFocus
                    required
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    className="input-field mt-2 w-40 text-center font-mono text-lg tracking-widest"
                    placeholder="123456"
                  />
                </li>
              </ol>
              {errorBox}
              <div className="flex gap-2">
                <button type="submit" className="btn-primary" disabled={busy || code.length !== 6}>{busy ? 'Checking…' : 'Verify and turn on'}</button>
                <button type="button" className="btn-secondary" onClick={() => reset()}>Cancel</button>
              </div>
            </form>
          )}

          {step === 'codes' && (
            <div className="mt-6 space-y-4 border-t border-space-700 pt-5">
              <p className="text-sm font-medium text-space-50">Save your recovery codes</p>
              <p className="text-sm text-space-300">
                If you lose your phone, each of these codes lets you sign in once. They are shown <strong>only now</strong>, so store them somewhere safe.
              </p>
              <div className="grid grid-cols-2 gap-2 rounded-lg border border-space-700 bg-space-950 p-4 font-mono text-sm text-space-50 sm:grid-cols-3">
                {recoveryCodes.map((c) => <span key={c} className="select-all">{c}</span>)}
              </div>
              <div className="flex flex-wrap gap-2">
                <button className="btn-secondary gap-1.5 text-xs" onClick={copyCodes}><Copy size={14} /> Copy</button>
                <button className="btn-secondary gap-1.5 text-xs" onClick={downloadCodes}><Download size={14} /> Download</button>
              </div>
              <label className="flex items-center gap-2 text-sm text-space-200">
                <input type="checkbox" checked={saved} onChange={(e) => setSaved(e.target.checked)} /> I have saved these codes
              </label>
              <button className="btn-primary" disabled={!saved} onClick={finish}>Done</button>
            </div>
          )}

          {step === 'disable' && (
            <form onSubmit={disable} className="mt-6 space-y-4 border-t border-space-700 pt-5">
              <p className="text-sm text-space-300">To turn this off, confirm it is you with your password and a current code (or a recovery code).</p>
              <div>
                <label className="mb-1 block text-sm font-medium text-space-50" htmlFor="pw">Password</label>
                <input id="pw" type="password" required autoFocus value={password} onChange={(e) => setPassword(e.target.value)} className="input-field max-w-xs" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-space-50" htmlFor="dcode">Code</label>
                <input id="dcode" required value={code} onChange={(e) => setCode(e.target.value)} autoComplete="one-time-code" className="input-field max-w-xs font-mono" placeholder="123456 or xxxxx-xxxxx" />
              </div>
              {errorBox}
              <div className="flex gap-2">
                <button type="submit" className="btn-primary" disabled={busy}>{busy ? 'Turning off…' : 'Turn off'}</button>
                <button type="button" className="btn-secondary" onClick={() => reset()}>Cancel</button>
              </div>
            </form>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
