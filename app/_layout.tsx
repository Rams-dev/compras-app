import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { Platform } from 'react-native';
import { DBProvider } from '@/components/DBProvider';
import { initNotificationHandler, pedirPermisosNotificaciones } from '@/utils/notifications';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({ SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf') });

  useEffect(() => {
    if (error) throw error;
  }, [error]);
  useEffect(() => {
    if (loaded) SplashScreen.hideAsync();
  }, [loaded]);
  useEffect(() => {
    if (Platform.OS === 'web') return;
    initNotificationHandler();
    pedirPermisosNotificaciones();
  }, []);

  if (!loaded) return null;

  return (
    <DBProvider>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      </Stack>
    </DBProvider>
  );
}
