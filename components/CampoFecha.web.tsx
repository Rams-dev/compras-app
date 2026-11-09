import type { CampoFechaProps } from './CampoFecha';

// @react-native-community/datetimepicker no tiene implementación web (renderiza null).
// El input nativo del navegador ya trabaja en YYYY-MM-DD local.
export function CampoFecha({ value, onChange, placeholder = 'Elegir fecha' }: CampoFechaProps) {
  return (
    <input
      type="date"
      aria-label={placeholder}
      title={placeholder}
      value={value ?? ''}
      onChange={(e) => {
        if (e.target.value) onChange(e.target.value);
      }}
      style={{ padding: 8, borderRadius: 8, border: '1px solid #ccc', fontSize: 14, fontFamily: 'inherit' }}
    />
  );
}
