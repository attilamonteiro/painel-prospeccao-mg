/**
 * Formata um valor numérico em BRL (R$) usando Intl pt-BR.
 */
export function formatBRL(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

/**
 * Formata uma string de data ISO (ou null/inválida) em dd/MM/yyyy (pt-BR).
 * Retorna '—' para null, undefined ou datas inválidas.
 */
export function formatDate(value: string | null | undefined): string {
  if (!value) return '—';

  // Usa Date.UTC ao parsear para evitar drift de fuso horário ao trabalhar
  // apenas com a parte de data (yyyy-MM-dd ou ISO completo).
  const date = new Date(value);
  if (isNaN(date.getTime())) return '—';

  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date);
}

/**
 * Aplica a máscara de CNPJ: 00.000.000/0000-00.
 * Funciona tanto com CNPJ já formatado quanto com string numérica pura.
 */
export function formatCNPJ(value: string): string {
  // Remove qualquer caractere que não seja dígito
  const digits = value.replace(/\D/g, '');

  if (digits.length !== 14) return value; // devolve original se inválido

  return digits.replace(
    /^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,
    '$1.$2.$3/$4-$5',
  );
}
