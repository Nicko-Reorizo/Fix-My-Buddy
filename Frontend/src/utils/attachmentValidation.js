export const MAX_ATTACHMENTS = 10;
export const PHOTO_LIMIT = 20 * 1024 * 1024;
export const VIDEO_LIMIT = 100 * 1024 * 1024;
export const ACCEPTED_MEDIA = 'image/jpeg,image/png,image/webp,image/heic,image/heif,video/mp4,video/webm,video/quicktime';
const photos = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']);
const videos = new Set(['video/mp4', 'video/webm', 'video/quicktime']);
export function validateAttachment(file) {
  if (!photos.has(file.type) && !videos.has(file.type)) return 'Choose a supported photo or video.';
  if (!file.size) return 'This file is empty.';
  const video = videos.has(file.type);
  if (file.size > (video ? VIDEO_LIMIT : PHOTO_LIMIT)) return video ? 'Videos must be 100 MB or smaller.' : 'Photos must be 20 MB or smaller.';
  return '';
}


export function selectAttachments(current, incoming) {
  const files = [...current], errors = [];
  for (const file of incoming) {
    const problem = validateAttachment(file);
    if (problem) errors.push(`${file.name}: ${problem}`);
    else if (files.some(item => item.name === file.name && item.size === file.size && item.lastModified === file.lastModified)) errors.push(`${file.name}: Already attached.`);
    else if (files.length >= MAX_ATTACHMENTS) errors.push('You can attach up to 10 files.');
    else files.push(file);
  }
  return { files, errors: [...new Set(errors)] };
}
