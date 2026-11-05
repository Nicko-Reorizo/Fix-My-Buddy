import { demoFetch } from '../demo/localApi.js';

function notify(name) {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(name));
}
export async function networkFetch(input, options) {
  try {
    const response = String(input).startsWith('/demo-api')
      ? await demoFetch(input, options)
      : await fetch(input, options);
    notify('fixmybuddy:connection-response');
    return response;
  } catch (error) {
    if (error instanceof TypeError) notify('fixmybuddy:connection-error');
    throw error;
  }
}

