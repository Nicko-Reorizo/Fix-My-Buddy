import { safeSupportContact, validDispute, validSupportMessage } from '../utils/accountValidation';
import { apiBaseUrl, apiRequest } from './apiClient';
export const accountApiConfigured = Boolean(apiBaseUrl);
export const accountRequest = (path, options = {}) => apiRequest(path, { ...options, expireSession: true });

function messagesFrom(data) {
  if (!Array.isArray(data?.messages) || !data.messages.every(validSupportMessage)) throw new Error('Could not read support messages.');
  return data.messages;
}
export const accountService = {
  async config(signal) {
    const data = await accountRequest('/support/config', { signal });
    return safeSupportContact(data);
  },
  async messages(signal) { return messagesFrom(await accountRequest('/customers/me/support/messages', { signal })); },
  async sendMessage(body, clientId) {
    const data = await accountRequest('/customers/me/support/messages', { method: 'POST', body: { body, clientId } });
    return messagesFrom({ messages: [data?.message] })[0];
  },
  async disputes(signal) {
    const data = await accountRequest('/customers/me/disputes', { signal });
    if (!Array.isArray(data?.disputes) || !data.disputes.every(validDispute)) throw new Error('Could not load your concerns.');
    return data.disputes;
  },
  async createDispute(details, files, clientId) {
    const body = new FormData();
    body.append('details', JSON.stringify({ ...details, clientId }));
    for (const file of files) body.append('evidence', file, file.name);
    const data = await accountRequest('/customers/me/disputes', { method: 'POST', body });
    if (!validDispute(data?.dispute)) throw new Error('Could not confirm submission. Check your concerns before retrying.');
    return data.dispute;
  },
  async sharing(id, enabled, version) {
    const data = await accountRequest(`/customers/me/bookings/${encodeURIComponent(id)}/sharing`, { method: 'PATCH', body: { enabled, version } });
    if (typeof data?.sharing?.enabled !== 'boolean') throw new Error('Could not confirm the sharing setting.');
    return data.sharing;
  },
};

