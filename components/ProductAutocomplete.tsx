import { useEffect, useMemo, useState } from 'react';
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

export function ProductAutocomplete({ productos, value, onChange, incluirTodos = false, placeholder = 'Buscar producto...' }: Props) {
  const [query, setQuery] = useState('');
  const [abierto, setAbierto] = useState(false);

  const seleccionado = productos.find((p) => p.id === value) ?? null;

  useEffect(() => {
    setQuery(seleccionado?.nombre ?? '');
  }, [value]);

  const resultados = useMemo(() => {
    const q = query.trim().toLowerCase();
    const base = q ? productos.filter((p) => p.nombre.toLowerCase().includes(q)) : productos;
    return base.slice(0, 20);
  }, [productos, query]);

  const elegir = (id: number | null, nombre: string) => {
    onChange(id);
    setQuery(nombre);
    setAbierto(false);
  };

  const limpiar = () => {
    setQuery('');
    setAbierto(false);
    onChange(null);
  };

  return (
    <View style={s.wrap}>
      <View style={s.inputRow}>
        <TextInput
          style={s.inputFlex}
          placeholder={seleccionado ? seleccionado.nombre : placeholder}
          value={query}
          onChangeText={(t) => {
            setQuery(t);
            setAbierto(true);
            if (!t) onChange(null);
          }}
          onFocus={() => setAbierto(true)}
        />
        {(query || value !== null) && (
          <TouchableOpacity onPress={limpiar} style={s.clearBtn} hitSlop={8} accessibilityLabel="Limpiar búsqueda">
            <MaterialIcons name="close" size={18} color="#888" />
          </TouchableOpacity>
        )}
      </View>
      {abierto && (
        <View style={s.drop}>
          <FlatList
            keyboardShouldPersistTaps="handled"
            data={incluirTodos ? [{ id: null as number | null, nombre: 'Todos los productos' }, ...resultados] : resultados}
            keyExtractor={(i, idx) => (i.id === null ? 'todos' : String(i.id) + idx)}
            ListEmptyComponent={<Text style={s.empty}>Sin coincidencias</Text>}
            renderItem={({ item }) => (
              <TouchableOpacity style={s.opt} onPress={() => elegir(item.id, item.id === null ? '' : item.nombre)}>
                <Text style={item.id === value || (item.id === null && value === null) ? s.sel : undefined}>
                  {item.nombre}
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
