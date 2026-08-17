import Image from 'next/image';
import { getTranslations } from 'next-intl/server';
import { SectionHeading } from '@/components/catalog/SectionHeading';

export async function HowItWorksSection(props: { locale: string }) {
  const t = await getTranslations({ locale: props.locale, namespace: 'HomePage' });

  const steps = [
    {
      step: 1,
      title: t('step_1_title'),
      description: t('step_1_description'),
      image: '/assets/images/howitworks1.svg',
      colSpan: 'md:col-span-3 lg:col-span-3',
      maxDescWidth: 'max-w-xs',
      icon: (
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
      ),
    },
    {
      step: 2,
      title: t('step_2_title'),
      description: t('step_2_description'),
      image: '/assets/images/howitworks2.svg',
      colSpan: 'md:col-span-6 lg:col-span-6',
      maxDescWidth: 'max-w-md',
      icon: (
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
          <line x1="10" y1="9" x2="8" y2="9" />
        </svg>
      ),
    },
    {
      step: 3,
      title: t('step_3_title'),
      description: t('step_3_description'),
      image: '/assets/images/howitworks3.svg',
      colSpan: 'md:col-span-3 lg:col-span-3',
      maxDescWidth: 'max-w-xs',
      icon: (
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="7 10 12 15 17 10" />
          <line x1="12" y1="15" x2="12" y2="3" />
        </svg>
      ),
    },
  ];

  return (
    <section className="mx-auto max-w-[1440px] px-[107px] py-16 max-md:px-4">
      <SectionHeading title={t('how_it_works_heading')} />

      <div className="grid grid-cols-1 items-stretch gap-6 md:grid-cols-12">
        {steps.map((item) => (
          <div
            key={item.step}
            className={`group relative flex h-[380px] flex-col justify-end overflow-hidden rounded-[24px] border border-white/10 p-6 text-center transition-all duration-300 hover:border-white/20 hover:shadow-2xl hover:shadow-[var(--color-brand-subtle)] ${item.colSpan}`}
          >
            {/* Background SVG Image */}
            <div className="absolute inset-0">
              <Image
                src={item.image}
                alt={item.title}
                fill
                className="object-cover transition-transform duration-700 group-hover:scale-105"
                unoptimized
              />
            </div>

            {/* Gradient Dark Overlay for readability */}
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#0f0f0f] via-[#0f0f0f]/60 to-transparent" />

            {/* Step Number Badge positioned in top-right notch */}
            <div className="absolute right-3.5 top-3.5 z-20 flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-[#12080a]/90 text-[18px] font-bold text-[#ea2a43] shadow-lg backdrop-blur-sm transition-transform duration-300 group-hover:scale-110">
              {item.step}
            </div>

            {/* Card Content (Icon + Title + Description) */}
            <div className="relative z-10 flex flex-col items-center">
              {/* Icon Container */}
              <div className="mb-2 flex h-12 w-12 items-center justify-center text-white/90 transition-transform duration-300 group-hover:scale-110">
                {item.icon}
              </div>

              {/* Title */}
              <h3
                className="mb-2 text-[18px] font-bold text-white transition-colors group-hover:text-white sm:text-[20px]"
                style={{ fontFamily: 'var(--font-poppins)' }}
              >
                {item.title}
              </h3>

              {/* Description */}
              <p
                className={`text-[13px] leading-relaxed text-[#b0a0a5] sm:text-[14px] ${item.maxDescWidth}`}
                style={{ fontFamily: 'var(--font-jakarta)' }}
              >
                {item.description}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
