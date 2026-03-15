import React from 'react';
import { Text } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import TimelineScreen from '../screens/TimelineScreen';
import CalendarScreen from '../screens/CalendarScreen';
import BucketListScreen from '../screens/BucketListScreen';
import ConnectionScreen from '../screens/ConnectionScreen';
import SettingsScreen from '../screens/SettingsScreen';

export type MainTabParamList = {
  Timeline: undefined;
  Calendar: undefined;
  BucketList: undefined;
  Connection: undefined;
  Settings: undefined;
};

const TAB_ICONS: Record<keyof MainTabParamList, string> = {
  Timeline: '🕐',
  Calendar: '📅',
  BucketList: '✅',
  Connection: '💬',
  Settings: '⚙️',
};

const ACTIVE_COLOR = '#FF7F50';
const INACTIVE_COLOR = '#9CA3AF';
const TAB_BAR_BG = '#1E1E1E';

const Tab = createBottomTabNavigator<MainTabParamList>();

export default function MainTabNavigator() {
  return (
    <Tab.Navigator
      initialRouteName="Timeline"
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: ACTIVE_COLOR,
        tabBarInactiveTintColor: INACTIVE_COLOR,
        tabBarStyle: {
          backgroundColor: TAB_BAR_BG,
          borderTopColor: '#2A2A2A',
        },
        tabBarIcon: ({ color }) => (
          <Text style={{ fontSize: 22, color }}>{TAB_ICONS[route.name]}</Text>
        ),
      })}
    >
      <Tab.Screen name="Timeline" component={TimelineScreen} />
      <Tab.Screen name="Calendar" component={CalendarScreen} />
      <Tab.Screen
        name="BucketList"
        component={BucketListScreen}
        options={{ tabBarLabel: 'Bucket List' }}
      />
      <Tab.Screen name="Connection" component={ConnectionScreen} />
      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
  );
}
