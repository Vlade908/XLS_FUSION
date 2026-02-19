/** @format */
import * as XLSX from 'xlsx-js-style';

export const smartClean = (val: any): string => {
  if (val === null || val === undefined) return "";
  let s = String(val)
    .replace(/_x000[dD]_/g, "\n") 
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n");
  return s.trim();
};

export const hexToExcelColor = (hex: string) => {
  if (!hex) return "FFFFFF";
  return hex.replace('#', '').toUpperCase();
};

export const normID = (val: any) => {
  const raw = String(val || "").toLowerCase();
  return raw.replace(/[^\w.]/g, "").replace(/\.0$/, "").trim();
};

// TI: NORMALIZAÇÃO AGRESSIVA PARA BUCKET E FILTROS (Mata o erro do Érenton/_renton)
export const normName = (val: any) => {
  return smartClean(val)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remove acentos
    .replace(/[^a-z0-9]/g, "")      // Remove caracteres especiais
    .trim();
};

export const evaluateCheckbox = (val: any): boolean => {
  if (val === null || val === undefined) return false;
  if (typeof val === 'boolean') return val;
  if (typeof val === 'number') return val === 1;
  const s = String(val).toLowerCase().trim();
  return s === "true" || s === "verdadeiro" || s === "1" || s === "sim" || s === "ok" || s === "☑";
};