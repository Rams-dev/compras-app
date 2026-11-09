import { Alert, Platform } from 'react-native';

// Alert.alert no hace nada en react-native-web: en web se usan los diálogos del navegador.

export function avisar(titulo: string, mensaje?: string) {
  if (Platform.OS === 'web') {
    window.alert(mensaje ? `${titulo}\n\n${mensaje}` : titulo);
    return;
  }
  Alert.alert(titulo, mensaje);
}

export function confirmar(titulo: string, mensaje: string, textoAccion: string, onConfirmar: () => void) {
  if (Platform.OS === 'web') {
    if (window.confirm(`${titulo}\n\n${mensaje}`)) onConfirmar();
    return;
  }
  Alert.alert(titulo, mensaje, [
    { text: 'Cancelar', style: 'cancel' },
    { text: textoAccion, style: 'destructive', onPress: onConfirmar },
  ]);
}
