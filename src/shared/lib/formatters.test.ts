import { describe, expect, it } from 'vitest';
import { formatBRL, formatCNPJ, formatDate } from './formatters';

describe('formatBRL', () => {
  it('formata zero corretamente', () => {
    expect(formatBRL(0)).toMatch(/R\$\s*0/);
  });

  it('formata valor inteiro em BRL', () => {
    const result = formatBRL(1000);
    expect(result).toMatch(/R\$/);
    expect(result).toMatch(/1[\.,]000/);
  });

  it('formata valor com centavos', () => {
    const result = formatBRL(1234.56);
    expect(result).toMatch(/R\$/);
    expect(result).toMatch(/56/);
  });

  it('formata valor negativo', () => {
    const result = formatBRL(-500);
    expect(result).toMatch(/-/);
    expect(result).toMatch(/500/);
  });

  it('formata valor grande', () => {
    const result = formatBRL(1_000_000);
    expect(result).toMatch(/R\$/);
    // Deve conter separadores de milhar
    expect(result.replace(/\s/g, '')).toMatch(/1[.,]000[.,]000/);
  });
});

describe('formatDate', () => {
  it('retorna "—" para null', () => {
    expect(formatDate(null)).toBe('—');
  });

  it('retorna "—" para undefined', () => {
    expect(formatDate(undefined)).toBe('—');
  });

  it('retorna "—" para string vazia', () => {
    expect(formatDate('')).toBe('—');
  });

  it('retorna "—" para data inválida', () => {
    expect(formatDate('not-a-date')).toBe('—');
  });

  it('formata data ISO para dd/MM/yyyy', () => {
    expect(formatDate('2024-03-15')).toBe('15/03/2024');
  });

  it('formata data ISO completa (com hora) para dd/MM/yyyy', () => {
    const result = formatDate('2024-06-01T00:00:00.000Z');
    expect(result).toBe('01/06/2024');
  });

  it('formata 1o de janeiro corretamente', () => {
    expect(formatDate('2023-01-01')).toBe('01/01/2023');
  });
});

describe('formatCNPJ', () => {
  it('aplica máscara em CNPJ numérico puro', () => {
    expect(formatCNPJ('12345678000195')).toBe('12.345.678/0001-95');
  });

  it('aplica máscara em CNPJ já formatado (remove e reaplica)', () => {
    expect(formatCNPJ('12.345.678/0001-95')).toBe('12.345.678/0001-95');
  });

  it('devolve original se string não tiver 14 dígitos', () => {
    const invalid = '123456';
    expect(formatCNPJ(invalid)).toBe(invalid);
  });

  it('trata CNPJ com zeros à esquerda', () => {
    expect(formatCNPJ('00000000000191')).toBe('00.000.000/0001-91');
  });
});
