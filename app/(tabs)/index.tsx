import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Button, FlatList, Modal, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { useDB } from '@/db/useDB';
import { useFocusEffect } from 'expo-router';
import { createProducto, listProductos, reactivarProducto, softDeleteProducto, updateProducto } from '@/db/productos';
import type { Producto } from '@/db/types';
import { fmtFecha } from '@/utils/format';

export default function ProductosScreen() {
  const db = useDB();
  const [items, setItems] = useState<Producto[]>([]);
  const [filtro, setFiltro] = useState('');
  const [verInactivos, setVerInactivos] = useState(false);
  const [modal, setModal] = useState(false);
  const [editando, setEditando] = useState<Producto | null>(null);
  const [nombre, setNombre] = useState('');
  const [intervalo, setIntervalo] = useState('30');
  const [recordarProd, setRecordarProd] = useState(true);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const PAGE_SIZE = 30;

  const cargar = useCallback(async () => {
    const r = await listProductos(db, filtro, verInactivos, { limit: PAGE_SIZE, offset: 0 });
    setItems(r);
    setPage(0);
    setHasMore(r.length === PAGE_SIZE);
  }, [db, filtro, verInactivos]);

  const cargarMas = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const next = page + 1;
      const r = await listProductos(db, filtro, verInactivos, { limit: PAGE_SIZE, offset: next * PAGE_SIZE });
      setItems((prev) => [...prev, ...r]);
      setPage(next);
      if (r.length < PAGE_SIZE) setHasMore(false);
    } finally {
      setLoadingMore(false);
    }
  }, [db, filtro, verInactivos, page, hasMore, loadingMore]);

  useFocusEffect(useCallback(() => { cargar(); }, [cargar]));

  const abrirNuevo = () => {
    setEditando(null); setNombre(''); setIntervalo('30'); setRecordarProd(true); setModal(true);
  };
  const abrirEditar = (p: Producto) => {
    setEditando(p); setNombre(p.nombre); setIntervalo(String(p.intervalo_dias)); setRecordarProd(p.recordar === 1); setModal(true);
  };

  const guardar = async () => {
    if (!nombre.trim()) return Alert.alert('Falta nombre');
    const dias = parseInt(intervalo, 10);
    if (recordarProd && (isNaN(dias) || dias <= 0)) return Alert.alert('Intervalo inválido');
    const diasFinal = recordarProd ? dias : (editando?.intervalo_dias ?? 30);
    const rec = recordarProd ? 1 : 0;
    try {
      if (editando) {
        await updateProducto(db, editando.id, nombre, diasFinal, rec);
        setModal(false);
        await cargar();
      } else {
        await createProducto(db, nombre, diasFinal, rec);
        setModal(false);
        setFiltro('');
        const first = await listProductos(db, '', verInactivos, { limit: PAGE_SIZE, offset: 0 });
        setItems(first);
        setPage(0);
        setHasMore(first.length === PAGE_SIZE);
      }
    } catch (e: any) {
      Alert.alert('Error al guardar', String(e?.message ?? e));
    }
  };

  const eliminar = (p: Producto) =>
    Alert.alert('Eliminar', `¿Inactivar "${p.nombre}"? (soft-delete)`, [
      { text: 'Cancelar' },
      { text: 'Inactivar', style: 'destructive', onPress: async () => { await softDeleteProducto(db, p.id); cargar(); } },
    ]);

  return (
    <View style={s.c}>
      <TextInput style={s.input} placeholder="Filtrar por nombre..." value={filtro} onChangeText={setFiltro} />
      <View style={s.row}>
        <Text>Ver inactivos</Text>
        <Switch value={verInactivos} onValueChange={setVerInactivos} />
        <View style={{ flex: 1 }} />
        <Button title="+ Producto" onPress={abrirNuevo} />
      </View>
      <FlatList
        data={items}
        keyExtractor={(i) => String(i.id)}
        onRefresh={cargar}
        refreshing={false}
        onEndReached={cargarMas}
        onEndReachedThreshold={0.5}
        ListFooterComponent={loadingMore ? <ActivityIndicator style={{ marginVertical: 12 }} /> : null}
        ListEmptyComponent={<Text style={s.empty}>Sin productos</Text>}
        renderItem={({ item }) => (
          <View style={[s.card, item.estatus === 'inactivo' && s.inactivo]}>
            <Text style={s.t}>{item.nombre}</Text>
            <Text>{item.recordar === 1 ? `Cada ${item.intervalo_dias} días` : 'Sin recordatorio'} • {item.estatus}</Text>
            <Text style={s.dim}>Creado: {fmtFecha(item.fecha_creacion)}</Text>
            <View style={s.row}>
              <Button title="Editar" onPress={() => abrirEditar(item)} />
              {item.estatus === 'activo'
                ? <Button title="Eliminar" color="red" onPress={() => eliminar(item)} />
                : <Button title="Reactivar" onPress={async () => { await reactivarProducto(db, item.id); cargar(); }} />}
            </View>
          </View>
        )}
      />
      <Modal visible={modal} animationType="slide" onRequestClose={() => setModal(false)}>
        <View style={s.m}>
          <Text style={s.t}>{editando ? 'Editar producto' : 'Nuevo producto'}</Text>
          <Text>Nombre del producto</Text>
          <TextInput style={s.input} value={nombre} onChangeText={setNombre} placeholder="Ej. Aceite motor" />
          <View style={s.row}>
            <Text>Recordar este producto</Text>
            <Switch value={recordarProd} onValueChange={setRecordarProd} />
          </View>
          {recordarProd && (
            <>
              <Text>Recordar cada (días)</Text>
              <TextInput style={s.input} value={intervalo} onChangeText={setIntervalo} keyboardType="numeric" placeholder="30" />
            </>
          )}
          <Button title="Guardar" onPress={guardar} />
          <Button title="Cancelar" onPress={() => setModal(false)} />
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  c: { flex: 1, padding: 12 },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 10, marginVertical: 6, backgroundColor: '#fff' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, marginVertical: 6 },
  card: { backgroundColor: '#fff', padding: 12, borderRadius: 10, marginVertical: 6, borderWidth: 1, borderColor: '#eee' },
  inactivo: { opacity: 0.6 },
  t: { fontSize: 16, fontWeight: 'bold' },
  dim: { color: '#666', fontSize: 12 },
  empty: { textAlign: 'center', marginTop: 30, color: '#888' },
  m: { flex: 1, padding: 20, justifyContent: 'center', gap: 6 },
});
