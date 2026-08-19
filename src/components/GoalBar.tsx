import { useTranslation } from 'react-i18next';
import type { ColorGoal, LevelProgress } from '../engine';
import { getSwatch } from '../theme/palette';

interface GoalBarProps {
  goals: ColorGoal[];
  progress: LevelProgress;
  activeColorIds: Set<string>;
  bonusSlots: number;
  maxBonusSlots: number;
  onUnlockBonusSlot: () => void;
}

/**
 * The row of "currents" chips: one per goal, in queue order. Active goals
 * glow and show live progress; the earliest still-locked goal offers a mock
 * "watch ad" unlock (as long as bonus slots remain); everything further out
 * just shows locked. Completed goals collapse to a small checkmark chip.
 */
export default function GoalBar({ goals, progress, activeColorIds, bonusSlots, maxBonusSlots, onUnlockBonusSlot }: GoalBarProps) {
  const { t } = useTranslation();
  const canUnlockMore = bonusSlots < maxBonusSlots;

  const isComplete = (goal: ColorGoal) => (progress.removedValueByColor[goal.colorId] ?? 0) >= goal.target;
  // The window can slide as earlier goals complete, so "next unlockable"
  // means the first goal that's neither active nor complete — not a fixed
  // index — otherwise it drifts out of sync once any goal finishes early.
  const nextLockedGoal = canUnlockMore
    ? goals.find((goal) => !isComplete(goal) && !activeColorIds.has(goal.colorId))
    : undefined;

  return (
    <div className="flex w-full max-w-md flex-wrap justify-center gap-2" role="list" aria-label={t('goals.aria')}>
      {goals.map((goal) => {
        const swatch = getSwatch(goal.colorId);
        const current = Math.min(progress.removedValueByColor[goal.colorId] ?? 0, goal.target);
        const completed = current >= goal.target;
        const active = !completed && activeColorIds.has(goal.colorId);
        const isNextUnlockable = !active && !completed && goal.colorId === nextLockedGoal?.colorId;

        if (completed) {
          return (
            <div
              key={goal.colorId}
              role="listitem"
              aria-label={t('goals.completedAria')}
              className="flex h-8 w-8 items-center justify-center rounded-full border text-xs"
              style={{ borderColor: `${swatch.hex}55`, color: swatch.hex }}
            >
              ✓
            </div>
          );
        }

        if (active) {
          return (
            <div
              key={goal.colorId}
              role="listitem"
              className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold text-white shadow-[0_0_10px_var(--glow)]"
              style={{
                backgroundColor: `${swatch.hex}cc`,
                // @ts-expect-error -- custom property consumed by the shadow above
                '--glow': `${swatch.hex}66`,
              }}
            >
              <span className="h-2 w-2 rounded-full bg-white/80" />
              {t('goals.progress', { current, target: goal.target })}
            </div>
          );
        }

        if (isNextUnlockable) {
          return (
            <button
              key={goal.colorId}
              type="button"
              role="listitem"
              onClick={onUnlockBonusSlot}
              title={t('goals.unlockHint')}
              className="flex items-center gap-1 rounded-full border border-dashed px-2 py-1 text-xs font-medium text-slate-200"
              style={{ borderColor: `${swatch.hex}88` }}
            >
              <span className="h-2 w-2 rounded-full opacity-70" style={{ backgroundColor: swatch.hex }} />
              🔒 {t('goals.unlock')}
            </button>
          );
        }

        return (
          <div
            key={goal.colorId}
            role="listitem"
            aria-label={t('goals.lockedAria')}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-white/5 text-xs opacity-60"
          >
            🔒
          </div>
        );
      })}
    </div>
  );
}
