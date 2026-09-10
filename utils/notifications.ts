import { Platform } from 'react-native';
import { isRunningInExpoGo } from 'expo';
import type * as NotificationsType from 'expo-notifications';

type NotificationsModule = typeof NotificationsType;

let cached: NotificationsModule | null | undefined;

function getNotifications(): NotificationsModule | null {
  if (cached !== undefined) return cached;
  if (Platform.OS === 'web') {
    cached = null;
    return cached;
  }
  if (Platform.OS === 'android' && isRunningInExpoGo()) {
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

export async function pedirPermisosNotificaciones(): Promise<boolean> {
  const N = getNotifications();
  if (!N) return false;
  try {
    if (Platform.OS === 'android') {
      await N.setNotificationChannelAsync('recordatorios', {
        name: 'Recordatorios de compra',
        importance: N.AndroidImportance.HIGH,
      });
    }
    const actual = await N.getPermissionsAsync();
    if (actual.granted) return true;
    const pedido = await N.requestPermissionsAsync();
    return pedido.granted;
  } catch {
    return false;
  }
}

export function proximaFecha(fechaCompraISO: string, intervaloDias: number): Date {
  const d = new Date(fechaCompraISO);
  d.setDate(d.getDate() + intervaloDias);
  return d;
}

export async function programarRecordatorio(nombreProducto: string, fechaCompraISO: string, intervaloDias: number, compraId: number) {
  const N = getNotifications();
  if (!N) return null;
  try {
    const fecha = proximaFecha(fechaCompraISO, intervaloDias);
    if (fecha.getTime() <= Date.now()) return null;
    const ok = await pedirPermisosNotificaciones();
    if (!ok) return null;
    return await N.scheduleNotificationAsync({
      content: {
        title: `Recordar compra: ${nombreProducto}`,
        body: `Han pasado ${intervaloDias} días desde tu última compra.`,
        data: { compraId, tipo: 'recordatorio-compra' },
      },
      trigger: {
        type: N.SchedulableTriggerInputTypes.DATE,
        date: fecha,
        ...(Platform.OS === 'android' ? { channelId: 'recordatorios' } : {}),
      } as any,
    });
  } catch {
    return null;
  }
}

export async function cancelarRecordatoriosDeCompra(compraId: number) {
  const N = getNotifications();
  if (!N) return;
  try {
    const todas = await N.getAllScheduledNotificationsAsync();
    for (const n of todas) {
      if ((n.content.data as any)?.compraId === compraId) {
        await N.cancelScheduledNotificationAsync(n.identifier);
      }
    }
  } catch {}
}
