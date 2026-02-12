import { useState, useEffect, useCallback } from 'react';
import * as Location from 'expo-location';

type PermissionLevel = 'none' | 'foreground' | 'background';

export function useLocationPermission() {
  const [permissionLevel, setPermissionLevel] = useState<PermissionLevel>('none');
  const [isChecking, setIsChecking] = useState(true);

  const checkPermission = useCallback(async () => {
    setIsChecking(true);
    const fg = await Location.getForegroundPermissionsAsync();
    if (!fg.granted) {
      setPermissionLevel('none');
      setIsChecking(false);
      return;
    }
    const bg = await Location.getBackgroundPermissionsAsync();
    setPermissionLevel(bg.granted ? 'background' : 'foreground');
    setIsChecking(false);
  }, []);

  useEffect(() => {
    checkPermission();
  }, [checkPermission]);

  const requestForeground = useCallback(async (): Promise<boolean> => {
    const { granted } = await Location.requestForegroundPermissionsAsync();
    if (granted) setPermissionLevel('foreground');
    return granted;
  }, []);

  const requestBackground = useCallback(async (): Promise<boolean> => {
    if (permissionLevel === 'none') {
      const fg = await requestForeground();
      if (!fg) return false;
    }
    const { granted } = await Location.requestBackgroundPermissionsAsync();
    if (granted) setPermissionLevel('background');
    return granted;
  }, [permissionLevel, requestForeground]);

  return {
    permissionLevel,
    hasPermission: permissionLevel !== 'none',
    hasBackgroundPermission: permissionLevel === 'background',
    isChecking,
    requestForeground,
    requestBackground,
    checkPermission,
  };
}
