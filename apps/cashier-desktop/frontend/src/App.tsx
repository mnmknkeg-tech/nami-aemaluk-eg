import { useEffect, useState } from 'react';
import { api, onEvent, type AppState } from './lib/api';
import Setup from './screens/Setup';
import Gate from './screens/Gate';
import Pos from './screens/Pos';

type Screen = 'loading' | 'setup' | 'gate' | 'pos';

export default function App() {
  const [screen, setScreen] = useState<Screen>('loading');
  const [state, setState] = useState<AppState | null>(null);
  const [fatal, setFatal] = useState('');

  const refresh = async () => {
    try {
      const st = await api.getState();
      setState(st);
      // the gate decides between open/resume/none itself; 'none' means the
      // cashier session is live → straight into the POS screen
      setScreen(!st.configured || st.sessionExpired ? 'setup' : 'gate');
    } catch (e: any) {
      setFatal(String(e?.message || e));
      setScreen('loading');
    }
  };

  useEffect(() => {
    refresh();
    // انتهت الجلسة من السيرفر (فشل الـ refresh) → رجوع لشاشة تأكيد الحساب
    const off = onEvent('session:expired', () => {
      refresh();
    });
    return off;
  }, []);

  if (screen === 'loading') {
    return (
      <div className="h-full flex items-center justify-center bg-slate-50" dir="rtl">
        <div className="text-center">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-[#BD00FF]/10 flex items-center justify-center mb-3 animate-pulse">
            <span className="text-2xl">🧾</span>
          </div>
          {fatal ? (
            <p className="font-black text-red-500 text-sm max-w-xs" dir="ltr">
              {fatal}
            </p>
          ) : (
            <p className="font-black text-slate-400 text-sm">جارٍ التحميل...</p>
          )}
        </div>
      </div>
    );
  }

  if (screen === 'setup') {
    return (
      <Setup
        relink={!!state?.sessionExpired}
        shopName={state?.shopName || ''}
        onDone={() => {
          refresh();
        }}
      />
    );
  }

  if (screen === 'gate') {
    return (
      <Gate
        onEnter={() => setScreen('pos')}
        onForget={() => {
          api.disconnect().then(refresh);
        }}
      />
    );
  }

  return <Pos onLock={() => setScreen('gate')} />;
}
