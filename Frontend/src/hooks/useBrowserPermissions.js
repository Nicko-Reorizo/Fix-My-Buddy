import { useCallback, useEffect, useState } from 'react';
import { getDeviceLocation } from '../utils/deviceLocation';
export function useBrowserPermissions() {
  const [location, setLocation] = useState('unknown');
  const [notifications, setNotifications] = useState('unknown');
  const refresh = useCallback(() => {
    setNotifications('Notification' in window ? Notification.permission : 'unsupported');
  }, []);
  useEffect(() => {
    let active = true;
    let permission;
    refresh();
    if (!navigator.geolocation) setLocation('unsupported');
    else if (navigator.permissions?.query) navigator.permissions.query({ name: 'geolocation' }).then(value => { if (!active) return; permission = value; setLocation(value.state); value.onchange = () => setLocation(value.state); }).catch(() => { if (active) setLocation('unknown'); });
    window.addEventListener('focus', refresh);
    return () => { active = false; if (permission) permission.onchange = null; window.removeEventListener('focus', refresh); };
  }, [refresh]);
  async function askNotifications() {
    if (!('Notification' in window)) return 'unsupported';
    const result = await Notification.requestPermission();
    setNotifications(result); return result;
  }
  async function askLocation() {
    try {
      await getDeviceLocation(navigator.geolocation);
      setLocation('granted');
    } catch (error) {
      if (!navigator.geolocation) setLocation('unsupported');
      else if (error.code === 1) setLocation('denied');
      throw error;
    }
  }
  return { location, notifications, askNotifications, askLocation };
}

