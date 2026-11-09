import { Platform } from 'react-native';
import { isRunningInExpoGo } from 'expo';
import type * as NotificationsType from 'expo-notifications';
import type { Repo } from '@/db/types';
import { parseYMD } from './format';

type NotificationsModule = typeof NotificationsType;

const TIPO = 'recordatorio-compra';
/** Hora local a la que suena el recordatorio. */
const HORA_AVISO = 9;

let cached: NotificationsModule | null | undefined;

function getNotifications(): NotificationsModule | null {
  if (cached !== undefined) return cached;
  // Web no tiene notificaciones locales; Expo Go Android quitó expo-notifications (SDK 53+).
  if (Platform.OS === 'web' || (Platform.OS === 'android' && isRunningInExpoGo())) {
    cached = null;
    return cached;
  }
  try {
    cached = require('expo-notifications') as NotificationsModule;
  } catch {
    cached = null;
  }
  return cached;
}

export const notificacionesDisponibles = () => getNotifications() !== null;

export function initNotificationHandler() {
  const N = getNotifications();
  if (!N) return;
  N.setNotificationHandler({
    handleNotification: async () => ({
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

/** Se llama solo cuando hay algo que programar, no al abrir la app. */
async function pedirPermisos(N: NotificationsModule): Promise<boolean> {
  try {
    if (Platform.OS === 'android') {
      await N.setNotificationChannelAsync('recordatorios', {
        name: 'Recordatorios de compra',
        importance: N.AndroidImportance.HIGH,
      });
    }
    const actual = await N.getPermissionsAsync();
    if (actual.granted) return true;
    return (await N.requestPermissionsAsync()).granted;
  } catch {
    return false;
  }
}

/** Fecha sugerida de la siguiente compra: fecha_compra + intervalo, a las 9:00 locales. */
export function proximaFecha(fechaCompraYMD: string, intervaloDias: number): Date {
  const d = parseYMD(fechaCompraYMD);
  d.setDate(d.getDate() + intervaloDias);
  d.setHours(HORA_AVISO, 0, 0, 0);
  return d;
}

async function cancelar(N: NotificationsModule, filtro: (data: any) => boolean) {
  const todas = await N.getAllScheduledNotificationsAsync();
  for (const n of todas) {
    const data = n.content.data as any;
    if (data?.tipo === TIPO && filtro(data)) await N.cancelScheduledNotificationAsync(n.identifier);
  }
}

/**
 * Deja UN solo recordatorio para el producto, calculado desde su compra activa más reciente.
 * Sin aviso si: el producto está inactivo o sin "recordar", no tiene compras activas,
 * su última compra tiene "recordar" apagado, o la fecha ya pasó.
 * Llamar después de cualquier cambio en el producto o en sus compras.
 */
export async function sincronizarRecordatorio(repo: Repo, idProducto: number) {
  const N = getNotifications();
  if (!N) return;
  try {
    await cancelar(N, (d) => d.idProducto === idProducto);
    const prod = await repo.getProducto(idProducto);
    if (!prod || prod.estatus !== 'activo' || prod.recordar !== 1) return;
    const [ultima] = await repo.listCompras({ idProducto }, { limit: 1, offset: 0 });
    if (!ultima || ultima.recordar !== 1) return;
    const fecha = proximaFecha(ultima.fecha_compra, prod.intervalo_dias);
    if (fecha.getTime() <= Date.now()) return;
    if (!(await pedirPermisos(N))) return;
    await N.scheduleNotificationAsync({
      content: {
        title: `Recordar compra: ${prod.nombre}`,
        body: `Han pasado ${prod.intervalo_dias} días desde tu última compra.`,
        data: { tipo: TIPO, idProducto },
      },
      trigger: {
        type: N.SchedulableTriggerInputTypes.DATE,
        date: fecha,
        ...(Platform.OS === 'android' ? { channelId: 'recordatorios' } : {}),
      } as NotificationsType.DateTriggerInput,
    });
  } catch (e) {
    console.warn('[recordatorios] no se pudo sincronizar', idProducto, e);
  }
}

/**
 * Recalcula todos los recordatorios. Se corre al abrir la app: limpia los avisos
 * por compra de versiones anteriores y corrige cualquier desfase.
 */
export async function sincronizarTodos(repo: Repo) {
  const N = getNotifications();
  if (!N) return;
  try {
    await cancelar(N, () => true);
    const productos = await repo.listProductosActivos();
    for (const p of productos) if (p.recordar === 1) await sincronizarRecordatorio(repo, p.id);
  } catch (e) {
    console.warn('[recordatorios] no se pudo sincronizar todo', e);
  }
}
