import { ChevronDown, Search, X } from 'lucide-react';
import { useEffect, useId, useMemo, useRef, useState } from 'react';

const normalizeOption = (option) => {
  if (typeof option === 'string') return { value: option, label: option };
  return {
    value: option?.value ?? '',
    label: option?.label ?? option?.value ?? '',
    disabled: option?.disabled
  };
};

export default function SearchableSelect({
  value,
  onChange,
  options = [],
  placeholder = 'Select',
  disabled = false,
  required = false,
  label,
  className = '',
  noResultsText = 'No results found'
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const rootRef = useRef(null);
  const searchRef = useRef(null);
  const reactId = useId();
  const listId = `select-${reactId.replace(/:/g, '')}`;

  const normalizedOptions = useMemo(() => options.map(normalizeOption), [options]);
  const selected = normalizedOptions.find((option) => String(option.value) === String(value));
  const filteredOptions = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return normalizedOptions;
    return normalizedOptions.filter((option) =>
      `${option.label} ${option.value}`.toLowerCase().includes(term)
    );
  }, [normalizedOptions, query]);

  useEffect(() => {
    if (!open) return undefined;
    const timer = window.setTimeout(() => searchRef.current?.focus(), 0);
    return () => window.clearTimeout(timer);
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const closeOnOutside = (event) => {
      if (!rootRef.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener('mousedown', closeOnOutside);
    return () => document.removeEventListener('mousedown', closeOnOutside);
  }, [open]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query, open]);

  const selectOption = (option) => {
    if (!option || option.disabled) return;
    onChange(option.value);
    setQuery('');
    setOpen(false);
  };

  const moveActive = (direction) => {
    if (!open) {
      setOpen(true);
      return;
    }
    if (!filteredOptions.length) return;
    setActiveIndex((index) => {
      const next = index + direction;
      if (next < 0) return filteredOptions.length - 1;
      if (next >= filteredOptions.length) return 0;
      return next;
    });
  };

  const handleKeyDown = (event) => {
    if (disabled) return;
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      moveActive(1);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      moveActive(-1);
    } else if (event.key === 'Enter' && open) {
      event.preventDefault();
      selectOption(filteredOptions[activeIndex]);
    } else if (event.key === 'Escape') {
      setOpen(false);
    } else if (event.key === 'Tab') {
      setOpen(false);
    }
  };

  const clearValue = (event) => {
    event.stopPropagation();
    onChange('');
    setQuery('');
    setOpen(false);
  };

  return (
    <div ref={rootRef} className={`relative ${className}`} onKeyDown={handleKeyDown}>
      <button
        type="button"
        className={`input flex items-center justify-between gap-2 text-left ${disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-label={label || placeholder}
        aria-required={required}
        onClick={() => setOpen((current) => !current)}
      >
        <span className={`min-w-0 flex-1 truncate ${selected ? 'text-slate-700' : 'text-slate-400'}`}>
          {selected?.label || placeholder}
        </span>
        {value ? (
          <span
            tabIndex={-1}
            className="grid h-5 w-5 shrink-0 place-items-center rounded text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            aria-label="Clear selection"
            onClick={clearValue}
          >
            <X size={14} />
          </span>
        ) : null}
        <ChevronDown className="shrink-0 text-slate-400" size={16} />
      </button>
      <select
        className="sr-only"
        tabIndex={-1}
        value={value || ''}
        required={required}
        disabled={disabled}
        onChange={() => {}}
        aria-hidden="true"
      >
        <option value="">{placeholder}</option>
        {normalizedOptions.map((option) => <option key={`${option.value}-${option.label}`} value={option.value}>{option.label}</option>)}
      </select>

      {open ? (
        <div className="absolute z-[70] mt-1 w-full overflow-hidden rounded-md border border-slate-200 bg-white shadow-lg">
          <div className="sticky top-0 z-10 border-b border-slate-100 bg-white p-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
              <input
                ref={searchRef}
                className="input !py-2 !pl-9 !pr-8"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Search"
                aria-label={`Search ${label || placeholder}`}
              />
              {query ? (
                <button
                  type="button"
                  className="absolute right-2 top-1/2 grid h-6 w-6 -translate-y-1/2 place-items-center rounded text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                  onClick={() => setQuery('')}
                  aria-label="Clear search"
                >
                  <X size={14} />
                </button>
              ) : null}
            </div>
          </div>
          <ul id={listId} role="listbox" className="max-h-64 overflow-y-auto py-1">
            {filteredOptions.map((option, index) => (
              <li
                key={`${option.value}-${option.label}`}
                role="option"
                aria-selected={String(option.value) === String(value)}
                className={`cursor-pointer px-3 py-2 text-sm ${index === activeIndex ? 'bg-huGreen/10 text-huGreen' : 'text-slate-700 hover:bg-slate-50'} ${option.disabled ? 'cursor-not-allowed opacity-50' : ''}`}
                onMouseEnter={() => setActiveIndex(index)}
                onMouseDown={(event) => {
                  event.preventDefault();
                  selectOption(option);
                }}
              >
                <span className="block truncate">{option.label}</span>
              </li>
            ))}
            {!filteredOptions.length ? (
              <li className="px-3 py-6 text-center text-sm text-slate-500">{noResultsText}</li>
            ) : null}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
