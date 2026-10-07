import { DarkTheme, DefaultTheme, ThemeProvider, Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from 'react-native';
import { useEffect, useState } from 'react';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { initializeDatabase } from '@/database';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [databaseReady, setDatabaseReady] = useState(false);
  const colorScheme = useColorScheme();

  useEffect(() => {
    const initDb = async () => {
      try {
        await initializeDatabase();
        setDatabaseReady(true);
        await SplashScreen.hideAsync();
      } catch (error) {
        console.error('Failed to initialize database:', error);
        // Still hide splash screen and attempt to continue
        await SplashScreen.hideAsync();
        setDatabaseReady(true);
      }
    };

    initDb();
  }, []);

  const theme = colorScheme === 'dark' ? DarkTheme : DefaultTheme;

  if (!databaseReady) {
    return (
      <ThemeProvider value={theme}>
        <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
        <AnimatedSplashOverlay />
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider value={theme}>
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false }} />
    </ThemeProvider>
  );
}
