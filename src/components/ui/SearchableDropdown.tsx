import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import styled from "styled-components";

const OptionsContainer = styled.div`
  max-height: 240px;
  overflow-y: auto;
  padding: 4px;
  scrollbar-width: thin;
  scrollbar-color: hsl(var(--muted-foreground) / 0.35) transparent;

  &::-webkit-scrollbar {
    width: 6px;
  }

  &::-webkit-scrollbar-track {
    background: transparent;
  }

  &::-webkit-scrollbar-thumb {
    background: hsl(var(--muted-foreground) / 0.35);
    border-radius: 9999px;
  }

  &::-webkit-scrollbar-thumb:hover {
    background: hsl(var(--muted-foreground) / 0.55);
  }
`;

interface SearchableDropdownOption {
  id: string;
  name: string;
}

interface SearchableDropdownProps {
  value: string;
  options: SearchableDropdownOption[];
  placeholder?: string;
  searchPlaceholder?: string;
  disabled?: boolean;
  loading?: boolean;
  onChange: (value: string) => void;
  className?: string;
}

const SearchableDropdown = ({
  value,
  options,
  placeholder = "Select...",
  searchPlaceholder = "Search...",
  disabled = false,
  loading = false,
  onChange,
  className,
}: SearchableDropdownProps) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const selectedOption = options.find(option => option.id === value);
  const filteredOptions = options.filter(option =>
    option.name.toLowerCase().includes(search.toLowerCase())
  );

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    if (!open) {
      setSearch("");
    }
  }, [open]);

  const handleSelect = (id: string) => {
    onChange(id);
    setOpen(false);
  };

  return (
    <div
      ref={containerRef}
      className={cn("relative w-full", className)}
    >
      <button
        type="button"
        disabled={disabled || loading}
        onClick={() => setOpen(prev => !prev)}
        className={cn(
          "flex h-10 w-full items-center justify-between",
          "rounded-md border border-input",
          "bg-background px-3 text-sm",
          "text-foreground",
          "transition-colors",
          "hover:bg-muted/50",
          "focus:outline-none focus:ring-2 focus:ring-ring",
          "disabled:cursor-not-allowed disabled:opacity-50"
        )}
      >
        <span
          className={cn(
            "truncate",
            !selectedOption && "text-muted-foreground"
          )}
        >
          {loading
            ? "Loading..."
            : selectedOption?.name || placeholder}
        </span>

        <ChevronDown
          className={cn(
            "ml-2 h-4 w-4 shrink-0 text-muted-foreground",
            "transition-transform",
            open && "rotate-180"
          )}
        />
      </button>

      {open && !disabled && !loading && (
        <div
          className="
            absolute left-0 right-0 top-full z-50 mt-1
            overflow-hidden rounded-md
            border border-border
            bg-popover text-popover-foreground
            shadow-lg
          "
        >
          <div className="border-b border-border p-2">
            <div className="relative">
              <Search
                className="
                  absolute left-3 top-1/2
                  h-4 w-4 -translate-y-1/2
                  text-muted-foreground
                "
              />

              <Input
                autoFocus
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder={searchPlaceholder}
                className="h-9 pl-9"
              />
            </div>
          </div>

          <OptionsContainer>
            {filteredOptions.length === 0 ? (
              <div className="px-3 py-6 text-center text-sm text-muted-foreground">
                No results found.
              </div>
            ) : (
              filteredOptions.map(option => {
                const selected = option.id === value;

                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => handleSelect(option.id)}
                    className="
                      flex w-full items-center justify-between
                      rounded-sm px-3 py-2
                      text-left text-sm
                      hover:bg-accent
                      hover:text-accent-foreground
                    "
                  >
                    <span className="truncate">
                      {option.name}
                    </span>

                    {selected && (
                      <Check
                        className="
                          ml-2 h-4 w-4
                          shrink-0 text-primary
                        "
                      />
                    )}
                  </button>
                );
              })
            )}
          </OptionsContainer>
        </div>
      )}
    </div>
  );
};

export default SearchableDropdown;