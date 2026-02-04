import * as XLSX from 'xlsx-js-style';

/**
 * Limpa strings do Excel, removendo códigos de quebra de linha internos (_x000D_)
 * e normalizando espaços em branco.
 */
export const smartClean = (val: any): string => {
  if (val === null || val === undefined) return "";
  
  // Converte para string e remove o código infame _x000D_ (case insensitive)
  // Substitui por uma quebra de linha real \n
  let s = String(val)
    .replace(/_x000[dD]_/g, "\n") 
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n");

  // Remove espaços extras no início e fim
  return s.trim();
};

/**
 * Prepara o estilo da célula para garantir que quebras de linha (\n) 
 * sejam exibidas corretamente no Excel sem gerar códigos estranhos.
 */
export const getBaseStyle = (backgroundColor?: string, textColor?: string) => {
  return {
    fill: backgroundColor ? {
      patternType: "solid",
      fgColor: { rgb: hexToExcelColor(backgroundColor) }
    } : undefined,
    font: {
      name: "Segoe UI",
      sz: 10,
      color: { rgb: textColor ? hexToExcelColor(textColor) : "000000" }
    },
    alignment: {
      vertical: "center",
      horizontal: "left",
      wrapText: true // CRÍTICO: Impede que o Excel mostre _x000D_ em vez de pular linha
    },
    border: {
      top: { style: "thin", color: { rgb: "E2E8F0" } },
      bottom: { style: "thin", color: { rgb: "E2E8F0" } },
      left: { style: "thin", color: { rgb: "E2E8F0" } },
      right: { style: "thin", color: { rgb: "E2E8F0" } }
    }
  };
};

export const hexToExcelColor = (hex: string) => {
  if (!hex) return "FFFFFF";
  return hex.replace('#', '').toUpperCase();
};

export const getContrastColor = (hex: string) => {
  if (!hex || hex.length < 6) return "000000";
  const cleanHex = hex.replace('#', '');
  const r = parseInt(cleanHex.slice(0, 2), 16);
  const g = parseInt(cleanHex.slice(2, 4), 16);
  const b = parseInt(cleanHex.slice(4, 6), 16);
  // Fórmula de luminância para decidir se o texto deve ser preto ou branco
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  return yiq >= 128 ? "000000" : "FFFFFF";
};

export const normID = (val: any) => {
  const raw = String(val || "").toLowerCase();
  // Remove caracteres especiais e o sufixo .0 comum em leituras numéricas do Excel
  return raw.replace(/[^\w.]/g, "").replace(/\.0$/, "").trim();
};

export const normName = (val: any) => {
  return smartClean(val)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
};

export const generateRandomColor = () => {
  const letters = '0123456789ABCDEF';
  let color = '#';
  for (let i = 0; i < 6; i++) {
    color += letters[Math.floor(Math.random() * 16)];
  }
  return color;
};

export const evaluateCheckbox = (val: any): boolean => {
  if (val === null || val === undefined) return false;
  if (typeof val === 'boolean') return val;
  if (typeof val === 'number') return val === 1;
  const s = String(val).toLowerCase().trim();
  return s === "true" || s === "verdadeiro" || s === "1" || s === "sim" || s === "ok";
};