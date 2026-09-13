import { Platform } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { apiMarker } from './memory';

export function useDB(): any {
  if (Platform.OS === 'web') return apiMarker;
  return useSQLiteContext();
}
