import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  customerService,
  isCustomerApiConfigured,
} from '../services/customerService';
import { cleanPlate, validateVehicle } from '../utils/vehicleValidation';
import { CustomerContext } from './customerContextValue';
import { useAuth } from './useAuth';

function readGarage(key) {
  try {
    const value = JSON.parse(localStorage.getItem(key));
    return {
      vehicles: Array.isArray(value?.vehicles)
        ? value.vehicles.filter((item) => item?.id && item.make && item.model)
        : [],
      selectedId: typeof value?.selectedId === 'string' ? value.selectedId : '',
    };
  } catch {
    return { vehicles: [], selectedId: '' };
  }
}

function CustomerStore({ owner, user, children }) {
  const key = `fixmybuddy-garage:${owner}`;
  const remote = Boolean(user && isCustomerApiConfigured);
  const [garage, setGarage] = useState(() => {
    const stored = readGarage(key);
    return remote ? { vehicles: [], selectedId: stored.selectedId } : stored;
  });
  const [vehicleStatus, setVehicleStatus] = useState(
    remote ? 'loading' : 'ready',
  );
  const [vehicleError, setVehicleError] = useState('');
  const [refresh, setRefresh] = useState(0);
  const [bookings, setBookings] = useState([]);
  const [updates, setUpdates] = useState([]);
  const [bookingStatus, setBookingStatus] = useState(
    remote ? 'loading' : 'unavailable',
  );
  const [updatesStatus, setUpdatesStatus] = useState(
    remote ? 'loading' : 'unavailable',
  );

  useEffect(() => {
    if (!remote) return;
    let active = true;
    // Only the first load replaces the UI. Refreshes must keep forms and maps
    // mounted while the provider fetches newer records in the background.
    setVehicleStatus(current => current === 'ready' ? current : 'loading');
    setVehicleError('');
    setBookingStatus(current => current === 'ready' ? current : 'loading');
    setUpdatesStatus(current => current === 'ready' ? current : 'loading');
    customerService
      .vehicles()
      .then((vehicles) => {
        if (active) {
          setGarage((current) => ({ ...current, vehicles, selectedId: vehicles.some(item => item.id === current.selectedId) ? current.selectedId : vehicles[0]?.id || '' }));
          setVehicleStatus('ready');
        }
      })
      .catch((error) => {
        if (active) {
          setVehicleStatus(current => current === 'ready' ? current : 'error');
          setVehicleError(error.message);
        }
      });
    customerService
      .bookings()
      .then((items) => {
        if (active) {
          setBookings(items);
          setBookingStatus('ready');
        }
      })
      .catch(() => {
        if (active) setBookingStatus(current => current === 'ready' ? current : 'error');
      });
    customerService
      .updates()
      .then((items) => {
        if (active) {
          setUpdates(items);
          setUpdatesStatus('ready');
        }
      })
      .catch(() => {
        if (active) setUpdatesStatus(current => current === 'ready' ? current : 'error');
      });
    return () => {
      active = false;
    };
  }, [remote, refresh]);

  useEffect(() => {
    if (!remote) return;
    let active = true;
    let pending = false;
    const timer = setInterval(async () => {
      if (pending || document.hidden) return;
      pending = true;
      try {
        const [items, notifications] = await Promise.all([customerService.bookings(), customerService.updates()]);
        if (active) { setBookings(items); setUpdates(notifications); setBookingStatus('ready'); setUpdatesStatus('ready'); }
      } catch { /* Keep existing data; the manual refresh reports connection failures. */ }
      finally { pending = false; }
    }, 5000);
    return () => { active = false; clearInterval(timer); };
  }, [remote]);

  const selectedVehicle = useMemo(
    () => garage.vehicles.find((item) => item.id === garage.selectedId) || null,
    [garage],
  );

  function persist(next) {
    // Vehicles are local only in the frontend preview. Signed-in records stay on the API.
    localStorage.setItem(
      key,
      JSON.stringify(remote ? { selectedId: next.selectedId } : next),
    );
    setGarage(next);
  }

  async function saveVehicle(fields, id) {
    if (remote && vehicleStatus !== 'ready') throw new Error('Load your vehicles before making changes.');
    const errors = validateVehicle(fields, garage.vehicles, id);
    if (Object.keys(errors).length) throw new Error(Object.values(errors)[0]);
    const details = {
      ...fields,
      make: fields.make.trim(),
      model: fields.model.trim(),
      color: fields.color.trim(),
      year: Number(fields.year),
      plate: cleanPlate(fields.plate),
    };
    const vehicle = remote
      ? await customerService.saveVehicle(details, id)
      : { ...details, id: id || crypto.randomUUID() };
    const vehicles = id
      ? garage.vehicles.map((item) => (item.id === id ? vehicle : item))
      : [...garage.vehicles, vehicle];
    try {
      persist({ vehicles, selectedId: vehicle.id });
    } catch {
      if (remote) setGarage({ vehicles, selectedId: vehicle.id });
      else
        throw new Error(
          'Your browser could not save this vehicle. Check your storage settings and try again.',
        );
    }
    return vehicle;
  }

  function selectVehicle(id) {
    if (!garage.vehicles.some((vehicle) => vehicle.id === id)) return;
    try {
      persist({ ...garage, selectedId: id });
    } catch {
      throw new Error(
        'Could not save your selection. Please check browser storage settings.',
      );
    }
  }

  async function removeVehicle(id) {
    if (remote && vehicleStatus !== 'ready') throw new Error('Load your vehicles before making changes.');
    if (remote) await customerService.removeVehicle(id);
    const next = {
      vehicles: garage.vehicles.filter((vehicle) => vehicle.id !== id),
      selectedId: garage.selectedId === id ? '' : garage.selectedId,
    };
    try {
      persist(next);
    } catch {
      if (remote) setGarage(next);
      else
        throw new Error(
          'Could not remove this vehicle from browser storage. Please try again.',
        );
    }
  }

  const refreshData = useCallback(() => setRefresh((value) => value + 1), []);
  async function markUpdatesRead(ids) {
    if (!remote) throw new Error('Notifications are not connected. Please sign in when the backend is available.');
    const confirmed = await customerService.markUpdatesRead(ids);
    const accepted = confirmed.filter(id => ids.includes(id));
    setUpdates(current => current.map(item => accepted.includes(item.id) ? { ...item, read: true } : item));
    return accepted;
  }
  return (
    <CustomerContext.Provider
      value={{
        vehicles: vehicleStatus === 'ready' ? garage.vehicles : [],
        selectedVehicle: vehicleStatus === 'ready' ? selectedVehicle : null,
        saveVehicle,
        selectVehicle,
        removeVehicle,
        vehicleStatus,
        vehicleError,
        bookings,
        updates,
        bookingStatus,
        updatesStatus,
        refreshData,
        markUpdatesRead,
        localGarage: !remote,
      }}
    >
      {children}
    </CustomerContext.Provider>
  );
}

export function CustomerProvider({ children }) {
  const { user } = useAuth();
  const owner = user?.id || 'guest';
  return (
    <CustomerStore key={owner} owner={owner} user={user}>
      {children}
    </CustomerStore>
  );
}
