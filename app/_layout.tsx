import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { DBProvider } from '@/components/DBProvider';
import { useRepo } from '@/db/useRepo';
import { initNotificationHandler, sincronizarTodos } from '@/utils/notifications';

SplashScreen.preventAutoHideAsync();

/** Al abrir la app recalcula los recordatorios (no hace nada en web ni en Expo Go Android). */
function SincronizarRecordatorios() {
  const repo = useRepo();
  useEffect(() => {
    initNotificationHandler();
    sincronizarTodos(repo);
  }, [repo]);
  return null;
}

export default function RootLayout() {
  const [loaded, error] = useFonts({ SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf') });

  useEffect(() => {
    if (error) throw error;
  }, [error]);
  useEffect(() => {
    if (loaded) SplashScreen.hideAsync();
  }, [loaded]);

  if (!loaded) return null;

  return (
    <DBProvider>
      <SincronizarRecordatorios />
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      </Stack>
    </DBProvider>
  );
}
