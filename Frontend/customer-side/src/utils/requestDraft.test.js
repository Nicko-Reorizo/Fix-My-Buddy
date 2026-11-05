import assert from 'node:assert/strict';
import { test } from 'node:test';
import { validateRequestDraft } from './requestDraft.js';
import { selectAttachments, PHOTO_LIMIT, VIDEO_LIMIT } from './attachmentValidation.js';

test('both services accept GPS or manual pickup and reject missing or expired request details', () => {
  const now = Date.parse('2026-11-02T00:00:00Z');
  const request = { serviceType: 'mechanic', vehicleId: 'test-vehicle', issueType: 'Battery', notes: '', landmark: '', scheduledAt: null };
  for (const serviceType of ['mechanic', 'towing']) {
    assert.equal(validateRequestDraft({ ...request, serviceType }, { latitude: 13.62, longitude: 123.18 }, now), '');
    assert.equal(validateRequestDraft({ ...request, serviceType }, { address: 'Test street, Naga City' }, now), '');
  }
  assert.match(validateRequestDraft(request, { address: 'Current GPS location' }, now), /pickup/);
  assert.match(validateRequestDraft({ ...request, vehicleId: '' }, {}, now), /vehicle/);
  assert.match(validateRequestDraft({ ...request, scheduledAt: '2026-11-01' }, { address: 'Test street, Naga City' }, now), /future/);
  assert.match(validateRequestDraft({ ...request, notes: 'x'.repeat(2001) }, { address: 'Test street, Naga City' }, now), /description/);
});
test('media batch keeps valid files, rejects duplicates, excessive sizes and count without losing draft', () => {
  const file = (name, type = 'image/jpeg', size = PHOTO_LIMIT) => ({ name, type, size, lastModified: 1 });
  const first = file('photo.jpg'), video = file('video.mp4', 'video/mp4', VIDEO_LIMIT);
  const result = selectAttachments([first], [first, video, file('oversize.jpg', 'image/jpeg', PHOTO_LIMIT + 1), ...Array.from({ length: 10 }, (_, i) => file(`photo-${i}.jpg`))]);
  assert.equal(result.files.length, 10); assert.equal(result.files[0], first); assert.equal(result.files[1], video);
  assert.ok(result.errors.some(error => error.includes('Already attached')));
  assert.ok(result.errors.some(error => error.includes('20 MB')));
  assert.ok(result.errors.some(error => error.includes('10 files')));
  assert.deepEqual(selectAttachments(result.files, []).files, result.files);
});
