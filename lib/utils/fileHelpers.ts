import type { ContentType } from '@/types';

export const ACCEPTED_MIME_TYPES: Record<string, string> = {
  'application/pdf': 'pdf',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'pptx',
  // Some browsers report the old .ppt format MIME for both .ppt and .pptx
  'application/vnd.ms-powerpoint': 'pptx',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
  'video/mp4': 'mp4',
  // QuickTime / .mov — common for HOABL video assets shot on iPhone/camera
  'video/quicktime': 'mov',
  'video/webm': 'webm',
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/gif': 'gif',
  'image/svg+xml': 'svg',
  'image/webp': 'webp',
};

/**
 * Maps file extensions → correct MIME types.
 * Used when browsers report application/octet-stream for office files
 * (common with the webkitdirectory folder picker on Windows/Chrome).
 */
const EXTENSION_MIME_FALLBACK: Record<string, string> = {
  pdf:  'application/pdf',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  ppt:  'application/vnd.ms-powerpoint',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  doc:  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  xls:  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  mp4:  'video/mp4',
  mov:  'video/quicktime',
  webm: 'video/webm',
  png:  'image/png',
  jpg:  'image/jpeg',
  jpeg: 'image/jpeg',
  gif:  'image/gif',
  svg:  'image/svg+xml',
  webp: 'image/webp',
};

/**
 * Returns the effective MIME type for a file.
 * Falls back to extension-based lookup when the browser reports
 * application/octet-stream (typical for office files from folder picker).
 */
export function resolveFileMimeType(file: File): string {
  if (file.type && file.type !== 'application/octet-stream') {
    return file.type;
  }
  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
  return EXTENSION_MIME_FALLBACK[ext] ?? file.type;
}

export const MAX_FILE_SIZE_BYTES = 100 * 1024 * 1024; // 100MB

export function getFileExtension(filename: string): string {
  return filename.split('.').pop()?.toLowerCase() ?? '';
}

export function isImageFile(mimeType: string): boolean {
  return mimeType.startsWith('image/');
}

export function isVideoFile(mimeType: string): boolean {
  return mimeType.startsWith('video/');
}

export function isPdfFile(mimeType: string): boolean {
  return mimeType === 'application/pdf';
}

export function isDocumentFile(mimeType: string): boolean {
  return (
    mimeType.includes('wordprocessingml') ||
    mimeType.includes('presentationml') ||
    mimeType.includes('spreadsheetml')
  );
}

export function validateFile(file: File): { valid: boolean; error?: string } {
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return { valid: false, error: `File exceeds 100MB limit` };
  }
  const effectiveMime = resolveFileMimeType(file);
  if (!ACCEPTED_MIME_TYPES[effectiveMime]) {
    const ext = file.name.split('.').pop()?.toLowerCase();
    return {
      valid: false,
      error: `File type "${ext ? `.${ext}` : file.type}" is not supported`,
    };
  }
  return { valid: true };
}

export const CONTENT_TYPE_COLORS: Record<ContentType, string> = {
  case_study: 'bg-indigo-100 text-indigo-800',
  whitepaper: 'bg-blue-100 text-blue-800',
  one_pager: 'bg-green-100 text-green-800',
  presentation: 'bg-orange-100 text-orange-800',
  video: 'bg-red-100 text-red-800',
  email_template: 'bg-purple-100 text-purple-800',
  battlecard: 'bg-rose-100 text-rose-800',
  infographic: 'bg-teal-100 text-teal-800',
  proposal_template: 'bg-cyan-100 text-cyan-800',
  roi_calculator: 'bg-yellow-100 text-yellow-800',
  competitive_intel: 'bg-pink-100 text-pink-800',
  campaign_report: 'bg-violet-100 text-violet-800',
  other: 'bg-gray-100 text-gray-800',
};

export const CONTENT_TYPE_LABELS: Record<ContentType, string> = {
  case_study: 'Case Study',
  whitepaper: 'Whitepaper',
  one_pager: 'One Pager',
  presentation: 'Presentation',
  video: 'Video',
  email_template: 'Email Template',
  battlecard: 'Battlecard',
  infographic: 'Infographic',
  proposal_template: 'Proposal Template',
  roi_calculator: 'ROI Calculator',
  competitive_intel: 'Competitive Intel',
  campaign_report: 'Campaign Report',
  other: 'Other',
};

export const FILE_TYPE_ICONS: Record<string, string> = {
  pdf: '📄',
  pptx: '📊',
  docx: '📝',
  xlsx: '📈',
  mp4: '🎥',
  png: '🖼️',
  jpg: '🖼️',
  gif: '🎞️',
  svg: '🎨',
};
