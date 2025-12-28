import { Stack } from 'expo-router';
import { colors } from '../../utils/colors';

export default function PublicLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: colors.secondary,
        },
        headerTintColor: colors.white,
        headerTitleStyle: {
          fontWeight: '600',
        },
      }}
    >
      <Stack.Screen
        name="apply"
        options={{
          title: 'Become a Franchisee',
          headerShown: true,
        }}
      />
      <Stack.Screen
        name="application-status"
        options={{
          title: 'Application Status',
          headerShown: true,
        }}
      />
    </Stack>
  );
}
