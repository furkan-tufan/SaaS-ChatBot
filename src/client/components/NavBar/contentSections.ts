import type { NavigationItem } from '../NavBar/NavBar';
import { routes } from 'wasp/client/router';

export const appNavigationItems: NavigationItem[] = [
  { name: 'Karşılaştırma', to: routes.ComparatorPageRoute.to },
  { name: 'Özetleme', to: routes.SummarizerPageRoute.to },
  { name: 'Soru-Cevap', to: routes.QAPageRoute.to },
  { name: 'Fiyatlandırma', to: routes.PricingPageRoute.to },
];
