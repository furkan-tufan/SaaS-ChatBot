import type { NavigationItem } from '../client/components/NavBar/NavBar';
import { routes } from 'wasp/client/router';
import { DocsUrl, BlogUrl } from '../shared/common';
import daBoiAvatar from '../client/static/da-boi.webp';
import avatarPlaceholder from '../client/static/avatar-placeholder.webp';

export const landingPageNavigationItems: NavigationItem[] = [
  { name: 'Karşılaştırma', to: routes.ComparatorPageRoute.to },
  { name: 'Özetleme', to: routes.SummarizerPageRoute.to },
  { name: 'DocMentor', to: routes.QAPageRoute.to },
  { name: 'Bileşenler', to: '#features' },
  { name: 'Fiyatlandırma', to: routes.PricingPageRoute.to },
];
export const features = [
  {
    name: 'Dosya Karşılaştırma',
    description: 'Belgeler arasındaki farkları hızlıca tespit eder. ',
    icon: '🔍',
    href: DocsUrl,
  },
  {
    name: 'Dosya Özetleme',
    description: 'Belge üzerindeki önemli alanları özetler.',
    icon: '📝',
    href: DocsUrl,
  },
  {
    name: 'DocMentor',
    description: 'Belge üzerinden doğal dilde soru sorulmasına olanak tanır.',
    icon: '💬',
    href: DocsUrl,
  },
  {
    name: 'LLM ile Karşılaştırma',
    description: 'Yapay zekâ destekli karşılaştırmayla belgelerin farklarını analiz eder.',
    icon: '🧠',
    href: DocsUrl,
  },
];
export const testimonials = [
  {
    name: 'Da Boi',
    role: 'Wasp Mascot',
    avatarSrc: daBoiAvatar,
    socialUrl: 'https://twitter.com/wasplang',
    quote: "I don't even know how to code. I'm just a plushie.",
  },
  {
    name: 'Mr. Foobar',
    role: 'Founder @ Cool Startup',
    avatarSrc: avatarPlaceholder,
    socialUrl: '',
    quote: 'This product makes me cooler than I already am.',
  },
  {
    name: 'Jamie',
    role: 'Happy Customer',
    avatarSrc: avatarPlaceholder,
    socialUrl: '#',
    quote: 'My cats love it!',
  },
];

export const faqs = [
  {
    id: 1,
    question: 'Whats the meaning of life?',
    answer: '42.',
    href: 'https://en.wikipedia.org/wiki/42_(number)',
  },
];
export const footerNavigation = {
  app: [
    { name: 'Karşılaştırma', href: routes.ComparatorPageRoute.to },
    { name: 'Özetleme', href: routes.SummarizerPageRoute.to },
    { name: 'DocMentor', href: routes.QAPageRoute.to },
  ],
  company: [
    { name: 'Hakkımızda', href: 'https://golive.com.tr/about-us' },
  ],
};
