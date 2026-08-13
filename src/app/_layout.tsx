import { Tabs } from 'expo-router';

export default function Layout() {
  return (
    <Tabs>
      <Tabs.Screen name="index" options={{ title: 'Receipes' }} />
      <Tabs.Screen name="categorii" options={{ title: 'Categorii' }} />
      <Tabs.Screen name="calorii" options={{ title: 'Calorii' }} />
    </Tabs>
  );
}