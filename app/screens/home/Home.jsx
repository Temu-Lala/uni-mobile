import * as React from 'react';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';

import { Notice, News, AI, Chat } from './sections';
import Colors from '../../colors/Colors';

const Tab = createMaterialTopTabNavigator();

export default function Home() {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: 'gray',
        tabBarStyle: { backgroundColor: Colors.SECONDARY },
        tabBarInactiveTintColor: Colors.LIGHT_GRAY
      }}
    >
      <Tab.Screen name="Notice" component={Notice} />
      <Tab.Screen name="News" component={News} />
      <Tab.Screen name="AI" component={AI} />
    </Tab.Navigator>
  );
}
