import { useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import type { Producto } from '@/db/types';

interface Props {
  productos: Producto[];
  value: number | null;
  onChange: (id: number | null) => void;
  incluirTodos?: boolean;
  placeholder?: string;
}

type Opcion = { id: number | null; nombre: string; inactivo?: boolean };

export function ProductAutocomplete({ productos, value, onChange, incluirTodos = false, placeholder = 'Buscar producto...' }: Props) {
  const [query, setQuery] = useState('');
  const [abierto, setAbierto] = useState(false);
  const cerrarTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const seleccionado = productos.find((p) => p.id === value) ?? null;
  const nombreSel = seleccionado?.nombre ?? '';
  const nombreSelRef = useRef(nombreSel);
  nombreSelRef.current = nombreSel;

  const cancelarCierre = () => {
    if (cerrarTimer.current) clearTimeout(cerrarTimer.current);
    cerrarTimer.current = null;
  };

  // Se sincroniza también cuando la lista de productos llega después del valor.
  useEffect(() => {
    setQuery(nombreSel);
  }, [value, nombreSel]);

  useEffect(() => cancelarCierre, []);

  const resultados = useMemo<Opcion[]>(() => {
    const q = query.trim().toLowerCase();
    // Con un producto ya elegido y sin editar el texto, se muestra la lista completa.
    const filtrar = q && q !== nombreSel.toLowerCase();
    const base = filtrar ? productos.filter((p) => p.nombre.toLowerCase().includes(q)) : productos;
    const ops: Opcion[] = base.slice(0, 20).map((p) => ({ id: p.id, nombre: p.nombre, inactivo: p.estatus === 'inactivo' }));
    return incluirTodos ? [{ id: null, nombre: 'Todos los productos' }, ...ops] : ops;
  }, [productos, query, nombreSel, incluirTodos]);

  const elegir = (op: Opcion) => {
    cancelarCierre();
    onChange(op.id);
    setQuery(op.id === null ? '' : op.nombre);
    setAbierto(false);
  };

  const limpiar = () => {
    cancelarCierre();
    setQuery('');
    setAbierto(false);
    onChange(null);
  };

  // Al salir del campo se cierra la lista y se restaura el texto del producto elegido.
  // El retraso deja que el toque sobre una opción se procese antes (sobre todo en web).
  const alSalir = () => {
    cancelarCierre();
    cerrarTimer.current = setTimeout(() => {
      cerrarTimer.current = null;
      setAbierto(false);
      setQuery(nombreSelRef.current);
    }, 200);
  };

  return (
    <View style={s.wrap}>
      <View style={s.inputRow}>
        <TextInput
          style={s.inputFlex}
          placeholder={placeholder}
          value={query}
          onChangeText={(t) => {
            setQuery(t);
            setAbierto(true);
            if (!t) onChange(null);
          }}
          onFocus={() => {
            cancelarCierre();
            setAbierto(true);
          }}
          onBlur={alSalir}
        />
        {(query !== '' || value !== null) && (
          <TouchableOpacity onPress={limpiar} style={s.clearBtn} hitSlop={8} accessibilityLabel="Limpiar búsqueda">
            <MaterialIcons name="close" size={18} color="#888" />
          </TouchableOpacity>
        )}
      </View>
      {abierto && (
        <View style={s.drop}>
          <FlatList
            keyboardShouldPersistTaps="handled"
            data={resultados}
            keyExtractor={(i) => (i.id === null ? 'todos' : String(i.id))}
            ListEmptyComponent={<Text style={s.empty}>Sin coincidencias</Text>}
            renderItem={({ item }) => (
              <TouchableOpacity style={s.opt} onPress={() => elegir(item)}>
                <Text style={item.id === value ? s.sel : undefined}>
                  {item.nombre}
                  {item.inactivo ? ' (inactivo)' : ''}
                </Text>
              </TouchableOpacity>
            )}
          />
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { position: 'relative', zIndex: 10, marginVertical: 6 },
  inputRow: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#ccc', borderRadius: 8, backgroundColor: '#fff', paddingRight: 4 },
  inputFlex: { flex: 1, padding: 10 },
  clearBtn: { padding: 6 },
  drop: { maxHeight: 180, borderWidth: 1, borderColor: '#ddd', borderRadius: 8, backgroundColor: '#fff', marginTop: 4 },
  opt: { padding: 10, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  sel: { fontWeight: 'bold' },
  empty: { padding: 10, color: '#888' },
});
