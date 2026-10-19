import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { randomUUID } from 'crypto';

/**
 * Server-side upload proxy used by the image-map editor.
 *
 * Security invariants (this endpoint was previously unauthenticated and wrote
 * any payload into public/uploads — do not loosen):
 *  1. The caller must present a session the Go backend validates (Authorization
 *     header or auth cookies are forwarded to /users/me).
 *  2. `shopId` must be an exact UUID — it becomes a directory name, so anything
 *     else is rejected to keep the write path inside public/uploads.
 *  3. Only the shop owner (or an admin) may upload into that shop folder.
 *  4. Only raster image MIME types are accepted and the stored extension is
 *     derived from the verified type, not the client filename.
 */

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_BYTES = 5 * 1024 * 1024;

const ALLOWED_TYPES: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/avif': '.avif',
  'image/gif': '.gif',
};

function backendOrigin(): string {
  const raw =
    process.env.BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';
  // Strip invisible characters (BOM, zero-width, RTL/LTR marks) — same
  // treatment as the next.config.mjs rewrites.
  const cleaned = raw
    .replace(/[\u200B-\u200F\u202A-\u202E\u2060\u2066-\u2069\uFEFF]/g, '')
    .trim()
    .replace(/\r|\n/g, '')
    .replace(/\/+$/, '');
  if (!cleaned) return 'http://localhost:4000';
  return /^https?:\/\//i.test(cleaned) ? cleaned : `https://${cleaned}`;
}

function forwardAuthHeaders(req: NextRequest): Record<string, string> {
  const headers: Record<string, string> = {};
  const auth = req.headers.get('authorization');
  if (auth) headers.Authorization = auth;
  const cookie = req.headers.get('cookie');
  if (cookie) headers.Cookie = cookie;
  return headers;
}

interface BackendMe {
  success?: boolean;
  data?: { id?: string; role?: string };
}

async function getCallerRole(req: NextRequest): Promise<string | null> {
  try {
    const res = await fetch(`${backendOrigin()}/api/v1/users/me`, {
      headers: forwardAuthHeaders(req),
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const json: BackendMe = await res.json().catch(() => null);
    const role = json?.data?.role;
    return typeof role === 'string' ? role.toUpperCase() : null;
  } catch {
    return null;
  }
}

async function ownsShop(req: NextRequest, shopId: string): Promise<boolean> {
  try {
    const res = await fetch(`${backendOrigin()}/api/v1/shops/me`, {
      headers: forwardAuthHeaders(req),
      cache: 'no-store',
    });
    if (!res.ok) return false;
    const json = await res.json().catch(() => null);
    return typeof json?.data?.id === 'string' && json.data.id === shopId;
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  const role = await getCallerRole(req);
  if (!role) {
    return NextResponse.json({ success: false, message: 'يجب تسجيل الدخول' }, { status: 401 });
  }

  // Parse the body once so shopId can arrive as a query param or a form field
  // (the image-map editor sends it as FormData).
  const formData = await req.formData();
  const rawShopId =
    req.nextUrl.searchParams.get('shopId') || (formData.get('shopId') as string | null) || '';
  const shopId = rawShopId.trim();
  if (!UUID_RE.test(shopId)) {
    return NextResponse.json({ success: false, message: 'معرف المتجر غير صالح' }, { status: 400 });
  }
  if (role !== 'ADMIN' && !(await ownsShop(req, shopId))) {
    return NextResponse.json(
      { success: false, message: 'غير مصرح لك برفع ملفات لهذا المتجر' },
      { status: 403 }
    );
  }

  const file = formData.get('file') as File | null;
  if (!file) {
    return NextResponse.json({ success: false, message: 'الملف مطلوب' }, { status: 400 });
  }

  const ext = ALLOWED_TYPES[file.type.toLowerCase()];
  if (!ext) {
    return NextResponse.json(
      { success: false, message: 'نوع الملف غير مدعوم — الصور فقط (JPG/PNG/WEBP/AVIF/GIF)' },
      { status: 415 }
    );
  }
  if (file.size <= 0 || file.size > MAX_BYTES) {
    return NextResponse.json(
      { success: false, message: 'حجم الملف أكبر من المسموح (5 ميجابايت)' },
      { status: 413 }
    );
  }

  const bytes = await file.arrayBuffer();
  const filename = `${Date.now()}_${randomUUID()}${ext}`;
  const uploadsDir = join(process.cwd(), 'public', 'uploads', shopId);
  await mkdir(uploadsDir, { recursive: true });
  await writeFile(join(uploadsDir, filename), Buffer.from(bytes));

  const publicUrl = `/uploads/${shopId}/${filename}`;
  return NextResponse.json({
    success: true,
    url: publicUrl,
    data: {
      url: publicUrl,
      filename,
      size: file.size,
      type: file.type,
    },
  });
}
