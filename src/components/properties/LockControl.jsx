import { Lock, Unlock } from 'lucide-react';

/** Lock / unlock toggle shown at the top of every item's properties. Locked items cannot be dragged or moved with the arrow keys. */
export const LockControl = ({
  item,
  theme,
  onToggle,
  lockedLabel,
  unlockedLabel,
  lockedHint = 'Mouse drag & arrow keys disabled',
  unlockedHint = 'Can be dragged & moved freely with mouse',
  lockText = 'Lock Figure'
}) => {
  const locked = Boolean(item.isLocked);
  return (
    <div className={`p-2 border rounded-none flex items-center justify-between transition-colors ${
      locked
        ? 'bg-amber-500/10 border-amber-500/40 text-amber-900 dark:text-amber-200'
        : `${theme.buttonBg} border-gray-300 dark:border-slate-700`
    }`}>
      <div className="flex items-center gap-2">
        <div className={`p-1.5 rounded-none ${locked ? 'bg-amber-500 text-white' : 'bg-gray-200 dark:bg-slate-700 text-gray-600 dark:text-gray-300'}`}>
          {locked ? <Lock size={14} /> : <Unlock size={14} />}
        </div>
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider block">
            {locked ? lockedLabel : unlockedLabel}
          </span>
          <span className="text-[9px] opacity-70 block">
            {locked ? lockedHint : unlockedHint}
          </span>
        </div>
      </div>
      <button
        type="button"
        onClick={onToggle}
        className={`px-2.5 py-1 text-xs font-bold border rounded-none transition-all flex items-center gap-1 shadow-sm ${
          locked
            ? 'bg-amber-500 hover:bg-amber-600 text-white border-amber-600'
            : `${theme.buttonBg} ${theme.text} hover:border-amber-500 hover:text-amber-500`
        }`}
        title={locked ? 'Click to unlock for mouse moving' : 'Click to lock from accidental mouse movement'}
      >
        {locked ? <Unlock size={12} /> : <Lock size={12} />}
        <span>{locked ? 'Unlock' : lockText}</span>
      </button>
    </div>
  );
};
