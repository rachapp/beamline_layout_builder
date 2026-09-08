import React, { useState, useEffect, useRef } from 'react';

/**
 * BufferedNumberInput
 * Prevents intermediate keystrokes (like typing "0", "0.", backspacing, or negative signs)
 * from triggering premature state updates, snapping to min/default, or losing cursor position.
 * Commits valid numbers only on blur, Enter, or arrow-key step.
 */
export const BufferedNumberInput = ({
  value,
  onChange,
  onCommit,
  min,
  max,
  step = 0.05,
  precision = 3,
  className = '',
  title = '',
  placeholder = '',
  disabled = false,
  onClick,
  onFocus,
  onBlur,
  onKeyDown,
  allowNegative = true,
  ...rest
}) => {
  const formatVal = (v) => {
    if (v === undefined || v === null || v === '') return '';
    const n = Number(v);
    if (isNaN(n)) return String(v);
    return String(v);
  };

  const [localText, setLocalText] = useState(() => formatVal(value));
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef(null);

  // Synchronize when value changes externally AND user is not actively typing
  useEffect(() => {
    if (!isFocused) {
      setLocalText(formatVal(value));
    }
  }, [value, isFocused]);

  const commit = (textToCommit = localText) => {
    const trimmed = String(textToCommit).trim();
    if (trimmed === '' || trimmed === '-' || trimmed === '.' || trimmed === '-.') {
      // Revert to original prop value
      setLocalText(formatVal(value));
      return;
    }
    let num = parseFloat(trimmed);
    if (isNaN(num)) {
      setLocalText(formatVal(value));
      return;
    }
    if (min !== undefined && num < min) {
      num = min;
    }
    if (max !== undefined && num > max) {
      num = max;
    }
    num = parseFloat(num.toFixed(precision));
    setLocalText(String(num));
    if (onChange && num !== value) {
      onChange(num);
    }
    if (onCommit) {
      onCommit(num);
    }
  };

  const handleFocus = (e) => {
    setIsFocused(true);
    if (onFocus) onFocus(e);
  };

  const handleBlur = (e) => {
    setIsFocused(false);
    commit();
    if (onBlur) onBlur(e);
  };

  const handleChange = (e) => {
    const text = e.target.value;
    const pattern = allowNegative ? /^-?\d*\.?\d*$/ : /^\d*\.?\d*$/;
    if (pattern.test(text)) {
      setLocalText(text);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      commit();
      inputRef.current?.blur();
    } else if (e.key === 'Escape') {
      setLocalText(formatVal(value));
      setIsFocused(false);
      inputRef.current?.blur();
    } else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      e.preventDefault();
      const current = parseFloat(localText) || 0;
      const stepVal = Number(step) || 0.05;
      const delta = e.key === 'ArrowUp' ? stepVal : -stepVal;
      let next = parseFloat((current + delta).toFixed(precision));
      if (min !== undefined && next < min) next = min;
      if (max !== undefined && next > max) next = max;
      setLocalText(String(next));
      if (onChange && next !== value) {
        onChange(next);
      }
    }
    if (onKeyDown) onKeyDown(e);
  };

  const stepNumber = (dir) => {
    if (disabled) return;
    const current = parseFloat(localText !== '' ? localText : (value ?? 0)) || 0;
    const stepVal = Number(step) || 0.05;
    const delta = dir > 0 ? stepVal : -stepVal;
    let next = parseFloat((current + delta).toFixed(precision));
    if (min !== undefined && next < min) next = min;
    if (max !== undefined && next > max) next = max;
    setLocalText(String(next));
    if (onChange && next !== value) {
      onChange(next);
    }
    if (onCommit) {
      onCommit(next);
    }
  };

  const widthClasses = className.split(' ').filter(c => c.startsWith('w-') || c.startsWith('max-w-') || c.startsWith('min-w-') || c === 'flex-1').join(' ');

  return (
    <div className={`relative inline-flex items-stretch align-middle ${widthClasses || 'w-full'}`}>
      <input
        ref={inputRef}
        type="text"
        inputMode="decimal"
        value={localText}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        onClick={onClick}
        disabled={disabled}
        className={`${className} w-full ${!disabled ? 'pr-4' : ''}`}
        title={title}
        placeholder={placeholder}
        {...rest}
      />
      {!disabled && (
        <div className="absolute right-[1px] top-[1px] bottom-[1px] flex flex-col w-3.5 border-l border-gray-300 dark:border-slate-600 bg-gray-100/90 dark:bg-slate-700/90 select-none overflow-hidden z-10 rounded-r">
          <button
            type="button"
            tabIndex={-1}
            onMouseDown={(e) => e.preventDefault()}
            onClick={(e) => {
              e.stopPropagation();
              stepNumber(1);
            }}
            className="flex-1 flex items-center justify-center hover:bg-blue-600 hover:text-white dark:hover:bg-blue-600 text-gray-500 dark:text-gray-300 active:bg-blue-700 transition-colors border-b border-gray-300/80 dark:border-slate-600/80 leading-none cursor-pointer"
            title="Increment"
          >
            <svg className="w-2 h-2 fill-current" viewBox="0 0 24 24">
              <path d="M12 8l-6 6 1.41 1.41L12 10.83l4.59 4.58L18 14z"/>
            </svg>
          </button>
          <button
            type="button"
            tabIndex={-1}
            onMouseDown={(e) => e.preventDefault()}
            onClick={(e) => {
              e.stopPropagation();
              stepNumber(-1);
            }}
            className="flex-1 flex items-center justify-center hover:bg-blue-600 hover:text-white dark:hover:bg-blue-600 text-gray-500 dark:text-gray-300 active:bg-blue-700 transition-colors leading-none cursor-pointer"
            title="Decrement"
          >
            <svg className="w-2 h-2 fill-current" viewBox="0 0 24 24">
              <path d="M16.59 8.59L12 13.17 7.41 8.59 6 10l6 6 6-6z"/>
            </svg>
          </button>
        </div>
      )}
    </div>
  );
};

/**
 * BufferedTextInput
 * For string values like component custom names or tags.
 * Commits on blur or Enter, preserving cursor while editing.
 */
export const BufferedTextInput = ({
  value,
  onChange,
  className = '',
  title = '',
  placeholder = '',
  onClick,
  onFocus,
  onBlur,
  onKeyDown,
  ...rest
}) => {
  const [localText, setLocalText] = useState(value ?? '');
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    if (!isFocused) {
      setLocalText(value ?? '');
    }
  }, [value, isFocused]);

  const commit = () => {
    if (localText !== value && onChange) {
      onChange(localText);
    }
  };

  return (
    <input
      ref={inputRef}
      type="text"
      value={localText}
      onChange={(e) => setLocalText(e.target.value)}
      onFocus={(e) => {
        setIsFocused(true);
        if (onFocus) onFocus(e);
      }}
      onBlur={(e) => {
        setIsFocused(false);
        commit();
        if (onBlur) onBlur(e);
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          commit();
          inputRef.current?.blur();
        } else if (e.key === 'Escape') {
          setLocalText(value ?? '');
          setIsFocused(false);
          inputRef.current?.blur();
        }
        if (onKeyDown) onKeyDown(e);
      }}
      onClick={onClick}
      className={className}
      title={title}
      placeholder={placeholder}
      {...rest}
    />
  );
};

export default BufferedNumberInput;
