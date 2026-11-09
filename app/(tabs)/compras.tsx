import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Button, FlatList, Modal, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useRepo } from '@/db/useRepo';
import { ErrorValidacion, type Compra, type Paginacion, type Producto } from '@/db/types';
import { mensajeError, usePaginatedList } from '@/hooks/usePaginatedList';
import { ProductAutocomplete } from '@/components/ProductAutocomplete';
import { CampoFecha } from '@/components/CampoFecha';
import { fmtFecha, fmtMoneda, hoyYMD, parseMonto } from '@/utils/format';
import { notificacionesDisponibles, proximaFecha, sincronizarRecordatorio } from '@/utils/notifications';
import { avisar, confirmar } from '@/utils/dialogos';

export default function ComprasScreen() {
  const repo = useRepo();
  const [productos, setProductos] = useState<Producto[]>([]);
  const [fProd, setFProd] = useState<number | null>(null);
  const [desde, setDesde] = useState<string | null>(null);
  const [hasta, setHasta] = useState<string | null>(null);
  const [verInactivos, setVerInactivos] = useState(false);
  const [modal, setModal] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [editando, setEditando] = useState<Compra | null>(null);
  const [selProd, setSelProd] = useState<number | null>(null);
  const [costo, setCosto] = useState('');
  const [fecha, setFecha] = useState(hoyYMD());
  const [recordar, setRecordar] = useState(true);

  const fetchPage = useCallback(
    (pag: Paginacion) => repo.listCompras({ idProducto: fProd, desde, hasta, incluirInactivos: verInactivos }, pag),
    [repo, fProd, desde, hasta, verInactivos]
  );
  const lista = usePaginatedList(fetchPage);
  const { recargar } = lista;

  const cargarProductos = useCallback(async () => {
    try {
      setProductos(await repo.listProductosActivos());
    } catch {
      // El error de conexión ya se muestra desde la lista de compras.
    }
  }, [repo]);

  useFocusEffect(useCallback(() => { cargarProductos(); recargar(); }, [cargarProductos, recargar]));

  // Al editar una compra de un producto ya inactivo, se agrega a las opciones para que se vea elegido.
  const opcionesProducto = useMemo(() => {
    if (!editando || productos.some((p) => p.id === editando.idProducto)) return productos;
    const inactivo: Producto = {
      id: editando.idProducto,
      nombre: editando.producto_nombre ?? `#${editando.idProducto}`,
      recordar: editando.producto_recordar ?? 0,
      intervalo_dias: editando.producto_intervalo ?? 30,
      fecha_creacion: '',
      fecha_actualizacion: '',
      estatus: 'inactivo',
    };
    return [...productos, inactivo];
  }, [productos, editando]);

  const prodSel = opcionesProducto.find((p) => p.id === selProd) ?? null;
  const rangoInvalido = !!desde && !!hasta && desde > hasta;

  const abrirNuevo = () => {
    setEditando(null); setSelProd(fProd); setCosto(''); setFecha(hoyYMD()); setRecordar(true); setModal(true);
  };
  const abrirEditar = (c: Compra) => {
    setEditando(c); setSelProd(c.idProducto); setCosto(String(c.costo)); setFecha(c.fecha_compra.slice(0, 10)); setRecordar(c.recordar === 1); setModal(true);
  };

  const guardar = async () => {
    if (guardando) return;
    if (!selProd) return avisar('Elige un producto');
    // Una compra solo "recuerda" si su producto tiene recordatorio.
    const input = { idProducto: selProd, fecha_compra: fecha, costo: parseMonto(costo), recordar: recordar && prodSel?.recordar === 1 ? 1 : 0 };
    setGuardando(true);
    try {
      if (editando) {
        await repo.updateCompra(editando.id, input);
        if (editando.idProducto !== selProd) await sincronizarRecordatorio(repo, editando.idProducto);
      } else {
        await repo.createCompra(input);
      }
      await sincronizarRecordatorio(repo, selProd);
      setModal(false);
      await recargar();
    } catch (e) {
      avisar(e instanceof ErrorValidacion ? 'Revisa los datos' : 'Error al guardar', mensajeError(e));
    } finally {
      setGuardando(false);
    }
  };

  const cambiarEstatus = async (c: Compra, estatus: 'activo' | 'inactivo') => {
    try {
      await repo.setEstatusCompra(c.id, estatus);
      await sincronizarRecordatorio(repo, c.idProducto);
      await recargar();
    } catch (e) {
      avisar('Error', mensajeError(e));
    }
  };

  const eliminar = (c: Compra) =>
    confirmar('Inactivar compra', `¿Inactivar la compra de ${c.producto_nombre} del ${fmtFecha(c.fecha_compra)}?`, 'Inactivar', () => cambiarEstatus(c, 'inactivo'));

  const hayFiltros = fProd !== null || desde !== null || hasta !== null;

  return (
    <View style={s.c}>
      <View style={s.filtros}>
        <Text style={s.t}>Filtros</Text>
        <ProductAutocomplete productos={productos} value={fProd} onChange={setFProd} incluirTodos />
        <View style={s.row}>
          <Text>Desde</Text>
          <CampoFecha value={desde} onChange={setDesde} placeholder="Desde" />
          <Text>Hasta</Text>
          <CampoFecha value={hasta} onChange={setHasta} placeholder="Hasta" />
        </View>
        {rangoInvalido && <Text style={s.error}>"Desde" es posterior a "Hasta".</Text>}
        {hayFiltros && <Button title="Limpiar filtros" onPress={() => { setFProd(null); setDesde(null); setHasta(null); }} />}
        <View style={s.row}>
          <Text>Ver inactivas</Text>
          <Switch value={verInactivos} onValueChange={setVerInactivos} />
          <View style={{ flex: 1 }} />
          <Button title="+ Compra" onPress={abrirNuevo} />
        </View>
      </View>

      {lista.error && <Text style={s.error}>{lista.error}</Text>}
      <FlatList
        data={lista.items}
        keyExtractor={(i) => String(i.id)}
        onRefresh={recargar}
        refreshing={lista.cargando && lista.items.length > 0}
        onEndReached={lista.cargarMas}
        onEndReachedThreshold={0.5}
        ListFooterComponent={lista.cargandoMas ? <ActivityIndicator style={{ marginVertical: 12 }} /> : null}
        ListEmptyComponent={lista.cargando ? <ActivityIndicator style={{ marginTop: 30 }} /> : <Text style={s.empty}>Sin compras</Text>}
        renderItem={({ item }) => {
          const prox =
            item.estatus === 'activo' && item.recordar === 1 && item.producto_recordar === 1 && item.producto_intervalo
              ? proximaFecha(item.fecha_compra, item.producto_intervalo)
              : null;
          return (
            <View style={[s.card, item.estatus === 'inactivo' && s.inactivo]}>
              <Text style={s.t}>{item.producto_nombre}</Text>
              <Text>{fmtMoneda(item.costo)} • {fmtFecha(item.fecha_compra)}</Text>
              {prox && <Text style={s.recordar}>Próxima: {fmtFecha(prox)}</Text>}
              {item.estatus === 'inactivo' && <Text style={s.dim}>inactiva</Text>}
              <View style={s.row}>
                <Button title="Editar" onPress={() => abrirEditar(item)} />
                {item.estatus === 'activo'
                  ? <Button title="Inactivar" color="red" onPress={() => eliminar(item)} />
                  : <Button title="Reactivar" onPress={() => cambiarEstatus(item, 'activo')} />}
              </View>
            </View>
          );
        }}
      />

      <Modal visible={modal} animationType="slide" onRequestClose={() => setModal(false)}>
        <View style={s.m}>
          <Text style={s.t}>{editando ? 'Editar compra' : 'Nueva compra'}</Text>
          <Text>Producto</Text>
          <ProductAutocomplete productos={opcionesProducto} value={selProd} onChange={setSelProd} placeholder="Elige producto..." />
          <Text>Costo</Text>
          <TextInput style={s.input} value={costo} onChangeText={setCosto} keyboardType="decimal-pad" placeholder="0.00" />
          <Text>Fecha de compra</Text>
          <CampoFecha value={fecha} onChange={setFecha} />
          {prodSel?.recordar === 1 ? (
            <>
              <View style={s.row}>
                <Text>Recordar esta compra</Text>
                <Switch value={recordar} onValueChange={setRecordar} />
              </View>
              {!notificacionesDisponibles() && (
                <Text style={s.dim}>En este dispositivo no hay notificaciones; revisa la fecha "Próxima" en la lista.</Text>
              )}
            </>
          ) : prodSel ? (
            <Text style={s.dim}>Este producto no tiene recordatorio configurado.</Text>
          ) : null}
          <Button title={guardando ? 'Guardando...' : 'Guardar'} onPress={guardar} disabled={guardando} />
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
  error: { color: '#b91c1c', marginVertical: 6 },
  recordar: { color: '#b45309', fontWeight: '600' },
  empty: { textAlign: 'center', marginTop: 30, color: '#888' },
  m: { flex: 1, padding: 20, justifyContent: 'center', gap: 6 },
});
