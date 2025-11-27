'use client';

import * as React from 'react';

const DropdownMenuContext = React.createContext<{
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}>({
  isOpen: false,
  setIsOpen: () => {}
});

export interface DropdownMenuProps {
  children: React.ReactNode;
}

export function DropdownMenu({ children }: DropdownMenuProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  // Fecha ao clicar fora
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  return (
    <DropdownMenuContext.Provider value={{ isOpen, setIsOpen }}>
      <div className="relative inline-block text-left" ref={dropdownRef}>
        {children}
      </div>
    </DropdownMenuContext.Provider>
  );
}

export interface DropdownMenuTriggerProps {
  asChild?: boolean;
  children: React.ReactNode;
}

export function DropdownMenuTrigger({ children }: DropdownMenuTriggerProps) {
  const { isOpen, setIsOpen } = React.useContext(DropdownMenuContext);

  return (
    <div onClick={() => setIsOpen(!isOpen)}>
      {children}
    </div>
  );
}

export interface DropdownMenuContentProps {
  align?: 'start' | 'center' | 'end';
  children: React.ReactNode;
}

export function DropdownMenuContent({ align = 'end', children }: DropdownMenuContentProps) {
  const { isOpen, setIsOpen } = React.useContext(DropdownMenuContext);

  if (!isOpen) return null;

  const alignClass = {
    start: 'left-0',
    center: 'left-1/2 -translate-x-1/2',
    end: 'right-0'
  }[align];

  return (
    <div className={`absolute ${alignClass} mt-2 w-56 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-50`}>
      <div className="py-1" role="menu">
        {children}
      </div>
    </div>
  );
}

export interface DropdownMenuItemProps {
  onClick?: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}

export function DropdownMenuItem({ onClick, disabled = false, children }: DropdownMenuItemProps) {
  const { setIsOpen } = React.useContext(DropdownMenuContext);

  const handleClick = () => {
    if (!disabled && onClick) {
      onClick();
      setIsOpen(false);
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={disabled}
      className={`
        flex items-center w-full px-4 py-2 text-sm text-left
        ${disabled
          ? 'text-gray-400 cursor-not-allowed'
          : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
        }
        transition-colors
      `}
      role="menuitem"
    >
      {children}
    </button>
  );
}

export function DropdownMenuLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
      {children}
    </div>
  );
}

export function DropdownMenuSeparator() {
  return <div className="h-px my-1 bg-gray-200" />;
}
