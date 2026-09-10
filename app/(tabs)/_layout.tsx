import { Tabs } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';

export default function TabLayout() {
  return (
    <Tabs screenOptions={{ headerShown: true }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Productos',
          tabBarIcon: ({ color, size }) => <MaterialIcons name="inventory" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="two"
        options={{
          title: 'Compras',
          tabBarIcon: ({ color, size }) => <MaterialIcons name="shopping-cart" color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}
