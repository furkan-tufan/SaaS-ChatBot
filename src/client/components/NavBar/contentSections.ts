import type { NavigationItem } from '../NavBar/NavBar';
import { routes } from 'wasp/client/router';

export const appNavigationItems: NavigationItem[] = [
  { name: 'Karşılaştırma', to: routes.SummarizerPageRoute.to },
  { name: 'Özetleme', to: routes.ComparatorPageRoute.to },
  { name: 'Soru-Cevap', to: routes.QAPageRoute.to },
  { name: 'Fiyatlandırma', to: routes.PricingPageRoute.to },
];
