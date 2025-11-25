'use client';

import React, { useState, useMemo } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PasswordInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  showStrength?: boolean;
}

export function PasswordInput({
  className,
  showStrength = false,
  ...props
}: PasswordInputProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [password, setPassword] = useState('');

  // Calcular força da senha
  const passwordStrength = useMemo(() => {
    if (!showStrength || !password) return null;

    let strength = 0;
    const checks = {
      length: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      number: /[0-9]/.test(password),
      special: /[!@#$%^&*(),.?":{}|<>]/.test(password),
    };

    // Contar quantas verificações passaram
    strength = Object.values(checks).filter(Boolean).length;

    let label = '';
    let color = '';

    if (strength === 0) {
      return null;
    } else if (strength <= 2) {
      label = 'Fraca';
      color = 'bg-red-500';
    } else if (strength === 3) {
      label = 'Média';
      color = 'bg-yellow-500';
    } else if (strength === 4) {
      label = 'Boa';
      color = 'bg-blue-500';
    } else {
      label = 'Forte';
      color = 'bg-green-500';
    }

    return {
      strength,
      label,
      color,
      checks,
    };
  }, [password, showStrength]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPassword(e.target.value);
    if (props.onChange) {
      props.onChange(e);
    }
  };

  return (
    <div className="w-full">
      <div className="relative">
        <input
          {...props}
          type={showPassword ? 'text' : 'password'}
          value={password}
          onChange={handleChange}
          className={cn(
            'flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm',
            'ring-offset-white file:border-0 file:bg-transparent file:text-sm file:font-medium',
            'placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-2',
            'focus-visible:ring-blue-500 focus-visible:ring-offset-2',
            'disabled:cursor-not-allowed disabled:opacity-50 pr-10',
            className
          )}
        />
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-gray-100 rounded-r-md transition-colors"
          tabIndex={-1}
        >
          {showPassword ? (
            <EyeOff className="h-4 w-4 text-gray-500" />
          ) : (
            <Eye className="h-4 w-4 text-gray-500" />
          )}
        </button>
      </div>

      {/* Indicador de força da senha */}
      {showStrength && passwordStrength && (
        <div className="mt-2 space-y-2">
          <div className="flex items-center gap-2">
            <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className={cn('h-full transition-all duration-300', passwordStrength.color)}
                style={{ width: `${(passwordStrength.strength / 5) * 100}%` }}
              />
            </div>
            <span className={cn('text-xs font-medium', {
              'text-red-600': passwordStrength.label === 'Fraca',
              'text-yellow-600': passwordStrength.label === 'Média',
              'text-blue-600': passwordStrength.label === 'Boa',
              'text-green-600': passwordStrength.label === 'Forte',
            })}>
              {passwordStrength.label}
            </span>
          </div>

          {/* Checklist de requisitos */}
          <div className="text-xs space-y-1">
            <div className={cn('flex items-center gap-1', passwordStrength.checks.length ? 'text-green-600' : 'text-gray-500')}>
              <span>{passwordStrength.checks.length ? '✓' : '○'}</span>
              <span>Mínimo 8 caracteres</span>
            </div>
            <div className={cn('flex items-center gap-1', passwordStrength.checks.uppercase ? 'text-green-600' : 'text-gray-500')}>
              <span>{passwordStrength.checks.uppercase ? '✓' : '○'}</span>
              <span>Uma letra maiúscula</span>
            </div>
            <div className={cn('flex items-center gap-1', passwordStrength.checks.special ? 'text-green-600' : 'text-gray-500')}>
              <span>{passwordStrength.checks.special ? '✓' : '○'}</span>
              <span>Um caractere especial (!@#$%...)</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
