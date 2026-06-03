import { Stack } from 'expo-router';

import { HotelDataProvider } from '@/context/HotelDataContext';

export default function TabLayout() {
  return (
    <HotelDataProvider>
      <Stack screenOptions={{ headerShown: false }} />
    </HotelDataProvider>
  );
}
