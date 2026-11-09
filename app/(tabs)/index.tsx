import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Button, FlatList, Modal, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useRepo } from '@/db/useRepo';
import { ErrorValidacion, type Paginacion, type Producto } from '@/db/types';
import { mensajeError, useDebounced, usePaginatedList } from '@/hooks/usePaginatedList';
import { sincronizarRecordatorio } from '@/utils/notifications';
import { avisar, confirmar } from '@/utils/dialogos';
import { fmtFecha } from '@/utils/format';

export default function ProductosScreen() {
  const repo = useRepo();
  const [filtro, setFiltro] = useState('');
  const filtroDebounced = useDebounced(filtro);
  const [verInactivos, setVerInactivos] = useState(false);
  const [modal, setModal] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [editando, setEditando] = useState<Producto | null>(null);
  const [nombre, setNombre] = useState('');
  const [intervalo, setIntervalo] = useState('30');
  const [recordarProd, setRecordarProd] = useState(true);

  const fetchPage = useCallback(
    (pag: Paginacion) => repo.listProductos({ nombre: filtroDebounced, incluirInactivos: verInactivos }, pag),
    [repo, filtroDebounced, verInactivos]
  );
  const lista = usePaginatedList(fetchPage);
  const { recargar } = lista;

  useFocusEffect(useCallback(() => { recargar(); }, [recargar]));

  const abrirNuevo = () => {
    setEditando(null); setNombre(''); setIntervalo('30'); setRecordarProd(true); setModal(true);
  };
  const abrirEditar = (p: Producto) => {
    setEditando(p); setNombre(p.nombre); setIntervalo(String(p.intervalo_dias)); setRecordarProd(p.recordar === 1); setModal(true);
  };

  const guardar = async () => {
    if (guardando) return;
    const dias = Number(intervalo);
    // Si no se recuerda, se conserva el intervalo anterior (o 30) para cuando se reactive.
    const diasFinal = recordarProd ? dias : (editando?.intervalo_dias ?? 30);
    const input = { nombre, intervalo_dias: diasFinal, recordar: recordarProd ? 1 : 0 };
    setGuardando(true);
    try {
      if (editando) {
        await repo.updateProducto(editando.id, input);
        await sincronizarRecordatorio(repo, editando.id);
      } else {
        await repo.createProducto(input);
        setFiltro('');
      }
      setModal(false);
      await recargar();
    } catch (e) {
      avisar(e instanceof ErrorValidacion ? 'Revisa los datos' : 'Error al guardar', mensajeError(e));
    } finally {
      setGuardando(false);
    }
  };

  const cambiarEstatus = async (p: Producto, estatus: 'activo' | 'inactivo') => {
    try {
      await repo.setEstatusProducto(p.id, estatus);
      await sincronizarRecordatorio(repo, p.id);
      await recargar();
    } catch (e) {
      avisar('Error', mensajeError(e));
    }
  };

  const eliminar = (p: Producto) =>
    confirmar('Inactivar producto', `¿Inactivar "${p.nombre}"? Sus compras se conservan.`, 'Inactivar', () => cambiarEstatus(p, 'inactivo'));

  return (
    <View style={s.c}>
      <TextInput style={s.input} placeholder="Filtrar por nombre..." value={filtro} onChangeText={setFiltro} />
      <View style={s.row}>
        <Text>Ver inactivos</Text>
        <Switch value={verInactivos} onValueChange={setVerInactivos} />
        <View style={{ flex: 1 }} />
        <Button title="+ Producto" onPress={abrirNuevo} />
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
        ListEmptyComponent={lista.cargando ? <ActivityIndicator style={{ marginTop: 30 }} /> : <Text style={s.empty}>Sin productos</Text>}
        renderItem={({ item }) => (
          <View style={[s.card, item.estatus === 'inactivo' && s.inactivo]}>
            <Text style={s.t}>{item.nombre}</Text>
            <Text>{item.recordar === 1 ? `Se compra cada ${item.intervalo_dias} días` : 'Sin recordatorio'}{item.estatus === 'inactivo' ? ' • inactivo' : ''}</Text>
            <Text style={s.dim}>Creado: {fmtFecha(item.fecha_creacion)}</Text>
            <View style={s.row}>
              <Button title="Editar" onPress={() => abrirEditar(item)} />
              {item.estatus === 'activo'
                ? <Button title="Inactivar" color="red" onPress={() => eliminar(item)} />
                : <Button title="Reactivar" onPress={() => cambiarEstatus(item, 'activo')} />}
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
              <TextInput style={s.input} value={intervalo} onChangeText={setIntervalo} keyboardType="number-pad" placeholder="30" />
            </>
          )}
          <Button title={guardando ? 'Guardando...' : 'Guardar'} onPress={guardar} disabled={guardando} />
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
  error: { color: '#b91c1c', marginVertical: 6 },
  empty: { textAlign: 'center', marginTop: 30, color: '#888' },
  m: { flex: 1, padding: 20, justifyContent: 'center', gap: 6 },
});
