import React from 'react';
import { FileJson } from 'lucide-react';

export const JsonModal = ({ isJsonModalOpen, setIsJsonModalOpen, jsonText, setJsonText, theme, isDarkMode, handleApplyJson }) => {
  if (!isJsonModalOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className={`w-full max-w-2xl flex flex-col shadow-2xl rounded-none border ${theme.panelBg} ${theme.panelBorder}`}>
        <div className="flex items-center justify-between p-4 border-b bg-blue-600 text-white">
          <div className="flex items-center gap-2">
            <FileJson size={18} />
            <h2 className="font-bold tracking-wide">JSON Data Portal</h2>
          </div>
          <button onClick={() => setIsJsonModalOpen(false)} className="text-white/80 hover:text-white font-bold">&times;</button>
        </div>

        <div className="p-4 flex flex-col gap-4">
          <p className={`text-xs font-bold ${theme.text} opacity-70 uppercase tracking-tight`}>
            Edit the JSON below to update the canvas, or copy it to save your layout.
          </p>
          <textarea
            value={jsonText}
            onChange={(e) => setJsonText(e.target.value)}
            className={`w-full h-96 p-4 font-mono text-xs font-bold border rounded-none outline-none resize-none custom-scrollbar ${isDarkMode ? 'bg-slate-950 border-slate-700 text-blue-400' : 'bg-gray-50 border-gray-200 text-blue-600'}`}
            spellCheck="false"
          />
          <div className="flex justify-end gap-3 pt-2">
            <button 
              onClick={() => setIsJsonModalOpen(false)}
              className={`px-4 py-2 text-xs font-bold border rounded-none transition-colors ${theme.buttonBg} ${theme.text}`}
            >
              Cancel
            </button>
            <button 
              onClick={handleApplyJson}
              className="px-6 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-none transition-all shadow-md active:scale-95"
            >
              Apply Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
