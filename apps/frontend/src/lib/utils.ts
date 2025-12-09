import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCPF(cpf: string): string {
  const cleaned = cpf.replace(/\D/g, '');
  return cleaned.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
}

export function formatCNPJ(cnpj: string): string {
  const cleaned = cnpj.replace(/\D/g, '');
  return cleaned.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
}

export function formatPhone(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 11) {
    return cleaned.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
  }
  return cleaned.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
}

export function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString('pt-BR');
}

export function formatDateTime(date: string | Date): string {
  return new Date(date).toLocaleString('pt-BR');
}

/**
 * Formata número de processo no padrão CNJ: NNNNNNN-DD.AAAA.J.TT.OOOO
 * @param processo - Número do processo (com ou sem formatação)
 * @returns Número formatado ou string vazia se inválido
 */
export function formatProcessoCNJ(processo: string): string {
  // Remove tudo exceto dígitos
  const cleaned = processo.replace(/\D/g, '');

  // Se não tiver exatamente 20 dígitos, retorna o valor original
  if (cleaned.length !== 20) {
    return processo;
  }

  // Formata: NNNNNNN-DD.AAAA.J.TT.OOOO
  return cleaned.replace(
    /(\d{7})(\d{2})(\d{4})(\d{1})(\d{2})(\d{4})/,
    '$1-$2.$3.$4.$5.$6'
  );
}

/**
 * Aplica máscara CNJ em tempo real durante digitação
 * @param value - Valor atual do input
 * @returns Valor com máscara aplicada
 */
export function maskProcessoCNJ(value: string): string {
  // Remove tudo exceto dígitos
  const cleaned = value.replace(/\D/g, '');

  // Limita a 20 dígitos
  const limited = cleaned.slice(0, 20);

  // Aplica máscara progressivamente conforme digita
  let formatted = limited;

  if (limited.length > 7) {
    formatted = `${limited.slice(0, 7)}-${limited.slice(7)}`;
  }
  if (limited.length > 9) {
    formatted = `${limited.slice(0, 7)}-${limited.slice(7, 9)}.${limited.slice(9)}`;
  }
  if (limited.length > 13) {
    formatted = `${limited.slice(0, 7)}-${limited.slice(7, 9)}.${limited.slice(9, 13)}.${limited.slice(13)}`;
  }
  if (limited.length > 14) {
    formatted = `${limited.slice(0, 7)}-${limited.slice(7, 9)}.${limited.slice(9, 13)}.${limited.slice(13, 14)}.${limited.slice(14)}`;
  }
  if (limited.length > 16) {
    formatted = `${limited.slice(0, 7)}-${limited.slice(7, 9)}.${limited.slice(9, 13)}.${limited.slice(13, 14)}.${limited.slice(14, 16)}.${limited.slice(16)}`;
  }

  return formatted;
}

/**
 * Valida se o número do processo está no formato CNJ correto
 * @param processo - Número do processo
 * @returns true se válido, false caso contrário
 */
export function validarProcessoCNJ(processo: string): boolean {
  // Remove tudo exceto dígitos
  const cleaned = processo.replace(/\D/g, '');

  // Deve ter exatamente 20 dígitos
  return cleaned.length === 20;
}
