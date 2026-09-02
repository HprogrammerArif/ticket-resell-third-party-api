'use client';

import { useTranslations } from 'next-intl';

import { useEffect, useRef, useState } from 'react';

interface StatItem {
  value: string;
  number: number;
  suffix: string;
  label: string;
  description: string;
  icon: string;
}

interface StatsSectionProps {
  stat1Value?: string;
  stat1Label?: string;
  stat2Value?: string;
  stat2Label?: string;
  stat3Value?: string;
  stat3Label?: string;
  stat4Value?: string;
  stat4Label?: string;
}

export function StatsSection({
  stat1Value = '10M+',
  stat1Label = 'Tickets Sold',
  stat2Value = '50K+',
  stat2Label = 'Events Listed',
  stat3Value = '98%',
  stat3Label = 'Customer Satisfaction',
  stat4Value = '150+',
  stat4Label = 'Cities Covered',
}: StatsSectionProps) {
  const t = useTranslations('StatsSection');
  const [isVisible, setIsVisible] = useState(false);
  const sectionRef = useRef<HTMLDivElement>(null);

  const stats: StatItem[] = [
    {
      value: stat1Value,
      number: 10,
      suffix: 'M+',
      label: stat1Label,
      description: t('stat_1_description'),
      icon: '🎟️',
    },
    {
      value: stat2Value,
      number: 50,
      suffix: 'K+',
      label: stat2Label,
      description: t('stat_2_description'),
      icon: '🏟️',
    },
    {
      value: stat3Value,
      number: 98,
      suffix: '%',
      label: stat3Label,
      description: t('stat_3_description'),
      icon: '⭐',
    },
    {
      value: stat4Value,
      number: 150,
      suffix: '+',
      label: stat4Label,
      description: t('stat_4_description'),
      icon: '📍',
    },
  ];

  const guarantees = [
    { icon: '🛡️', title: t('guarantee_1_title'), desc: t('guarantee_1_description') },
    { icon: '⚡', title: t('guarantee_2_title'), desc: t('guarantee_2_description') },
    { icon: '🔒', title: t('guarantee_3_title'), desc: t('guarantee_3_description') },
    { icon: '🎧', title: t('guarantee_4_title'), desc: t('guarantee_4_description') },
  ];

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.2 },
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <section ref={sectionRef} className="mx-auto max-w-[1440px] px-[107px] py-20 max-md:px-4">
      {/* Outer Card with subtle glow */}
      <div className={`relative overflow-hidden rounded-[32px] border border-white/10 bg-gradient-to-b from-[#141414] via-[#0f0f0f] to-[#12070a] p-8 shadow-2xl transition-all duration-1000 sm:p-12 lg:p-16 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-85 translate-y-2'}`}>
        {/* Subtle Ambient Radial Glows */}
        <div className="pointer-events-none absolute -left-20 top-0 h-80 w-80 rounded-full bg-[radial-gradient(circle,rgba(234,42,67,0.12),transparent_70%)]" />
        <div className="pointer-events-none absolute -right-20 bottom-0 h-80 w-80 rounded-full bg-[radial-gradient(circle,rgba(234,42,67,0.12),transparent_70%)]" />

        {/* Section Header */}
        <div className="relative z-10 mb-14 text-center">
          <p
            className="mb-3 text-[12px] font-bold tracking-[0.25em] text-[var(--color-brand)] uppercase"
            style={{ fontFamily: 'var(--font-jakarta)' }}
          >
            {t('eyebrow')}
          </p>
          <h2
            className="text-[32px] font-bold text-white sm:text-[40px]"
            style={{ fontFamily: 'var(--font-poppins)' }}
          >
            {t('heading')}
          </h2>
          <p className="mx-auto mt-2 max-w-2xl text-[15px] text-[#a1a1a1]">
            {t('subheading')}
          </p>
        </div>

        {/* Stats Grid */}
        <div className="relative z-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat, idx) => (
            <div
              key={idx}
              className="group relative flex flex-col justify-between rounded-2xl border border-white/5 bg-white/[0.02] p-6 text-center backdrop-blur-sm transition-all duration-300 hover:-translate-y-1.5 hover:border-[var(--color-brand-muted)] hover:bg-white/[0.04] hover:shadow-xl hover:shadow-[var(--color-brand-subtle)]"
            >
              {/* Top icon */}
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-white/5 text-2xl transition-transform duration-300 group-hover:scale-110 group-hover:bg-[var(--color-brand-subtle)]">
                {stat.icon}
              </div>

              {/* Number with gradient font */}
              <div>
                <p
                  className="bg-gradient-to-r from-white via-[#f0f0f0] to-[var(--color-brand)] bg-clip-text text-[44px] font-extrabold tracking-tight text-transparent sm:text-[48px]"
                  style={{ fontFamily: 'var(--font-poppins)' }}
                >
                  {stat.value}
                </p>
                <p
                  className="mt-1 text-[16px] font-semibold text-white"
                  style={{ fontFamily: 'var(--font-poppins)' }}
                >
                  {stat.label}
                </p>
              </div>

              {/* Description */}
              <p
                className="mt-3 text-[12px] leading-relaxed text-[#8a8a8a]"
                style={{ fontFamily: 'var(--font-jakarta)' }}
              >
                {stat.description}
              </p>
            </div>
          ))}
        </div>

        {/* Guarantee Banner Strip */}
        <div className="relative z-10 mt-12 border-t border-white/10 pt-10">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {guarantees.map((item, idx) => (
              <div
                key={idx}
                className="flex items-center gap-3.5 rounded-xl border border-white/5 bg-white/[0.02] p-4 transition-colors hover:border-white/15 hover:bg-white/[0.05]"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/5 text-xl">
                  {item.icon}
                </span>
                <div className="text-left">
                  <p className="text-[13px] font-bold text-white">{item.title}</p>
                  <p className="text-[11px] text-[#8a8a8a]">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
