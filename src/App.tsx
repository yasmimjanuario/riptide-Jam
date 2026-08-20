import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import Board from './components/Board';
import { useGameStore } from './state/useGameStore';
import { SUPPORTED_LANGUAGES } from './i18n';

function App() {
  const { t, i18n } = useTranslation();
  const board = useGameStore((state) => state.board);
  const status = useGameStore((state) => state.status);
  const blockedEntityId = useGameStore((state) => state.blockedEntityId);
  const blockedNonce = useGameStore((state) => state.blockedNonce);
  const startNewLevel = useGameStore((state) => state.startNewLevel);
  const attemptMove = useGameStore((state) => state.attemptMove);

  useEffect(() => {
    if (!board) startNewLevel();
  }, [board, startNewLevel]);

  return (
    <div className="flex min-h-svh flex-col items-center gap-4 bg-gradient-to-b from-slate-950 to-slate-900 px-4 py-6 text-white">
      <header className="flex w-full max-w-md items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Riptide Jam</h1>
          <p className="text-sm text-slate-300">{t('game.tagline')}</p>
        </div>
        <div className="flex gap-1 rounded-full bg-white/10 p-1" role="group" aria-label={t('language.label')}>
          {SUPPORTED_LANGUAGES.map((lng) => (
            <button
              key={lng}
              type="button"
              onClick={() => i18n.changeLanguage(lng)}
              className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                i18n.resolvedLanguage === lng ? 'bg-white text-slate-900' : 'text-slate-200'
              }`}
            >
              {t(`language.${lng}`)}
            </button>
          ))}
        </div>
      </header>

      {board && (
        <Board
          board={board}
          blockedEntityId={blockedEntityId}
          blockedNonce={blockedNonce}
          onTapEntity={attemptMove}
        />
      )}

      <div className="flex w-full max-w-md flex-col items-center gap-3">
        <p className="min-h-[1.5rem] text-center text-sm font-medium text-slate-200" role="status">
          {status === 'won' && t('game.status.won')}
          {status === 'deadlock' && t('game.status.deadlock')}
          {status === 'playing' && t('game.tapHint')}
        </p>

        <button
          type="button"
          onClick={() => startNewLevel()}
          className="rounded-full bg-amber-400 px-5 py-2 text-sm font-semibold text-slate-900 shadow-lg transition-transform active:scale-95"
        >
          {t('game.newLevel')}
        </button>
      </div>
    </div>
  );
}

export default App;
