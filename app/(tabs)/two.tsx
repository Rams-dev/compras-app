import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Button, FlatList, Modal, Platform, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { useDB } from '@/db/useDB';
import { useFocusEffect } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';
import { createCompra, listCompras, reactivarCompra, softDeleteCompra, updateCompra } from '@/db/compras';
import { listProductosActivos } from '@/db/productos';
import type { Compra, Producto } from '@/db/types';
import { fmtFecha, fmtMoneda, toISODate } from '@/utils/format';
import { ProductAutocomplete } from '@/components/ProductAutocomplete';
import { cancelarRecordatoriosDeCompra, notificacionesDisponibles, programarRecordatorio, proximaFecha } from '@/utils/notifications';

export default function ComprasScreen() {
  const db = useDB();
  const [items, setItems] = useState<Compra[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [fProd, setFProd] = useState<number | null>(null);
  const [desde, setDesde] = useState<Date | null>(null);
  const [hasta, setHasta] = useState<Date | null>(null);
  const [showDesde, setShowDesde] = useState(false);
  const [showHasta, setShowHasta] = useState(false);
  const [verInactivos, setVerInactivos] = useState(false);
  const [modal, setModal] = useState(false);
  const [editando, setEditando] = useState<Compra | null>(null);
  const [selProd, setSelProd] = useState<number | null>(null);
  const [costo, setCosto] = useState('');
  const [fecha, setFecha] = useState(new Date());
  const [showFecha, setShowFecha] = useState(false);
  const [recordar, setRecordar] = useState(true);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const PAGE_SIZE = 30;

  const filtrosActuales = useCallback(() => ({
    idProducto: fProd,
    desde: desde ? toISODate(desde) : null,
    hasta: hasta ? toISODate(hasta) : null,
    incluirInactivos: verInactivos,
  }), [fProd, desde, hasta, verInactivos]);

  const cargar = useCallback(async () => {
    const [prods, comps] = await Promise.all([
      listProductosActivos(db),
      listCompras(db, filtrosActuales(), { limit: PAGE_SIZE, offset: 0 }),
    ]);
    setProductos(prods);
    setItems(comps);
    setPage(0);
    setHasMore(comps.length === PAGE_SIZE);
  }, [db, filtrosActuales]);

  const cargarMas = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const next = page + 1;
      const r = await listCompras(db, filtrosActuales(), { limit: PAGE_SIZE, offset: next * PAGE_SIZE });
      setItems((prev) => [...prev, ...r]);
      setPage(next);
      if (r.length < PAGE_SIZE) setHasMore(false);
    } finally {
      setLoadingMore(false);
    }
  }, [db, filtrosActuales, page, hasMore, loadingMore]);

  useFocusEffect(useCallback(() => { cargar(); }, [cargar]));

  const abrirNuevo = () => {
    setEditando(null); setSelProd(productos[0]?.id ?? null); setCosto(''); setFecha(new Date()); setRecordar(true); setModal(true);
  };
  const abrirEditar = (c: Compra) => {
    setEditando(c); setSelProd(c.idProducto); setCosto(String(c.costo)); setFecha(new Date(c.fecha_compra)); setRecordar(c.recordar === 1); setModal(true);
  };

  const guardar = async () => {
    if (!selProd) return Alert.alert('Elige un producto');
    const costoNum = parseFloat(costo);
    if (isNaN(costoNum) || costoNum < 0) return Alert.alert('Costo inválido');
    const fechaISO = toISODate(fecha);
    const rec = recordar ? 1 : 0;
    let compraId: number;
    if (editando) {
      await updateCompra(db, editando.id, selProd, fechaISO, costoNum, rec);
      compraId = editando.id;
    } else {
      compraId = Number(await createCompra(db, selProd, fechaISO, costoNum, rec));
    }
    await cancelarRecordatoriosDeCompra(compraId);
    if (recordar) {
      const prod = productos.find((p) => p.id === selProd);
      if (prod?.recordar === 1) await programarRecordatorio(prod.nombre, fechaISO, prod.intervalo_dias, compraId);
    }
    setModal(false); cargar();
  };

  const eliminar = (c: Compra) =>
    Alert.alert('Eliminar', `¿Inactivar compra de ${c.producto_nombre}?`, [
      { text: 'Cancelar' },
      { text: 'Inactivar', style: 'destructive', onPress: async () => { await softDeleteCompra(db, c.id); await cancelarRecordatoriosDeCompra(c.id); cargar(); } },
    ]);

  return (
    <View style={s.c}>
      <View style={s.filtros}>
        <Text style={s.t}>Filtros</Text>
        <ProductAutocomplete productos={productos} value={fProd} onChange={setFProd} incluirTodos />
        <View style={s.row}>
          <Button title={desde ? fmtFecha(desde.toISOString()) : 'Desde'} onPress={() => setShowDesde(true)} />
          <Button title={hasta ? fmtFecha(hasta.toISOString()) : 'Hasta'} onPress={() => setShowHasta(true)} />
        </View>
        {(fProd || desde || hasta) && <Button title="Limpiar filtros" onPress={() => { setFProd(null); setDesde(null); setHasta(null); }} />}
        <View style={s.row}>
          <Text>Ver inactivos</Text>
          <Switch value={verInactivos} onValueChange={setVerInactivos} />
          <View style={{ flex: 1 }} />
          <Button title="+ Compra" onPress={abrirNuevo} />
        </View>
      </View>
      {showDesde && <DateTimePicker value={desde ?? new Date()} mode="date" onValueChange={(_, d) => { if (Platform.OS !== 'ios') setShowDesde(false); setDesde(d); }} onDismiss={() => setShowDesde(false)} />}
      {showHasta && <DateTimePicker value={hasta ?? new Date()} mode="date" onValueChange={(_, d) => { if (Platform.OS !== 'ios') setShowHasta(false); setHasta(d); }} onDismiss={() => setShowHasta(false)} />}

      <FlatList
        data={items}
        keyExtractor={(i) => String(i.id)}
        onEndReached={cargarMas}
        onEndReachedThreshold={0.5}
        ListFooterComponent={loadingMore ? <ActivityIndicator style={{ marginVertical: 12 }} /> : null}
        ListEmptyComponent={<Text style={s.empty}>Sin compras</Text>}
        renderItem={({ item }) => {
          const prox = item.recordar === 1 && item.producto_intervalo && item.producto_recordar === 1 ? proximaFecha(item.fecha_compra, item.producto_intervalo) : null;
          return (
            <View style={[s.card, item.estatus === 'inactivo' && s.inactivo]}>
              <Text style={s.t}>{item.producto_nombre}</Text>
              <Text>{fmtMoneda(item.costo)} • {fmtFecha(item.fecha_compra)}</Text>
              {prox && <Text style={s.recordar}>Próxima: {fmtFecha(prox.toISOString())}</Text>}
              <Text style={s.dim}>{item.estatus}</Text>
              <View style={s.row}>
                <Button title="Editar" onPress={() => abrirEditar(item)} />
                {item.estatus === 'activo'
                  ? <Button title="Eliminar" color="red" onPress={() => eliminar(item)} />
                  : <Button title="Reactivar" onPress={async () => { await reactivarCompra(db, item.id); cargar(); }} />}
              </View>
            </View>
          );
        }}
      />

      <Modal visible={modal} animationType="slide" onRequestClose={() => setModal(false)}>
        <View style={s.m}>
          <Text style={s.t}>{editando ? 'Editar compra' : 'Nueva compra'}</Text>
          <Text>Producto</Text>
          <ProductAutocomplete productos={productos} value={selProd} onChange={setSelProd} placeholder="Elige producto..." />
          <Text>Costo</Text>
          <TextInput style={s.input} value={costo} onChangeText={setCosto} keyboardType="decimal-pad" placeholder="0.00" />
          <Text>Fecha de compra (default actual)</Text>
          <Button title={fmtFecha(fecha.toISOString())} onPress={() => setShowFecha(true)} />
          {showFecha && <DateTimePicker value={fecha} mode="date" onValueChange={(_, d) => { if (Platform.OS !== 'ios') setShowFecha(false); setFecha(d); }} onDismiss={() => setShowFecha(false)} />}
          {productos.find((p) => p.id === selProd)?.recordar === 1 ? (
            <View style={s.row}>
              <Text>Recordar esta compra</Text>
              <Switch value={recordar} onValueChange={setRecordar} />
            </View>
          ) : (
            <Text style={s.dim}>Este producto no tiene recordatorio configurado.</Text>
          )}
          <Text style={s.dim}>{notificacionesDisponibles() ? 'Al guardar se programa recordatorio según intervalo del producto.' : 'En Expo Go Android no hay notificaciones: revisa la fecha "Próxima" en la lista.'}</Text>
          <Button title="Guardar" onPress={guardar} />
          <Button title="Cancelar" onPress={() => setModal(false)} />
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  c: { flex: 1, padding: 12 },
  filtros: { backgroundColor: '#fff', padding: 10, borderRadius: 10, marginBottom: 6, borderWidth: 1, borderColor: '#eee' },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 10, marginVertical: 6, backgroundColor: '#fff' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, marginVertical: 6, flexWrap: 'wrap' },
  card: { backgroundColor: '#fff', padding: 12, borderRadius: 10, marginVertical: 6, borderWidth: 1, borderColor: '#eee' },
  inactivo: { opacity: 0.6 },
  t: { fontSize: 16, fontWeight: 'bold' },
  dim: { color: '#666', fontSize: 12 },
  recordar: { color: '#b45309', fontWeight: '600' },
  empty: { textAlign: 'center', marginTop: 30, color: '#888' },
  m: { flex: 1, padding: 20, justifyContent: 'center', gap: 6 },
});
