import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import HomeScreen from './screens/HomeScreen';
import FormScreen from './screens/FormScreen';
import SuccessScreen from './screens/SuccessScreen';

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Home">
        <Stack.Screen 
          name="Home" 
          component={HomeScreen} 
          options={{ title: 'Solana Blink API Generator' }}
        />
        <Stack.Screen 
          name="Form" 
          component={FormScreen} 
          options={{ title: 'Create Blink API' }}
        />
        <Stack.Screen 
          name="Success" 
          component={SuccessScreen} 
          options={{ title: 'API Created', headerBackVisible: false }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
} 