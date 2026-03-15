import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import SplashScreen from '../screens/onboarding/SplashScreen';
import AuthScreen from '../screens/onboarding/AuthScreen';
import PairingGateway from '../screens/onboarding/PairingGateway';

export type OnboardingStackParamList = {
  Splash: undefined;
  Auth: undefined;
  PairingGateway: undefined;
};

const Stack = createNativeStackNavigator<OnboardingStackParamList>();

export default function OnboardingStack() {
  return (
    <Stack.Navigator
      initialRouteName="Splash"
      screenOptions={{ headerShown: false }}
    >
      <Stack.Screen name="Splash" component={SplashScreen} />
      <Stack.Screen name="Auth" component={AuthScreen} />
      <Stack.Screen name="PairingGateway" component={PairingGateway} />
    </Stack.Navigator>
  );
}
