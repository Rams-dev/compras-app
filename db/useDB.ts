import { Platform } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { memoryMarker } from './memory';

export function useDB(): any {
  if (Platform.OS === 'web') return memoryMarker;
  return useSQLiteContext();
}
