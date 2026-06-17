/** @format */
/**
 * Unit Tests — src/utils/excelLogic.tsx  +  src/utils/sound.ts
 * Coverage target: ~90%+ of both files
 */

// ─── excelLogic.tsx ───────────────────────────────────────────────────────────

import {
  smartClean,
  hexToExcelColor,
  getContrastColor,
  normID,
  normName,
  generateRandomColor,
  evaluateCheckbox,
  getBaseStyle,
} from '../../src/utils/excelLogic';

describe('smartClean', () => {
  it('returns empty string for null', () => expect(smartClean(null)).toBe(''));
  it('returns empty string for undefined', () => expect(smartClean(undefined)).toBe(''));
  it('trims whitespace', () => expect(smartClean('  hello  ')).toBe('hello'));
  it('replaces _x000D_ with newline', () => {
    expect(smartClean('line1_x000D_line2')).toBe('line1\nline2');
  });
  it('handles _x000d_ (lowercase)', () => {
    expect(smartClean('a_x000d_b')).toBe('a\nb');
  });
  it('normalises \\r\\n to \\n', () => {
    expect(smartClean('a\r\nb')).toBe('a\nb');
  });
  it('normalises \\r to \\n', () => {
    expect(smartClean('a\rb')).toBe('a\nb');
  });
  it('converts numbers to strings', () => {
    expect(smartClean(42)).toBe('42');
  });
  it('converts booleans to strings', () => {
    expect(smartClean(true)).toBe('true');
  });
  it('returns empty string for empty string', () => {
    expect(smartClean('')).toBe('');
  });
});

describe('hexToExcelColor', () => {
  it('strips # and uppercases', () => {
    expect(hexToExcelColor('#ff0000')).toBe('FF0000');
  });
  it('handles already uppercase hex', () => {
    expect(hexToExcelColor('#ABCDEF')).toBe('ABCDEF');
  });
  it('returns FFFFFF for empty string', () => {
    expect(hexToExcelColor('')).toBe('FFFFFF');
  });
  it('handles hex without #', () => {
    expect(hexToExcelColor('00ff00')).toBe('00FF00');
  });
});

describe('getContrastColor', () => {
  it('returns 000000 (black) for light colours', () => {
    expect(getContrastColor('#FFFFFF')).toBe('000000');
    expect(getContrastColor('#FFFF00')).toBe('000000');
  });
  it('returns FFFFFF (white) for dark colours', () => {
    expect(getContrastColor('#000000')).toBe('FFFFFF');
    expect(getContrastColor('#0000FF')).toBe('FFFFFF');
  });
  it('returns 000000 for string shorter than 6 chars', () => {
    expect(getContrastColor('#FFF')).toBe('000000');
  });
  it('returns 000000 for empty string', () => {
    expect(getContrastColor('')).toBe('000000');
  });
  it('handles hex without #', () => {
    const result = getContrastColor('FFFFFF');
    expect(['000000', 'FFFFFF']).toContain(result);
  });
});

describe('normID', () => {
  it('lowercases and removes special chars', () => {
    expect(normID('ABC-123!')).toBe('abc123');
  });
  it('removes trailing .0', () => {
    expect(normID('42.0')).toBe('42');
  });
  it('keeps internal dots', () => {
    expect(normID('1.2.3')).toBe('1.2.3');
  });
  it('handles null/undefined', () => {
    expect(normID(null)).toBe('');
    expect(normID(undefined)).toBe('');
  });
  it('handles numbers', () => {
    expect(normID(5)).toBe('5');
  });
});

describe('normName', () => {
  it('lowercases', () => expect(normName('JOÃO')).not.toMatch(/[A-Z]/));
  it('removes accents', () => expect(normName('ção')).toBe('cao'));
  it('trims whitespace', () => expect(normName('  abc  ')).toBe('abc'));
  it('handles null', () => expect(normName(null)).toBe(''));
  it('handles _x000D_ via smartClean', () => {
    expect(normName('abc_x000D_def')).toContain('abc');
  });
});

describe('generateRandomColor', () => {
  it('returns a string starting with #', () => {
    expect(generateRandomColor()).toMatch(/^#[0-9A-F]{6}$/i);
  });
  it('generates different values on repeated calls (probabilistic)', () => {
    const colors = new Set(Array.from({ length: 10 }, () => generateRandomColor()));
    expect(colors.size).toBeGreaterThan(1);
  });
});

describe('evaluateCheckbox', () => {
  it('returns false for null', () => expect(evaluateCheckbox(null)).toBe(false));
  it('returns false for undefined', () => expect(evaluateCheckbox(undefined)).toBe(false));
  it('returns true for boolean true', () => expect(evaluateCheckbox(true)).toBe(true));
  it('returns false for boolean false', () => expect(evaluateCheckbox(false)).toBe(false));
  it('returns true for number 1', () => expect(evaluateCheckbox(1)).toBe(true));
  it('returns false for other numbers', () => expect(evaluateCheckbox(0)).toBe(false));
  it('returns true for string "true"', () => expect(evaluateCheckbox('true')).toBe(true));
  it('returns true for string "verdadeiro"', () => expect(evaluateCheckbox('verdadeiro')).toBe(true));
  it('returns true for string "1"', () => expect(evaluateCheckbox('1')).toBe(true));
  it('returns true for string "sim"', () => expect(evaluateCheckbox('sim')).toBe(true));
  it('returns true for string "ok"', () => expect(evaluateCheckbox('ok')).toBe(true));
  it('returns false for "false"', () => expect(evaluateCheckbox('false')).toBe(false));
  it('returns true for uppercase "SIM"', () => expect(evaluateCheckbox('SIM')).toBe(true));
});

describe('getBaseStyle', () => {
  it('returns style object with alignment.wrapText = true', () => {
    const style = getBaseStyle();
    expect(style.alignment.wrapText).toBe(true);
  });

  it('includes fill when backgroundColor is provided', () => {
    const style = getBaseStyle('#FF0000');
    expect(style.fill).toBeDefined();
    expect(style.fill?.fgColor.rgb).toBe('FF0000');
  });

  it('fill is undefined when no backgroundColor', () => {
    const style = getBaseStyle();
    expect(style.fill).toBeUndefined();
  });

  it('uses custom textColor in font', () => {
    const style = getBaseStyle(undefined, '#0000FF');
    expect(style.font.color.rgb).toBe('0000FF');
  });

  it('defaults font color to 000000 when no textColor', () => {
    const style = getBaseStyle();
    expect(style.font.color.rgb).toBe('000000');
  });

  it('has border styles defined', () => {
    const style = getBaseStyle();
    expect(style.border.top.style).toBe('thin');
  });
});

// ─── sound.ts ─────────────────────────────────────────────────────────────────

import { playNotificationSound } from '../../src/utils/sound';

describe('playNotificationSound', () => {
  it('does not throw when AudioContext is not available', () => {
    const original = (window as any).AudioContext;
    delete (window as any).AudioContext;
    delete (window as any).webkitAudioContext;
    expect(() => playNotificationSound()).not.toThrow();
    (window as any).AudioContext = original;
  });

  it('calls AudioContext and creates oscillator when available', () => {
    const stopMock = jest.fn();
    const startMock = jest.fn();
    const setValueAtTimeMock = jest.fn();
    const linearRampMock = jest.fn();
    const exponentialRampMock = jest.fn();
    const connectMock = jest.fn();

    const mockOscillator = {
      type: '',
      frequency: { setValueAtTime: setValueAtTimeMock },
      connect: connectMock,
      start: startMock,
      stop: stopMock,
    };

    const mockGain = {
      gain: {
        setValueAtTime: setValueAtTimeMock,
        linearRampToValueAtTime: linearRampMock,
        exponentialRampToValueAtTime: exponentialRampMock,
      },
      connect: connectMock,
    };

    const mockCtx = {
      currentTime: 0,
      destination: {},
      createOscillator: jest.fn().mockReturnValue(mockOscillator),
      createGain: jest.fn().mockReturnValue(mockGain),
    };

    (window as any).AudioContext = jest.fn().mockImplementation(() => mockCtx);

    expect(() => playNotificationSound()).not.toThrow();
    expect(mockCtx.createOscillator).toHaveBeenCalledTimes(2); // Two tones
    expect(startMock).toHaveBeenCalledTimes(2);

    delete (window as any).AudioContext;
  });

  it('swallows errors gracefully', () => {
    (window as any).AudioContext = jest.fn().mockImplementation(() => {
      throw new Error('AudioContext failed');
    });
    expect(() => playNotificationSound()).not.toThrow();
    delete (window as any).AudioContext;
  });
});
