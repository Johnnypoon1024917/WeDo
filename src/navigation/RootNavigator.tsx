import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAppStore } from '../store/appStore';
import OnboardingStack from './OnboardingStack';
import MainTabNavigator from './MainTabNavigator';
import PaywallModal from '../screens/PaywallModal';
import AddToListModal from '../screens/AddToListModal';
import WheelScreen from '../screens/WheelScreen';

export type RootStackParamList = {
  OnboardingStack: undefined;
  MainTabNavigator: undefined;
  PaywallModal: undefined;
  AddToListModal: { url?: string } | undefined;
  WheelScreen: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootNavigator() {
  const user = useAppStore((s) => s.user);
  const relationshipId = useAppStore((s) => s.relationshipId);

  const isAuthenticated = user !== null;
  const isPaired = relationshipId !== null;
  const showMain = isAuthenticated && isPaired;

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {showMain ? (
        <Stack.Screen name="MainTabNavigator" component={MainTabNavigator} />
      ) : (
        <Stack.Screen name="OnboardingStack" component={OnboardingStack} />
      )}

      <Stack.Screen
        name="PaywallModal"
        component={PaywallModal}
        options={{ presentation: 'modal' }}
      />
      <Stack.Screen
        name="AddToListModal"
        component={AddToListModal}
        options={{ presentation: 'modal' }}
      />
      <Stack.Screen
        name="WheelScreen"
        component={WheelScreen}
      />
    </Stack.Navigator>
  );
}
