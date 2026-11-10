import { validateVehicle } from './vehicleValidation.js';

function validUser(data) {
  if (!data?.user?.id || typeof data.user.name !== 'string') throw new Error('We could not confirm your session. Please sign in again.');
  return data.user;
}
export function createAuthApi(request) {
  return {
    async logout() {
      const result = await request('/auth/logout', { method: 'POST', body: {} });
      if (result !== null) throw new Error('Could not confirm sign-out. Please try again.');
    },
    async session() {
      try {
        const data = await request('/auth/session');
        if (data?.user === null) return null;
        return validUser(data);
      } catch (error) { if (error.status === 401) return null; throw error; }
    },
    async signup(details) {
      const path = details.role === 'mechanic' ? '/mechanics/auth/signup' : '/auth/signup';
      return { user: validUser(await request(path, { method: 'POST', body: details })) };
    },
    async login(email, password, role) {
      const accountRole = role || 'customer';
      const path = accountRole === 'mechanic' ? '/mechanics/auth/login' : '/auth/login';
      const user = validUser(await request(path, { method: 'POST', body: { email, password, role: accountRole } }));
      if (user.role !== accountRole) throw new Error('This account belongs to a different workspace.');
      return { user };
    },
    async reset(email) {
      const data = await request('/auth/password/forgot', { method: 'POST', body: { email } });
      if (data?.ok !== true) throw new Error('Could not confirm the reset request. Please try again.');
    },
    async profile(details, expectedUserId) {
      const user = validUser(await request('/customers/me', { method: 'PATCH', body: details, expireSession: true }));
      if (expectedUserId && String(user.id) !== String(expectedUserId)) throw new Error('Could not confirm the account update. Reload your profile before retrying.');
      if (details.name !== undefined && user.name !== details.name) throw new Error('Could not confirm the profile change. Reload your profile before retrying.');
      if (details.emergencyContact !== undefined) {
        const expected = details.emergencyContact;
        if (expected === null ? user.emergencyContact != null : !['name','phone','relationship'].every(key => user.emergencyContact?.[key] === expected[key])) throw new Error('Could not confirm the emergency contact change. Reload your profile before retrying.');
      }
      return user;
    },
  };
}
function vehicleFrom(data) {
  const vehicle = data?.vehicle;
  if (!vehicle?.id || !['make','model','color','type'].every(key => typeof vehicle[key] === 'string') || Object.keys(validateVehicle(vehicle, [])).length) throw new Error('The server returned incomplete vehicle details. Reload your vehicles before retrying.');
  return { ...vehicle, id: String(vehicle.id) };
}
export function createVehicleApi(request) {
  return {
    async vehicles() {
      const data = await request('/customers/me/vehicles');
      if (!Array.isArray(data?.vehicles)) throw new Error('Could not load your vehicles. Please try again.');
      return data.vehicles.map(vehicle => vehicleFrom({ vehicle }));
    },
    async saveVehicle(details, id) {
      const vehicle = vehicleFrom(await request(`/customers/me/vehicles${id ? `/${encodeURIComponent(id)}` : ''}`, { method: id ? 'PATCH' : 'POST', body: details }));
      if (id && vehicle.id !== String(id)) throw new Error('Could not confirm which vehicle was updated. Reload your vehicles.');
      return vehicle;
    },
    async removeVehicle(id) {
      const result = await request(`/customers/me/vehicles/${encodeURIComponent(id)}`, { method: 'DELETE' });
      if (result !== null) throw new Error('Could not confirm vehicle removal. Reload your vehicles before retrying.');
    },
  };
}
