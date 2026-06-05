/**
 * Escapa um valor de célula CSV:
 * - Converte para string
 * - Se contém ';', '"' ou quebra de linha → envolve em aspas duplas e duplica aspas internas
 */
function escapeCsvCell(value: unknown): string {
  const str = value === null || value === undefined ? '' : String(value);
  if (str.includes(';') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Gera o conteúdo de um arquivo CSV a partir de um array de objetos.
 *
 * @param rows    - Linhas de dados
 * @param headers - Mapeamento opcional de { key, label }. Se omitido, usa as chaves do
 *                  primeiro objeto como cabeçalho (sem rótulo customizado).
 * @returns String CSV com BOM UTF-8, separador ';' e escaping correto.
 */
export function generateCSV(
  rows: Record<string, unknown>[],
  headers?: { key: string; label: string }[],
): string {
  const BOM = '﻿';

  if (rows.length === 0) {
    if (!headers || headers.length === 0) return BOM;
    const headerRow = headers.map((h) => escapeCsvCell(h.label)).join(';');
    return BOM + headerRow + '\n';
  }

  const cols: { key: string; label: string }[] = headers
    ? headers
    : Object.keys(rows[0]).map((key) => ({ key, label: key }));

  const headerRow = cols.map((c) => escapeCsvCell(c.label)).join(';');

  const dataRows = rows.map((row) =>
    cols.map((c) => escapeCsvCell(row[c.key])).join(';'),
  );

  return BOM + [headerRow, ...dataRows].join('\n') + '\n';
}

/**
 * Dispara o download de um arquivo CSV no browser.
 * É seguro chamar em SSR: a função verifica typeof window antes de executar.
 *
 * @param filename - Nome do arquivo (ex.: "orgaos.csv")
 * @param content  - Conteúdo CSV (já com BOM, gerado por generateCSV)
 */
export function downloadCSV(filename: string, content: string): void {
  if (typeof window === 'undefined') return;

  const blob = new Blob([content], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.style.display = 'none';

  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);

  // Libera o object URL após o clique
  URL.revokeObjectURL(url);
}
