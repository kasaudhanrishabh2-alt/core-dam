import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';
import { validateFile } from '@/lib/utils/fileHelpers';

// Service client for storage operations (bypasses RLS for storage)
function getServiceClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

/**
 * Extracts text from a PDF file buffer using a simple byte-scan approach.
 * For production, wire in a proper PDF parsing Edge Function.
 */
function extractTextFromBuffer(buffer: ArrayBuffer, mimeType: string): string {
  if (!mimeType.includes('pdf')) return '';

  try {
    const text = new TextDecoder('utf-8', { fatal: false }).decode(buffer);
    // Pull readable ASCII text segments (crude but server-side safe)
    const readable = text.match(/[\x20-\x7E\n\r\t]{4,}/g) ?? [];
    return readable.join(' ').slice(0, 50000);
  } catch {
    return '';
  }
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Role check — use service client to bypass RLS
  const serviceClient = getServiceClient();
  const { data: profile } = await serviceClient
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile || !['admin', 'marketing_manager', 'content_creator'].includes(profile.role)) {
    return Response.json({ error: 'Insufficient permissions' }, { status: 403 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return Response.json({ error: 'Invalid form data' }, { status: 400 });
  }

  const file = formData.get('file') as File | null;
  if (!file) {
    return Response.json({ error: 'No file provided' }, { status: 400 });
  }
  const fileHash = formData.get('fileHash') as string | null;

  const validation = validateFile(file);
  if (!validation.valid) {
    return Response.json({ error: validation.error }, { status: 400 });
  }

  const ext = file.name.split('.').pop()?.toLowerCase() ?? 'bin';
  const storagePath = `${user.id}/${uuidv4()}.${ext}`;

  // Read file buffer
  const buffer = await file.arrayBuffer();

  // Upload to Supabase Storage
  const { error: uploadError } = await serviceClient.storage
    .from('assets')
    .upload(storagePath, buffer, {
      contentType: file.type,
      upsert: false,
    });

  if (uploadError) {
    return Response.json({ error: `Storage error: ${uploadError.message}` }, { status: 500 });
  }

  // Get signed URL (private bucket)
  const { data: signedData } = await serviceClient.storage
    .from('assets')
    .createSignedUrl(storagePath, 60 * 60 * 24 * 365); // 1 year

  const fileUrl = signedData?.signedUrl ?? '';

  // Extract text for searchability
  const extractedText = extractTextFromBuffer(buffer, file.type);

  return Response.json({
    storagePath,
    fileUrl,
    extractedText,
    fileHash: fileHash ?? null,
  });
}
