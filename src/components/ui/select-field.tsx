"use client";

import { Check, ChevronDown, Search } from "lucide-react";
import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";

import { cn } from "@/lib/utils";

export type SelectOption = {
  value: string;
  label: string;
  code?: string;
  detail?: string;
  meta?: string;
  keywords?: string;
};

type SelectFieldProps = {
  label: string;
  value: string;
  options: SelectOption[];
  onValueChange: (value: string) => void;
  ariaLabel?: string;
  className?: string;
  disabled?: boolean;
  dark?: boolean;
  searchable?: boolean;
  searchPlaceholder?: string;
  emptyText?: string;
  placeholder?: string;
  menuAlign?: "start" | "end";
  menuWidth?: "trigger" | "wide";
  columns?: 1 | 2;
  maxVisibleOptions?: number;
};

function filterOptions(options: SelectOption[], query: string) {
  const tokens = query.toLocaleLowerCase().trim().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return options;

  return options.filter((option) => {
    const searchableText = [
      option.code,
      option.label,
      option.detail,
      option.meta,
      option.keywords,
    ]
      .filter(Boolean)
      .join(" ")
      .toLocaleLowerCase();
    return tokens.every((token) => searchableText.includes(token));
  });
}

function optionId(generatedId: string, optionValue: string) {
  return `select-option-${generatedId}-${optionValue.replaceAll(/[^a-zA-Z0-9_-]/g, "-")}`;
}

export function SelectField({
  label,
  value,
  options,
  onValueChange,
  ariaLabel,
  className,
  disabled = false,
  dark = false,
  searchable = false,
  searchPlaceholder = "Search options",
  emptyText = "No matching options",
  placeholder = "Choose an option",
  menuAlign = "start",
  menuWidth = "trigger",
  columns = 1,
  maxVisibleOptions = 60,
}: SelectFieldProps) {
  const generatedId = useId().replaceAll(":", "");
  const triggerId = `select-trigger-${generatedId}`;
  const labelId = `select-label-${generatedId}`;
  const listboxId = `select-listbox-${generatedId}`;
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeValue, setActiveValue] = useState(value);
  const selected = options.find((option) => option.value === value);
  const matchingOptions = useMemo(
    () => filterOptions(options, query),
    [options, query],
  );
  const orderedOptions = useMemo(() => {
    if (!searchable || query || !selected) return matchingOptions;
    return [
      selected,
      ...matchingOptions.filter((option) => option.value !== selected.value),
    ];
  }, [matchingOptions, query, searchable, selected]);
  const visibleOptions = orderedOptions.slice(0, maxVisibleOptions);
  const activeIndex = visibleOptions.findIndex(
    (option) => option.value === activeValue,
  );

  function openMenu() {
    if (disabled) return;
    setQuery("");
    setActiveValue(value || options[0]?.value || "");
    setOpen(true);
  }

  function closeMenu({ restoreFocus = false } = {}) {
    setOpen(false);
    setQuery("");
    if (restoreFocus) triggerRef.current?.focus();
  }

  function choose(optionValue: string) {
    onValueChange(optionValue);
    setActiveValue(optionValue);
    closeMenu({ restoreFocus: true });
  }

  function moveActive(direction: 1 | -1) {
    if (visibleOptions.length === 0) return;
    const currentIndex = activeIndex >= 0 ? activeIndex : 0;
    const nextIndex =
      (currentIndex + direction + visibleOptions.length) %
      visibleOptions.length;
    setActiveValue(visibleOptions[nextIndex].value);
  }

  function handleNavigationKey(event: KeyboardEvent<HTMLElement>) {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (!open) {
        openMenu();
      } else {
        moveActive(event.key === "ArrowDown" ? 1 : -1);
      }
      return;
    }
    if (event.key === "Home" && open && visibleOptions.length > 0) {
      event.preventDefault();
      setActiveValue(visibleOptions[0].value);
      return;
    }
    if (event.key === "End" && open && visibleOptions.length > 0) {
      event.preventDefault();
      setActiveValue(visibleOptions.at(-1)!.value);
      return;
    }
    if (event.key === "Enter" && open && activeIndex >= 0) {
      event.preventDefault();
      choose(visibleOptions[activeIndex].value);
      return;
    }
    if (event.key === "Escape" && open) {
      event.preventDefault();
      closeMenu({ restoreFocus: true });
    }
  }

  function updateQuery(nextQuery: string) {
    setQuery(nextQuery);
    setActiveValue(filterOptions(options, nextQuery)[0]?.value ?? "");
  }

  useEffect(() => {
    if (!open) return;
    if (searchable) searchRef.current?.focus();

    function handlePointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) closeMenu();
    }

    function handleFocusIn(event: FocusEvent) {
      if (!rootRef.current?.contains(event.target as Node)) closeMenu();
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("focusin", handleFocusIn);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("focusin", handleFocusIn);
    };
  }, [open, searchable]);

  useEffect(() => {
    if (!open || !activeValue) return;
    document
      .getElementById(optionId(generatedId, activeValue))
      ?.scrollIntoView?.({ block: "nearest" });
  }, [activeValue, generatedId, open]);

  return (
    <div
      ref={rootRef}
      className={cn("relative min-w-0", open && "z-50", className)}
    >
      <span
        id={labelId}
        className={cn(
          "mb-1.5 block text-[0.67rem] font-bold tracking-[0.09em] uppercase",
          dark ? "text-white/58" : "text-muted",
        )}
      >
        {label}
      </span>
      <button
        ref={triggerRef}
        id={triggerId}
        type="button"
        aria-label={ariaLabel}
        aria-labelledby={ariaLabel ? undefined : labelId}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listboxId : undefined}
        aria-activedescendant={
          open && !searchable && activeValue
            ? optionId(generatedId, activeValue)
            : undefined
        }
        disabled={disabled}
        onClick={() => (open ? closeMenu() : openMenu())}
        onKeyDown={handleNavigationKey}
        className={cn(
          "flex h-11 w-full items-center gap-2 rounded-[0.65rem] border px-3 text-left text-sm shadow-[0_1px_2px_rgb(7_25_34_/_8%)] transition-[border-color,background-color]",
          dark
            ? "border-white/14 bg-[#fffdf7] text-ink hover:border-white/35"
            : "border-ink/16 bg-surface text-ink hover:border-teal/65",
          open && "border-teal ring-2 ring-teal/15",
          "disabled:cursor-not-allowed disabled:bg-paper-deep disabled:opacity-55",
        )}
      >
        {selected ? (
          <span className="flex min-w-0 flex-1 items-baseline gap-2">
            {selected.code ? (
              <span className="shrink-0 font-mono text-[0.78rem] font-semibold tracking-[0.04em] text-midnight">
                {selected.code}
              </span>
            ) : null}
            <span className="truncate font-semibold">{selected.label}</span>
          </span>
        ) : (
          <span className="min-w-0 flex-1 truncate text-muted">
            {placeholder}
          </span>
        )}
        <ChevronDown
          className={cn(
            "size-4 shrink-0 text-muted transition-transform",
            open && "rotate-180",
          )}
          aria-hidden="true"
        />
      </button>

      {open ? (
        <div
          className={cn(
            "absolute top-[calc(100%+0.5rem)] overflow-hidden rounded-[0.8rem] border border-ink/14 bg-surface text-ink shadow-[0_18px_50px_rgb(7_25_34_/_22%)]",
            menuAlign === "end" ? "right-0" : "left-0",
            menuWidth === "wide"
              ? "w-[min(22rem,calc(100vw-2rem))] min-w-full"
              : "w-full",
          )}
        >
          {searchable ? (
            <div className="border-b border-line p-2.5">
              <label className="relative block">
                <Search
                  className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted"
                  aria-hidden="true"
                />
                <span className="sr-only">Search {label.toLowerCase()}</span>
                <input
                  ref={searchRef}
                  type="search"
                  value={query}
                  onChange={(event) => updateQuery(event.target.value)}
                  onKeyDown={handleNavigationKey}
                  aria-label={`Search ${(ariaLabel ?? label).toLowerCase()}`}
                  aria-controls={listboxId}
                  aria-activedescendant={
                    activeValue ? optionId(generatedId, activeValue) : undefined
                  }
                  placeholder={searchPlaceholder}
                  autoComplete="off"
                  className="h-10 w-full rounded-lg border border-ink/14 bg-paper/70 pr-3 pl-9 text-sm text-ink placeholder:text-muted/75"
                />
              </label>
            </div>
          ) : null}

          <div
            id={listboxId}
            role="listbox"
            aria-label={`${label} options`}
            className={cn(
              "max-h-72 overflow-y-auto overscroll-contain p-1.5",
              columns === 2 && "grid grid-cols-2 gap-1",
            )}
          >
            {visibleOptions.map((option) => {
              const active = option.value === activeValue;
              const isSelected = option.value === value;
              return (
                <button
                  key={option.value}
                  id={optionId(generatedId, option.value)}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  aria-label={
                    option.code
                      ? `${option.code} — ${option.label}`
                      : option.label
                  }
                  tabIndex={-1}
                  onPointerMove={() => setActiveValue(option.value)}
                  onClick={() => choose(option.value)}
                  className={cn(
                    "flex min-h-11 w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors",
                    active ? "bg-teal/10" : "hover:bg-paper-deep/65",
                  )}
                >
                  {option.code ? (
                    <span className="w-10 shrink-0 font-mono text-xs font-semibold tracking-[0.04em] text-midnight">
                      {option.code}
                    </span>
                  ) : null}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold">
                      {option.label}
                    </span>
                    {option.detail ? (
                      <span className="mt-0.5 block truncate text-[0.7rem] leading-4 text-muted">
                        {option.detail}
                      </span>
                    ) : null}
                  </span>
                  {option.meta ? (
                    <span className="shrink-0 font-mono text-[0.63rem] text-muted">
                      {option.meta}
                    </span>
                  ) : null}
                  <Check
                    className={cn(
                      "size-4 shrink-0 text-teal",
                      isSelected ? "opacity-100" : "opacity-0",
                    )}
                    aria-hidden="true"
                  />
                </button>
              );
            })}
            {visibleOptions.length === 0 ? (
              <p className="px-3 py-8 text-center text-sm text-muted">
                {emptyText}
              </p>
            ) : null}
          </div>

          {orderedOptions.length > visibleOptions.length ? (
            <p className="border-t border-line bg-paper/60 px-3 py-2 text-[0.68rem] leading-4 text-muted">
              Showing {visibleOptions.length} of {orderedOptions.length}. Search
              by airport code or city to narrow the list.
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
