'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';

type Banner = {
  id: string;
  title: string;
  filename: string;
  linkUrl: string;
  position: number;
  isActive: boolean;
  width: number;
  height: number;
};

/**
 * Upload, order, activate and remove the homepage banners.
 *
 * English only, like the rest of the admin area — it is one person's back
 * office, and translating it would be work with no reader.
 * @returns The banner management screen.
 */
export function BannerManager() {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  // Delete is confirmed inline rather than with window.confirm: a banner and
  // its file are removed together and cannot be recovered.
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  const load = async () => {
    try {
      const res = await fetch('/api/admin/banners', { cache: 'no-store' });
      if (!res.ok) {
        throw new Error('Could not load banners');
      }
      const data = await res.json();
      setBanners(data.results ?? []);
      setFormError(null);
    } catch {
      setFormError('Could not load banners.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const upload = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    setBusy(true);
    setFormError(null);

    try {
      const res = await fetch('/api/admin/banners', {
        method: 'POST',
        body: new FormData(form),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        // The API's message is shown rather than a generic one: "File must be a
        // JPEG, PNG or WebP image" tells Steven what to do next, and
        // "Something went wrong" does not.
        throw new Error(body?.error?.message ?? 'Upload failed');
      }

      form.reset();
      await load();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Upload failed');
    } finally {
      setBusy(false);
    }
  };

  const patch = async (id: string, changes: Partial<Banner>) => {
    setBusy(true);
    try {
      await fetch(`/api/admin/banners/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(changes),
      });
      await load();
    } finally {
      setBusy(false);
    }
  };

  const remove = async (banner: Banner) => {
    setBusy(true);
    try {
      await fetch(`/api/admin/banners/${banner.id}`, { method: 'DELETE' });
      setConfirmingId(null);
      await load();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-8">
      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="mb-1 text-lg font-semibold text-gray-900">Add a banner</h2>
        <p className="mb-4 text-sm text-gray-500">
          JPEG, PNG or WebP, up to 5 MB. A wide image works best — around 1440 by 480.
        </p>

        <form onSubmit={upload} className="grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-medium text-gray-700">
            Title
            <input
              name="title"
              required
              maxLength={120}
              placeholder="US Open"
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </label>

          <label className="text-sm font-medium text-gray-700">
            Links to
            <input
              name="linkUrl"
              required
              placeholder="/categories/sports"
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </label>

          <label className="text-sm font-medium text-gray-700">
            Image
            <input
              name="image"
              type="file"
              required
              accept="image/jpeg,image/png,image/webp"
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </label>

          <label className="text-sm font-medium text-gray-700">
            Position
            <input
              name="position"
              type="number"
              min={0}
              max={999}
              defaultValue={0}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </label>

          <div className="sm:col-span-2">
            <button
              type="submit"
              disabled={busy}
              className="rounded-full bg-gray-900 px-6 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              {busy ? 'Uploading…' : 'Upload banner'}
            </button>
            {formError && <p className="mt-2 text-sm text-red-600">{formError}</p>}
          </div>
        </form>
      </section>

      <section>
        <h2 className="mb-4 text-lg font-semibold text-gray-900">
          Banners ({banners.length})
        </h2>

        {loading && <p className="text-sm text-gray-500">Loading…</p>}

        {!loading && banners.length === 0 && (
          <p className="rounded-2xl border border-dashed border-gray-300 p-8 text-center text-sm text-gray-500">
            No banners yet. The homepage shows its usual hero until you add one.
          </p>
        )}

        <div className="space-y-4">
          {banners.map((banner) => (
            <div
              key={banner.id}
              className="flex items-center gap-4 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm max-sm:flex-col max-sm:items-start"
            >
              <Image
                src={`/api/banners/file/${banner.filename}`}
                alt={banner.title}
                width={160}
                height={Math.round((160 * (banner.height || 1)) / (banner.width || 1))}
                className="rounded-lg border border-gray-100 object-cover"
              />

              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-gray-900">{banner.title}</p>
                <p className="truncate text-sm text-gray-500">{banner.linkUrl}</p>
                <p className="mt-1 text-xs text-gray-400">
                  {banner.width}×{banner.height} · position {banner.position}
                </p>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => patch(banner.id, { position: Math.max(0, banner.position - 1) })}
                  className="rounded-lg border border-gray-300 px-2 py-1 text-sm disabled:opacity-50"
                  aria-label={`Move ${banner.title} earlier`}
                >
                  ↑
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => patch(banner.id, { position: banner.position + 1 })}
                  className="rounded-lg border border-gray-300 px-2 py-1 text-sm disabled:opacity-50"
                  aria-label={`Move ${banner.title} later`}
                >
                  ↓
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => patch(banner.id, { isActive: !banner.isActive })}
                  className={`rounded-full px-3 py-1 text-xs font-medium ${
                    banner.isActive
                      ? 'bg-green-100 text-green-800'
                      : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {banner.isActive ? 'Live' : 'Hidden'}
                </button>
                {confirmingId === banner.id ? (
                  <>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => remove(banner)}
                      className="rounded-lg bg-red-600 px-3 py-1 text-sm text-white disabled:opacity-50"
                    >
                      Confirm delete
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmingId(null)}
                      className="rounded-lg border border-gray-300 px-3 py-1 text-sm text-gray-600"
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => setConfirmingId(banner.id)}
                    className="rounded-lg border border-red-200 px-3 py-1 text-sm text-red-600 disabled:opacity-50"
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
