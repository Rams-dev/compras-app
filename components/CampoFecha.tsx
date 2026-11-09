import { useState } from 'react';
import { Button, Platform } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { fmtFecha, parseYMD, toYMD } from '@/utils/format';

export interface CampoFechaProps {
  /** YYYY-MM-DD o null */
  value: string | null;
  onChange: (ymd: string) => void;
  /** Texto del botón cuando no hay fecha. */
  placeholder?: string;
}

/** Selector de fecha nativo. En web se usa CampoFecha.web.tsx (input type="date"). */
export function CampoFecha({ value, onChange, placeholder = 'Elegir fecha' }: CampoFechaProps) {
  const [abierto, setAbierto] = useState(false);
  return (
    <>
      <Button title={value ? fmtFecha(value) : placeholder} onPress={() => setAbierto(true)} />
      {abierto && (
        <DateTimePicker
          value={value ? parseYMD(value) : new Date()}
          mode="date"
          onValueChange={(_, d) => {
            if (Platform.OS !== 'ios') setAbierto(false);
            onChange(toYMD(d));
          }}
          onDismiss={() => setAbierto(false)}
        />
      )}
    </>
  );
}
