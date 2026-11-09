// Las fechas de compra se manejan como fecha LOCAL sin hora (YYYY-MM-DD).
// Nunca usar toISOString() para fechas de calendario: convierte a UTC y en
// México (UTC-6) recorre la fecha al día siguiente después de las 18:00.

const RE_YMD = /^(\d{4})-(\d{2})-(\d{2})$/;

export const esFechaYMD = (s: string) => {
  const m = RE_YMD.exec(s);
  if (!m) return false;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return d.getFullYear() === Number(m[1]) && d.getMonth() === Number(m[2]) - 1 && d.getDate() === Number(m[3]);
};

/** Date local -> 'YYYY-MM-DD' (sin pasar por UTC). */
export const toYMD = (d: Date) => {
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
};

/** 'YYYY-MM-DD' -> Date local a medianoche. Acepta también timestamps ISO completos. */
export const parseYMD = (s: string) => {
  const m = RE_YMD.exec(s);
  if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return new Date(s);
};

export const hoyYMD = () => toYMD(new Date());

const fmt = new Intl.DateTimeFormat('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });

/** Formatea 'YYYY-MM-DD', un timestamp ISO o un Date. */
export const fmtFecha = (v: string | Date) => {
  const d = typeof v === 'string' ? parseYMD(v) : v;
  return isNaN(d.getTime()) ? String(v) : fmt.format(d);
};

export const fmtMoneda = (n: number) =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(n || 0);

/** Convierte texto de un input de dinero a número. Acepta coma decimal y símbolos. */
export const parseMonto = (s: string) => {
  const limpio = s.replace(/[$\s]/g, '').replace(',', '.');
  return limpio ? Number(limpio) : NaN;
};
