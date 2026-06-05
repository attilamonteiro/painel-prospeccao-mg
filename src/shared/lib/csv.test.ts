import { afterEach, describe, expect, it, vi } from 'vitest';
import { downloadCSV, generateCSV } from './csv';

const BOM = '﻿';

describe('generateCSV', () => {
  it('inclui BOM UTF-8 no início', () => {
    const csv = generateCSV([{ nome: 'Teste' }]);
    expect(csv.startsWith(BOM)).toBe(true);
  });

  it('gera cabeçalho e linha a partir das chaves do objeto', () => {
    const csv = generateCSV([{ nome: 'Prefeitura', valor: 1000 }]);
    const lines = csv.replace(BOM, '').trim().split('\n');
    expect(lines[0]).toBe('nome;valor');
    expect(lines[1]).toBe('Prefeitura;1000');
  });

  it('usa labels customizados quando headers são fornecidos', () => {
    const rows = [{ cnpj: '12345678000195', nome: 'Órgão X' }];
    const headers = [
      { key: 'cnpj', label: 'CNPJ' },
      { key: 'nome', label: 'Razão Social' },
    ];
    const csv = generateCSV(rows, headers);
    const lines = csv.replace(BOM, '').trim().split('\n');
    expect(lines[0]).toBe('CNPJ;Razão Social');
    expect(lines[1]).toBe('12345678000195;Órgão X');
  });

  it('escapa células com ponto-e-vírgula', () => {
    const csv = generateCSV([{ descricao: 'A; B; C' }]);
    expect(csv).toContain('"A; B; C"');
  });

  it('escapa células com aspas duplas (duplicando-as)', () => {
    const csv = generateCSV([{ descricao: 'Diz "olá"' }]);
    expect(csv).toContain('"Diz ""olá"""');
  });

  it('escapa células com quebra de linha', () => {
    const csv = generateCSV([{ descricao: 'Linha 1\nLinha 2' }]);
    expect(csv).toContain('"Linha 1\nLinha 2"');
  });

  it('representa null e undefined como string vazia', () => {
    const csv = generateCSV([{ a: null, b: undefined }]);
    const dataLine = csv.replace(BOM, '').trim().split('\n')[1];
    expect(dataLine).toBe(';');
  });

  it('retorna apenas BOM para array vazio sem headers', () => {
    const csv = generateCSV([]);
    expect(csv).toBe(BOM);
  });

  it('retorna BOM + cabeçalho para array vazio com headers', () => {
    const csv = generateCSV([], [{ key: 'id', label: 'ID' }]);
    expect(csv).toBe(`${BOM}ID\n`);
  });

  it('usa separador ponto-e-vírgula entre colunas', () => {
    const csv = generateCSV([{ a: '1', b: '2', c: '3' }]);
    const header = csv.replace(BOM, '').split('\n')[0];
    expect(header).toBe('a;b;c');
  });
});

describe('downloadCSV', () => {
  // Salva e restaura globals entre testes
  const originalWindow = globalThis.window;
  const originalDocument = globalThis.document;
  const originalURL = globalThis.URL;

  afterEach(() => {
    vi.restoreAllMocks();
    Object.defineProperty(globalThis, 'window', {
      value: originalWindow,
      writable: true,
      configurable: true,
    });
    Object.defineProperty(globalThis, 'document', {
      value: originalDocument,
      writable: true,
      configurable: true,
    });
    Object.defineProperty(globalThis, 'URL', {
      value: originalURL,
      writable: true,
      configurable: true,
    });
  });

  it('não executa quando window não está definido (SSR)', () => {
    Object.defineProperty(globalThis, 'window', {
      value: undefined,
      writable: true,
      configurable: true,
    });

    // Não deve lançar erro mesmo sem window
    expect(() => downloadCSV('test.csv', 'conteudo')).not.toThrow();
  });

  it('cria Blob com tipo text/csv e dispara download', () => {
    // Simula ambiente browser com mocks mínimos
    const clickMock = vi.fn();
    const anchor = {
      href: '',
      download: '',
      style: { display: '' },
      click: clickMock,
    } as unknown as HTMLAnchorElement;

    const appendChildMock = vi.fn();
    const removeChildMock = vi.fn();
    const createElementMock = vi.fn().mockReturnValue(anchor);

    Object.defineProperty(globalThis, 'window', {
      value: {},
      writable: true,
      configurable: true,
    });

    Object.defineProperty(globalThis, 'document', {
      value: {
        createElement: createElementMock,
        body: {
          appendChild: appendChildMock,
          removeChild: removeChildMock,
        },
      },
      writable: true,
      configurable: true,
    });

    const createObjectURLMock = vi.fn().mockReturnValue('blob:mock-url');
    const revokeObjectURLMock = vi.fn();

    // Blob precisa ser uma class/constructor válida
    class MockBlob {
      constructor() {
        // intentionally empty
      }
    }

    Object.defineProperty(globalThis, 'Blob', {
      value: MockBlob,
      writable: true,
      configurable: true,
    });

    Object.defineProperty(globalThis, 'URL', {
      value: {
        createObjectURL: createObjectURLMock,
        revokeObjectURL: revokeObjectURLMock,
      },
      writable: true,
      configurable: true,
    });

    downloadCSV('orgaos.csv', `${BOM}nome\nTeste\n`);

    expect(createElementMock).toHaveBeenCalledWith('a');
    expect(anchor.download).toBe('orgaos.csv');
    expect(anchor.href).toBe('blob:mock-url');
    expect(clickMock).toHaveBeenCalledOnce();
    expect(appendChildMock).toHaveBeenCalledWith(anchor);
    expect(removeChildMock).toHaveBeenCalledWith(anchor);
    expect(revokeObjectURLMock).toHaveBeenCalledWith('blob:mock-url');
  });
});
