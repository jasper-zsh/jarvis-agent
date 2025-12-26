/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */

import { StatusBar, useColorScheme } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AppNavigator from './src/navigation/AppNavigator';
import { GlassesConnectionProvider } from './src/services/GlassesConnectionContext';
import { TransportProvider } from './src/services/TransportContext';

function App() {
  const isDarkMode = useColorScheme() === 'dark';

  return (
    <SafeAreaProvider>
      <GlassesConnectionProvider>
        <TransportProvider>
          <NavigationContainer>
            <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
            <AppNavigator />
          </NavigationContainer>
        </TransportProvider>
      </GlassesConnectionProvider>
    </SafeAreaProvider>
  );
}

export default App;
