import React, { useState, useRef, useEffect } from 'react';
import { FileJson, GripHorizontal, Copy, Check } from 'lucide-react';

let globalZIndexCounter = 130;

export const JsonModal = ({ 
  isJsonModalOpen, 
  setIsJsonModalOpen, 
  jsonText, 
  setJsonText, 
  theme, 
  isDarkMode, 
  handleApplyJson 
}) => {
  const [copied, setCopied] = useState(false);
  const [zIndex, setZIndex] = useState(130);

  const [pos, setPos] = useState(() => {
    try {
      const saved = localStorage.getItem('beamline_json_box_pos');
      if (saved) {
        const p = JSON.parse(saved);
        if (typeof p.x === 'number' && typeof p.y === 'number') {
          return {
            x: Math.max(10, Math.min(window.innerWidth - 300, p.x)),
            y: Math.max(10, Math.min(window.innerHeight - 100, p.y))
          };
        }
      }
    } catch (e) {}
    return {
      x: typeof window !== 'undefined' ? Math.max(280, Math.round((window.innerWidth - 540) / 2)) : 320,
      y: 80
    };
  });

  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef({ offsetX: 0, offsetY: 0 });

  const bringToFront = () => {
    globalZIndexCounter += 1;
    setZIndex(globalZIndexCounter);
  };

  const handlePointerDown = (e) => {
    e.stopPropagation();
    bringToFront();
    setIsDragging(true);
    dragRef.current = {
      offsetX: e.clientX - pos.x,
      offsetY: e.clientY - pos.y
    };
  };

  useEffect(() => {
    if (!isDragging) return;
    const handlePointerMove = (e) => {
      const newX = Math.max(10, Math.min(window.innerWidth - 120, e.clientX - dragRef.current.offsetX));
      const newY = Math.max(10, Math.min(window.innerHeight - 80, e.clientY - dragRef.current.offsetY));
      setPos({ x: newX, y: newY });
    };
    const handlePointerUp = () => {
      setIsDragging(false);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [isDragging]);

  useEffect(() => {
    try {
      localStorage.setItem('beamline_json_box_pos', JSON.stringify(pos));
    } catch (e) {}
  }, [pos]);

  const handleCopy = () => {
    navigator.clipboard.writeText(jsonText).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  if (!isJsonModalOpen) return null;

  return (
    <div 
      className={`fixed w-[520px] max-w-[95vw] flex flex-col shadow-2xl rounded-md border ${theme.panelBg} ${theme.panelBorder} ${theme.text}`}
      style={{ left: pos.x, top: pos.y, zIndex }}
      onClick={(e) => {
        e.stopPropagation();
        bringToFront();
      }}
      onPointerDown={(e) => {
        e.stopPropagation();
        bringToFront();
      }}
      onWheel={(e) => e.stopPropagation()}
    >
      {/* Draggable Header */}
      <div 
        className="flex items-center justify-between p-3 border-b bg-blue-600 text-white cursor-move select-none rounded-t-md"
        onPointerDown={handlePointerDown}
      >
        <div className="flex items-center gap-2 pointer-events-none">
          <GripHorizontal size={16} className="text-white/70" />
          <FileJson size={16} />
          <h2 className="font-bold tracking-wide text-xs uppercase">JSON Data Portal</h2>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onPointerDown={(e) => e.stopPropagation()}
            onClick={handleCopy}
            className="flex items-center gap-1 text-[11px] font-bold px-2 py-1 bg-blue-700 hover:bg-blue-800 text-white rounded transition-colors"
            title="Copy JSON to Clipboard"
          >
            {copied ? <Check size={12} className="text-green-300" /> : <Copy size={12} />}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>
          <button 
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() => setIsJsonModalOpen(false)} 
            className="text-white/80 hover:text-white hover:bg-blue-700/60 px-2 py-0.5 rounded font-bold text-lg leading-none"
            title="Close"
          >
            &times;
          </button>
        </div>
      </div>

      {/* Body Content */}
      <div className="p-4 flex flex-col gap-3">
        <p className={`text-[11px] font-bold ${theme.text} opacity-70 uppercase tracking-tight`}>
          Edit JSON to live-update canvas, or copy it to save your layout.
        </p>
        <textarea
          value={jsonText}
          onChange={(e) => setJsonText(e.target.value)}
          className={`w-full h-72 p-3 font-mono text-xs font-bold border rounded outline-none resize-y custom-scrollbar ${isDarkMode ? 'bg-slate-950 border-slate-700 text-blue-400' : 'bg-gray-50 border-gray-200 text-blue-600'}`}
          spellCheck="false"
        />
        <div className="flex justify-end gap-2 pt-1 border-t border-gray-400/30">
          <button 
            onClick={() => setIsJsonModalOpen(false)}
            className={`px-4 py-1.5 text-xs font-bold border rounded transition-colors ${theme.buttonBg} ${theme.text}`}
          >
            Close
          </button>
          <button 
            onClick={handleApplyJson}
            className="px-5 py-1.5 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded transition-all shadow-md active:scale-95"
          >
            Apply Changes
          </button>
        </div>
      </div>
    </div>
  );
};
