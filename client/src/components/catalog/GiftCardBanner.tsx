'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';

interface GiftCardBannerProps {
  heading?: string;
  subheading?: string;
  description?: string;
  cta?: string;
  cardLabel?: string;
}

export function GiftCardBanner({
  heading = 'PERFECT GIFT',
  subheading = 'Give the gift of live music. 🎁',
  description = 'E-gift cards from $25 to $500. They pick the show, you get the credit. One-time full-value code, delivered instantly by email.',
  cta = 'Send a gift card →',
  cardLabel = 'Gift Card',
}: GiftCardBannerProps) {
  const t = useTranslations('GiftCardBanner');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);
  const [amount, setAmount] = useState(100);

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setSubscribed(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setTimeout(() => {
      setSubscribed(false);
      setEmail('');
    }, 300);
  };

  return (
    <>
      <section className="mx-auto max-w-[1440px] px-[107px] py-16 max-md:px-4">
        {/* Banner container */}
        <div className="relative overflow-hidden rounded-[32px] border border-white/10 bg-gradient-to-r from-[#170a0e] via-[#2c0d16] to-[#12070a] p-10 shadow-2xl sm:p-14 lg:p-16">
          {/* Subtle ambient lighting */}
          <div className="pointer-events-none absolute -left-20 -top-20 h-96 w-96 rounded-full bg-[radial-gradient(circle,rgba(234,42,67,0.15),transparent_70%)]" />
          <div className="pointer-events-none absolute -bottom-20 -right-20 h-96 w-96 rounded-full bg-[radial-gradient(circle,rgba(234,42,67,0.15),transparent_70%)]" />

          <div className="relative z-10 grid grid-cols-1 items-center gap-10 lg:grid-cols-12 lg:gap-12">
            {/* Left Content */}
            <div className="lg:col-span-7">
              <p
                className="mb-3 text-[12px] font-bold tracking-[0.2em] text-[#ea2a43] uppercase"
                style={{ fontFamily: 'var(--font-jakarta)' }}
              >
                {heading}
              </p>
              <h2
                className="mb-4 text-[32px] font-bold leading-tight text-white sm:text-[42px] lg:text-[46px]"
                style={{ fontFamily: 'var(--font-poppins)' }}
              >
                {subheading}
              </h2>
              <p
                className="mb-8 max-w-xl text-[15px] leading-relaxed text-[#b0a0a5] sm:text-[16px]"
                style={{ fontFamily: 'var(--font-jakarta)' }}
              >
                {description}
              </p>
              <button
                type="button"
                onClick={() => setIsModalOpen(true)}
                className="group inline-flex items-center gap-2.5 rounded-full bg-[#8c182a] px-8 py-3.5 text-[15px] font-medium text-white shadow-lg transition-all duration-300 hover:scale-105 hover:bg-[#ea2a43] hover:shadow-[0_0_25px_rgba(234,42,67,0.4)] active:scale-95 cursor-pointer"
                style={{ fontFamily: 'var(--font-poppins)' }}
              >
                <span>{cta}</span>
              </button>
            </div>

            {/* Right Content — Digital Gift Card */}
            <div className="flex justify-center lg:col-span-5 lg:justify-end">
              <div
                onClick={() => setIsModalOpen(true)}
                className="group relative aspect-[1.62/1] w-full max-w-[380px] cursor-pointer select-none overflow-hidden rounded-2xl border border-white/20 bg-gradient-to-br from-[#ea2a43] via-[#c61833] to-[#800f22] p-6 shadow-2xl transition-all duration-500 hover:-translate-y-2 hover:rotate-1 hover:shadow-[0_20px_40px_rgba(234,42,67,0.35)]"
              >
                {/* Decorative watermarks and circles */}
                <div className="pointer-events-none absolute -right-12 -top-12 h-44 w-44 rounded-full bg-white/10 blur-sm transition-transform duration-700 group-hover:scale-125" />
                <div className="pointer-events-none absolute -bottom-16 -left-16 h-48 w-48 rounded-full bg-black/20 blur-md" />

                {/* Perforated ticket dots down the left edge */}
                <div className="pointer-events-none absolute bottom-4 left-2.5 top-4 flex flex-col justify-between">
                  {Array.from({ length: 11 }).map((_, i) => (
                    <span key={i} className="h-1.5 w-1.5 rounded-full bg-black/35 shadow-inner" />
                  ))}
                </div>

                {/* Card content */}
                <div className="relative z-10 flex h-full flex-col justify-between pl-4">
                  {/* Card top row */}
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-[11px] font-extrabold tracking-[0.25em] text-white/95 uppercase">
                        TICKETLOVE
                      </p>
                      <p className="text-[13px] font-medium text-white/80">
                        {cardLabel}
                      </p>
                    </div>
                    {/* Ticket emblem badge */}
                    <div className="flex h-8 w-11 items-center justify-center rounded-md bg-white/20 backdrop-blur-sm">
                      <svg width="20" height="16" viewBox="0 0 24 18" fill="currentColor" className="text-white">
                        <path d="M2 0C0.9 0 0 0.9 0 2v3c1.1 0 2 .9 2 2s-.9 2-2 2v3c0 1.1.9 2 2 2h20c1.1 0 2-.9 2-2v-3c-1.1 0-2-.9-2-2s.9-2 2-2V2c0-1.1-.9-2-2-2H2zm10 4.5c1.4 0 2.5 1.1 2.5 2.5s-1.1 2.5-2.5 2.5S9.5 8.4 9.5 7 10.6 4.5 12 4.5z" />
                      </svg>
                    </div>
                  </div>

                  {/* Card center amount */}
                  <div>
                    <span
                      className="text-[44px] font-extrabold tracking-tight text-white drop-shadow-md sm:text-[50px]"
                      style={{ fontFamily: 'var(--font-poppins)' }}
                    >
                      ${amount}
                    </span>
                  </div>

                  {/* Card bottom row */}
                  <div className="flex items-end justify-between text-[11px] font-semibold text-white/70">
                    <span className="font-mono tracking-[0.2em]">
                      •••• •••• •••• 8472
                    </span>
                    <span className="tracking-wider uppercase">
                      {t('valid_one_year')}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Interactive Coming Soon Modal */}
      {isModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
        >
          {/* Backdrop */}
          <div
            onClick={closeModal}
            className="absolute inset-0 bg-black/80 backdrop-blur-md transition-opacity"
          />

          {/* Modal Card */}
          <div className="relative z-10 w-full max-w-lg overflow-hidden rounded-3xl border border-white/15 bg-[#170a0e] p-8 shadow-2xl sm:p-10">
            {/* Ambient inner glow */}
            <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-[radial-gradient(circle,rgba(234,42,67,0.3),transparent_70%)]" />

            {/* Close Button */}
            <button
              type="button"
              onClick={closeModal}
              aria-label="Close modal"
              className="absolute right-5 top-5 flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white/70 transition hover:bg-white/20 hover:text-white"
            >
              ✕
            </button>

            {!subscribed ? (
              <div>
                {/* Modal Header */}
                <div className="mb-6 text-center">
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#ea2a43]/20 text-3xl">
                    🎁
                  </div>
                  <h3
                    className="text-[26px] font-bold text-white sm:text-[30px]"
                    style={{ fontFamily: 'var(--font-poppins)' }}
                  >
                    {t('launching_soon')}
                  </h3>
                  <p className="mt-2 text-[14px] leading-relaxed text-[#a1a1a1]">
                    We're putting the finishing touches on our instant E-Gift Card delivery system. Choose your favorite value below and join the VIP waitlist for a <strong>10% bonus credit</strong> on launch day!
                  </p>
                </div>

                {/* Amount selector preview */}
                <div className="mb-6">
                  <label className="mb-2 block text-center text-[12px] font-semibold tracking-wider text-[var(--color-brand)] uppercase">
                    {t('select_value')}
                  </label>
                  <div className="flex justify-center gap-2">
                    {[25, 50, 100, 250, 500].map((val) => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setAmount(val)}
                        className={`rounded-full px-3.5 py-1.5 text-[13px] font-semibold transition-all ${
                          amount === val
                            ? 'bg-[var(--color-brand)] text-white shadow-md scale-105'
                            : 'border border-white/10 bg-white/5 text-[#a1a1a1] hover:border-white/30 hover:text-white'
                        }`}
                      >
                        ${val}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Form */}
                <form onSubmit={handleSubscribe} className="space-y-3">
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email address"
                    suppressHydrationWarning
                    className="w-full rounded-full border border-white/15 bg-black/40 px-5 py-3 text-[14px] text-white placeholder:text-[#737373] outline-none focus:border-[var(--color-brand)]"
                  />
                  <button
                    type="submit"
                    className="w-full rounded-full bg-[var(--color-brand)] py-3 text-[14px] font-semibold text-white transition-all hover:bg-[#d41e37] hover:shadow-[0_0_20px_rgba(234,42,67,0.4)] active:scale-95"
                  >
                    {t('notify_cta')}
                  </button>
                </form>

                <p className="mt-4 text-center text-[11px] text-[#737373]">
                  {t('no_spam')}
                </p>
              </div>
            ) : (
              /* Success State */
              <div className="py-6 text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/20 text-3xl text-emerald-400">
                  ✓
                </div>
                <h3
                  className="text-[26px] font-bold text-white"
                  style={{ fontFamily: 'var(--font-poppins)' }}
                >
                  {t('on_the_list')}
                </h3>
                <p className="mt-3 text-[14px] leading-relaxed text-[#b0a0a5]">
                  {t.rich('reserved_message', {
                    amount,
                    email,
                    strong: (chunks) => <strong>{chunks}</strong>,
                  })}
                </p>
                <button
                  type="button"
                  onClick={closeModal}
                  className="mt-6 rounded-full bg-white/10 px-8 py-2.5 text-[14px] font-medium text-white transition hover:bg-white/20"
                >
                  {t('got_it')}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
