import { Keyboard, X } from 'lucide-react';

// Keep in sync with src/hooks/beamline/useKeyboardShortcuts.js and the mouse handling in usePointerHandlers.js.
const SECTIONS = [
  {
    title: 'Editing',
    rows: [
      [['Ctrl', 'Z'], 'Undo'],
      [['Ctrl', 'Y'], 'Redo (also Ctrl + Shift + Z)'],
      [['Delete'], 'Delete the selected component(s) (also Backspace)'],
      [['Esc'], 'Cancel placing / editing, or clear the selection'],
    ]
  },
  {
    title: 'Selection',
    rows: [
      [['Click'], 'Select a component and zoom to it'],
      [['Shift', 'Click'], 'Add or remove a component from the selection (also Ctrl + Click)'],
      [['Ctrl', 'A'], 'Select all components'],
      [['Drag'], 'Move a component; dragging one of several selected moves them all'],
    ]
  },
  {
    title: 'Moving the selection',
    rows: [
      [['← / →'], 'Move along the beamline by 0.1 m'],
      [['Shift', '← / →'], 'Move along the beamline by 1 m'],
      [['↑ / ↓'], 'Change height (SIDE) or offset (TOP) by 1 mm; anchors by 0.1 mm'],
      [['Shift', '↑ / ↓'], 'Change height or offset by 10 mm; anchors by 1 mm'],
    ]
  },
  {
    title: 'View',
    rows: [
      [['F'], 'Fit the whole beamline to the screen'],
      [['Mouse wheel'], 'Zoom at the pointer'],
      [['Drag background'], 'Pan the view'],
      [['Double-click label'], 'Rename a component'],
      [['?'], 'Show or hide this list'],
    ]
  }
];

export const ShortcutHelp = ({ isOpen, onClose, theme, isDarkMode }) => {
  if (!isOpen) return null;
  const keyClass = `inline-block min-w-[1.5rem] px-1.5 py-0.5 text-[11px] font-mono font-bold text-center rounded border shadow-sm ${
    isDarkMode ? 'bg-slate-700 border-slate-600 text-slate-100' : 'bg-gray-100 border-gray-300 text-gray-800'
  }`;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 p-4"
      onPointerDown={onClose}
    >
      <div
        role="dialog"
        aria-label="Keyboard shortcuts"
        className={`w-full max-w-xl max-h-[85vh] overflow-y-auto border rounded-md ${theme.widgetBg} ${theme.text}`}
        onPointerDown={(e) => e.stopPropagation()}
      >
        <div className={`flex items-center justify-between px-4 py-3 border-b ${theme.panelBorder}`}>
          <div className="flex items-center gap-2 font-bold">
            <Keyboard size={18} className="text-blue-500" />
            <span>Keyboard Shortcuts</span>
          </div>
          <button onClick={onClose} title="Close (Esc)" className="p-1 rounded hover:bg-black/10 dark:hover:bg-white/10">
            <X size={18} />
          </button>
        </div>
        <div className="p-4 grid gap-4">
          {SECTIONS.map(section => (
            <section key={section.title}>
              <h3 className="text-[11px] font-bold uppercase tracking-wider opacity-60 mb-1.5">{section.title}</h3>
              <table className="w-full text-xs">
                <tbody>
                  {section.rows.map(([keys, description]) => (
                    <tr key={description} className="align-top">
                      <td className="py-1 pr-4 whitespace-nowrap">
                        {keys.map((k, i) => (
                          <span key={k}>
                            {i > 0 && <span className="mx-0.5 opacity-50">+</span>}
                            <kbd className={keyClass}>{k}</kbd>
                          </span>
                        ))}
                      </td>
                      <td className="py-1">{description}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          ))}
          <p className="text-[11px] opacity-60">On a Mac, use ⌘ Cmd wherever Ctrl is shown.</p>
        </div>
      </div>
    </div>
  );
};
