import { useState, useMemo } from 'react';

export const useTheme = () => {
  const [isDarkMode, setIsDarkMode] = useState(false);

  const theme = useMemo(() => ({
    isDarkMode,
    bg: isDarkMode ? '#0f172a' : '#f8fafc',
    canvasBg: isDarkMode ? '#1e293b' : '#f1f5f9',
    grid: isDarkMode ? 'radial-gradient(circle at 0px 0px, #334155 1.5px, transparent 0)' : 'radial-gradient(circle at 0px 0px, #cbd5e1 1.5px, transparent 0)',
    beam: isDarkMode ? '#f87171' : '#ef4444',
    compBorder: isDarkMode ? '#94a3b8' : '#1f2937',
    compBg: isDarkMode ? '#0f172a' : '#ffffff',
    inactiveBg: isDarkMode ? '#334155' : '#e2e8f0',
    inactiveBorder: isDarkMode ? '#475569' : '#94a3b8',
    text: isDarkMode ? 'text-slate-200' : 'text-slate-700',
    panelBg: isDarkMode ? 'bg-slate-900' : 'bg-white',
    panelBorder: isDarkMode ? 'border-slate-800' : 'border-gray-200',
    buttonBg: isDarkMode ? 'bg-slate-800 hover:bg-slate-700 border-slate-700' : 'bg-white hover:bg-slate-50 border-slate-200',
    badgeBg: isDarkMode ? 'bg-slate-800/90 border-slate-700' : 'bg-white/90 border-gray-200',
    widgetBg: isDarkMode ? 'bg-slate-800 border-slate-700 shadow-[0_8px_30px_rgb(0,0,0,0.5)]' : 'bg-white border-gray-200 shadow-[0_8px_30px_rgb(0,0,0,0.12)]',
  }), [isDarkMode]);

  return { isDarkMode, setIsDarkMode, theme };
};
