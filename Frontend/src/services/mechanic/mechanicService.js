import { apiBaseUrl, apiRequest } from '../apiClient';

export const isMechanicApiConfigured = Boolean(apiBaseUrl);
const request = (path, options = {}) => apiRequest(path, { ...options, expireSession: true });

function jobPath(jobId, suffix = '') {
  return `/mechanics/me/jobs/${encodeURIComponent(String(jobId))}${suffix}`;
}

export const mechanicService = {
  async getReviews(signal) {
    const data = await request('/mechanics/me/reviews', { signal });
    return data.reviews;
  },
  async getMessages(jobId, channel, signal) {
    const data = await request(jobPath(jobId, `/${channel}/messages`), { signal });
    return data.messages;
  },
  async sendMessage(jobId, channel, body, clientId) {
    const data = await request(jobPath(jobId, `/${channel}/messages`), { method: 'POST', body: { body, clientId } });
    return data.message;
  },
  async keepPresence(signal) {
    return request('/mechanics/me/presence', { method: 'POST', body: {}, signal });
  },
  async sendLocation(location, signal) {
    return request('/mechanics/me/location', { method: 'POST', body: location, signal });
  },
  async updateJobLocation(jobId, details = {}, signal) {
    const data = await request(jobPath(jobId, '/location'), {
      method: 'POST',
      body: details,
      signal,
    });
    return data?.job;
  },
  async confirmJobPayment(jobId, details = {}, signal) {
    const data = await request(jobPath(jobId, '/payment-confirm'), {
      method: 'POST',
      body: details,
      signal,
    });
    return data?.job;
  },
  async getProfile(signal) {
    const data = await request('/mechanics/me', { signal });
    return data?.mechanic;
  },

  async updateProfile(profile, signal) {
    const data = await request('/mechanics/me/profile', {
      method: 'PATCH',
      body: profile,
      signal,
    });
    return data?.mechanic;
  },

  async updateAvailability(availability, signal) {
    const data = await request('/mechanics/me/availability', {
      method: 'PATCH',
      body: availability,
      signal,
    });
    return data?.availability;
  },

  async getJobs({ status, signal } = {}) {
    const query = status ? `?status=${encodeURIComponent(status)}` : '';
    const data = await request(`/mechanics/me/jobs${query}`, { signal });
    return data?.jobs || [];
  },

  async getJob(jobId, signal) {
    const data = await request(jobPath(jobId), { signal });
    return data?.job;
  },

  async acceptJob(jobId, signal) {
    const data = await request(jobPath(jobId, '/accept'), {
      method: 'POST',
      body: {},
      signal,
    });
    return data?.job;
  },

  async declineJob(jobId, reason, signal) {
    const data = await request(jobPath(jobId, '/decline'), {
      method: 'POST',
      body: reason ? { reason } : {},
      signal,
    });
    return data?.job;
  },

  async verifyArrival(jobId, details, signal) {
    const data = await request(jobPath(jobId, '/arrival-verification'), {
      method: 'POST',
      body: details,
      signal,
    });
    return data?.job;
  },

  async submitDiagnosis(jobId, diagnosis, signal) {
    const data = await request(jobPath(jobId, '/diagnosis'), {
      method: 'POST',
      body: diagnosis,
      signal,
    });
    return data?.diagnosis;
  },

  async submitQuote(jobId, quote, signal) {
    const data = await request(jobPath(jobId, '/quotes'), {
      method: 'POST',
      body: quote,
      signal,
    });
    return data?.quote;
  },

  async requestAdditionalWork(jobId, details, signal) {
    const data = await request(jobPath(jobId, '/additional-work'), {
      method: 'POST',
      body: details,
      signal,
    });
    return data?.request;
  },

  async updateJobProgress(jobId, progress, signal) {
    const data = await request(jobPath(jobId, '/progress'), {
      method: 'PATCH',
      body: progress,
      signal,
    });
    return data?.job;
  },

  async completeHandover(jobId, details, signal) {
    const data = await request(jobPath(jobId, '/handover'), {
      method: 'POST',
      body: details,
      signal,
    });
    return data?.job;
  },

  async completeJob(jobId, details = {}, signal) {
    const data = await request(jobPath(jobId, '/completion'), {
      method: 'POST',
      body: details,
      signal,
    });
    return data?.job;
  },

  async getEarnings({ period, signal } = {}) {
    const query = period ? `?period=${encodeURIComponent(period)}` : '';
    const data = await request(`/mechanics/me/earnings${query}`, { signal });
    return data?.earnings;
  },

  async getUpdates(signal) {
    const data = await request('/mechanics/me/updates', { signal });
    return data?.updates || [];
  },
};
