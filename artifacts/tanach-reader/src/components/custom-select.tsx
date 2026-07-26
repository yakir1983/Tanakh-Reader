/**
 * CustomSelect — RTL dropdown that opens inline below its trigger.
 * No system picker, no full-screen dialog, no Radix dependency.
 */
import { useState, useRef, useEffect, useId } from 'react';

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectGroup {
  label: string;
  options: SelectOption[];
}

interface Props {
  value: string;
  onChange: (val: string) => void;
  groups?: SelectGroup[];
  options?: SelectOption[];
  placeholder?: string;
  disabled?: boolean;
  testId?: string;
  className?: string;
}

export function CustomSelect({
  value,
  onChange,
  groups,
  options,
  placeholder = '',
  disabled = false,
  testId,
  className = '',
}: Props) {
  const [open, setOpen] = useState(false);
  const wrapRef  = useRef<HTMLDivElement>(null);
  const listRef  = useRef<HTMLDivElement>(null);
  const id = useId();

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // Scroll selected item into view when list opens
  useEffect(() => {
    if (!open || !listRef.current) return;
    const selected = listRef.current.querySelector('[data-selected="true"]') as HTMLElement | null;
    if (selected) {
      selected.scrollIntoView({ block: 'nearest' });
    }
  }, [open]);

  // Resolve display label
  const allOptions: SelectOption[] = groups
    ? groups.flatMap(g => g.options)
    : (options ?? []);
  const displayLabel = allOptions.find(o => o.value === value)?.label ?? placeholder;

  const select = (val: string) => {
    onChange(val);
    setOpen(false);
  };

  const triggerCls = [
    'w-full h-12 px-4 flex items-center justify-between gap-2 rounded-xl',
    'border border-border bg-card text-foreground text-lg',
    'cursor-pointer select-none transition-colors',
    'hover:bg-accent/20 active:bg-accent/30',
    disabled ? 'opacity-40 pointer-events-none' : '',
    open ? 'ring-2 ring-primary/40 border-primary/40' : '',
    className,
  ].filter(Boolean).join(' ');

  const itemCls = (isSelected: boolean) => [
    'px-4 py-2.5 text-base cursor-pointer transition-colors',
    'hover:bg-primary/10 active:bg-primary/20',
    isSelected ? 'text-primary font-semibold bg-primary/5' : 'text-foreground',
  ].join(' ');

  return (
    <div ref={wrapRef} className="relative w-full" dir="rtl">
      {/* Trigger */}
      <div
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={id}
        data-testid={testId}
        tabIndex={disabled ? -1 : 0}
        className={triggerCls}
        onClick={() => !disabled && setOpen(o => !o)}
        onKeyDown={e => {
          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpen(o => !o); }
          if (e.key === 'Escape') setOpen(false);
        }}
      >
        <span className="truncate">{displayLabel}</span>
        <span
          className="text-muted-foreground text-sm shrink-0 transition-transform duration-200"
          style={{ transform: open ? 'rotate(180deg)' : 'none' }}
        >
          ▾
        </span>
      </div>

      {/* Dropdown list */}
      {open && (
        <div
          id={id}
          ref={listRef}
          role="listbox"
          dir="rtl"
          className={[
            'absolute top-full mt-1 right-0 left-0 z-50',
            'rounded-xl border border-border bg-card shadow-lg',
            'overflow-y-auto max-h-56',
            'animate-in fade-in-0 zoom-in-95 duration-100',
          ].join(' ')}
        >
          {groups
            ? groups.map(g => (
                <div key={g.label}>
                  <div className="px-4 py-1.5 text-xs font-bold text-primary sticky top-0 bg-card/95 backdrop-blur-sm border-b border-border/50">
                    {g.label}
                  </div>
                  {g.options.map(o => (
                    <div
                      key={o.value}
                      role="option"
                      aria-selected={o.value === value}
                      data-selected={o.value === value}
                      className={itemCls(o.value === value)}
                      onClick={() => select(o.value)}
                    >
                      {o.label}
                    </div>
                  ))}
                </div>
              ))
            : options?.map(o => (
                <div
                  key={o.value}
                  role="option"
                  aria-selected={o.value === value}
                  data-selected={o.value === value}
                  className={itemCls(o.value === value)}
                  onClick={() => select(o.value)}
                >
                  {o.label}
                </div>
              ))}
        </div>
      )}
    </div>
  );
}
