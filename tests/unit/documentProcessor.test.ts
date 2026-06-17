/** @format */
/**
 * Unit Tests — src/utils/documentProcessor.ts
 * Coverage target: ~90%+ of the 71 lines
 */

import {
  parseAssignmentRules,
  extractAnswersFromFile,
  findEmployeeFile,
  downloadDocument,
  readFileAsText,
  processDocuments,
} from '../../src/utils/documentProcessor';

// ─── parseAssignmentRules ─────────────────────────────────────────────────────

describe('parseAssignmentRules', () => {
  it('parses a single valid rule', () => {
    const input = 'João Silva 1 a 5';
    const result = parseAssignmentRules(input);
    expect(result).toEqual([{ name: 'João Silva', start: 1, end: 5 }]);
  });

  it('parses multiple rules from multi-line text', () => {
    const input = 'Ana Costa 1 a 10\nBruno Lima 11 a 20';
    const result = parseAssignmentRules(input);
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ name: 'Ana Costa', start: 1, end: 10 });
    expect(result[1]).toEqual({ name: 'Bruno Lima', start: 11, end: 20 });
  });

  it('ignores empty lines', () => {
    const input = '\nJoão Silva 1 a 5\n\n';
    const result = parseAssignmentRules(input);
    expect(result).toHaveLength(1);
  });

  it('ignores lines that do not match the pattern', () => {
    const input = 'this is not a valid rule\nJoão 1 a 3';
    const result = parseAssignmentRules(input);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('João');
  });

  it('handles decimal ranges', () => {
    const input = 'Maria 1.5 a 3.5';
    const result = parseAssignmentRules(input);
    expect(result[0].start).toBe(1.5);
    expect(result[0].end).toBe(3.5);
  });

  it('returns empty array for empty string', () => {
    expect(parseAssignmentRules('')).toEqual([]);
  });

  it('returns empty array for whitespace-only string', () => {
    expect(parseAssignmentRules('   \n  \n  ')).toEqual([]);
  });
});

// ─── extractAnswersFromFile ───────────────────────────────────────────────────

describe('extractAnswersFromFile', () => {
  const content = `1: Resposta da pergunta 1
2: Resposta da pergunta 2
3: Resposta da pergunta 3
4: Resposta da pergunta 4`;

  it('extracts answers within the specified range', () => {
    const result = extractAnswersFromFile(content, 1, 3);
    expect(result.has('1')).toBe(true);
    expect(result.get('1')).toBe('Resposta da pergunta 1');
    expect(result.has('3')).toBe(true);
    expect(result.has('4')).toBe(false);
  });

  it('returns empty map when no lines match range', () => {
    const result = extractAnswersFromFile(content, 10, 20);
    expect(result.size).toBe(0);
  });

  it('handles multi-line answers (continuation lines)', () => {
    const multiLine = `1: Primeira linha da resposta
Continuação da resposta
2: Segunda resposta`;
    const result = extractAnswersFromFile(multiLine, 1, 1);
    expect(result.get('1')).toContain('Continuação da resposta');
  });

  it('handles last question at end of file', () => {
    const input = '5: Última resposta';
    const result = extractAnswersFromFile(input, 5, 5);
    expect(result.get('5')).toBe('Última resposta');
  });

  it('handles empty content', () => {
    const result = extractAnswersFromFile('', 1, 10);
    expect(result.size).toBe(0);
  });

  it('handles question with empty answer', () => {
    const input = '1:';
    const result = extractAnswersFromFile(input, 1, 5);
    expect(result.has('1')).toBe(true);
  });
});

// ─── findEmployeeFile ─────────────────────────────────────────────────────────

describe('findEmployeeFile', () => {
  const makeFile = (name: string) => ({ name } as File);

  it('finds a file whose name includes the employee name', () => {
    const files = [makeFile('joao_silva.txt'), makeFile('ana_costa.txt')];
    const result = findEmployeeFile('joao_silva', files);
    expect(result).toBeDefined();
    expect(result?.name).toBe('joao_silva.txt');
  });

  it('is case-insensitive', () => {
    const files = [makeFile('Ana_Costa.txt')];
    const result = findEmployeeFile('ANA_COSTA', files);
    expect(result?.name).toBe('Ana_Costa.txt');
  });

  it('returns undefined when no file matches', () => {
    const files = [makeFile('pedro.txt')];
    const result = findEmployeeFile('maria', files);
    expect(result).toBeUndefined();
  });

  it('returns undefined for empty file list', () => {
    expect(findEmployeeFile('joao', [])).toBeUndefined();
  });
});

// ─── downloadDocument ─────────────────────────────────────────────────────────

describe('downloadDocument', () => {
  let createObjectURLMock: jest.Mock;
  let revokeObjectURLMock: jest.Mock;
  let appendChildMock: jest.Mock;
  let removeChildMock: jest.Mock;
  let clickMock: jest.Mock;

  beforeEach(() => {
    createObjectURLMock = jest.fn().mockReturnValue('blob:http://localhost/fake');
    revokeObjectURLMock = jest.fn();
    clickMock = jest.fn();
    appendChildMock = jest.fn();
    removeChildMock = jest.fn();

    Object.defineProperty(window, 'URL', {
      writable: true,
      value: { createObjectURL: createObjectURLMock, revokeObjectURL: revokeObjectURLMock },
    });

    jest.spyOn(document, 'createElement').mockReturnValue({
      href: '',
      download: '',
      click: clickMock,
    } as unknown as HTMLAnchorElement);

    jest.spyOn(document.body, 'appendChild').mockImplementation(appendChildMock);
    jest.spyOn(document.body, 'removeChild').mockImplementation(removeChildMock);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('creates a blob URL, clicks the link, and revokes the URL', () => {
    downloadDocument('hello world', 'test.txt');
    expect(createObjectURLMock).toHaveBeenCalledWith(expect.any(Blob));
    expect(clickMock).toHaveBeenCalled();
    expect(revokeObjectURLMock).toHaveBeenCalledWith('blob:http://localhost/fake');
    expect(appendChildMock).toHaveBeenCalled();
    expect(removeChildMock).toHaveBeenCalled();
  });

  it('sets the correct filename as download attribute', () => {
    const linkEl: any = { href: '', download: '', click: clickMock };
    jest.spyOn(document, 'createElement').mockReturnValue(linkEl as HTMLAnchorElement);
    downloadDocument('content', 'report.txt');
    expect(linkEl.download).toBe('report.txt');
  });
});

// ─── readFileAsText ────────────────────────────────────────────────────────────

describe('readFileAsText', () => {
  it('reads a file successfully', async () => {
    const file = new File(['hello world'], 'test.txt', { type: 'text/plain' });
    const result = await readFileAsText(file);
    expect(result).toBe('hello world');
  });

  it('handles reader error', async () => {
    const file = new File([''], 'test.txt');
    const mockReader = {
      readAsText: jest.fn().mockImplementation(function(this: any) {
        if (this.onerror) {
          this.onerror(new Error('Read error'));
        }
      })
    };
    const spy = jest.spyOn(global, 'FileReader').mockImplementation(() => mockReader as any);
    
    await expect(readFileAsText(file)).rejects.toThrow('Read error');
    spy.mockRestore();
  });
});

// ─── processDocuments ─────────────────────────────────────────────────────────

describe('processDocuments', () => {
  it('processes documents correctly and replaces tags', async () => {
    const templateFile = new File(['Template content {resposta 1} and {resposta 2}'], 'template.txt');
    const employeeFiles = [
      new File(['1: Answer one\n2: Answer two'], 'joao.txt')
    ];
    const assignments = [
      { name: 'joao', start: 1, end: 2 }
    ];

    const result = await processDocuments(templateFile, employeeFiles, assignments);
    expect(result).toContain('Template content Answer one and Answer two');
  });

  it('replaces missing tags with [Resposta não encontrada]', async () => {
    const templateFile = new File(['Template content {resposta 1} and {resposta 3}'], 'template.txt');
    const employeeFiles = [
      new File(['1: Answer one'], 'joao.txt')
    ];
    const assignments = [
      { name: 'joao', start: 1, end: 2 }
    ];

    const result = await processDocuments(templateFile, employeeFiles, assignments);
    expect(result).toContain('Template content Answer one and [Resposta não encontrada]');
  });
});
