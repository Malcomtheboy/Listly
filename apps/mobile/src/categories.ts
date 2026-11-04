import type { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import type { Analysis, Category } from './services/types';

type IconName = ComponentProps<typeof Ionicons>['name'];

export type Tip = { icon: IconName; title: string; text: string };

export type CategoryInfo = {
  key: Category;
  label: string;
  icon: IconName;
  headline: string;
  subhead: string;
  sites: string[];
  placeholder: string;
  tips: Tip[];
};

export const CATEGORIES: Record<Category, CategoryInfo> = {
  rental: {
    key: 'rental',
    label: 'Bolig',
    icon: 'home',
    headline: 'Er leieannonsen ekte?',
    subhead: 'Sjekk annonsen før du betaler noe. Vi finner faresignalene du lett overser.',
    sites: ['Finn', 'Hybel', 'Facebook', 'Rightmove'],
    placeholder: 'Lim inn lenke eller tekst fra leieannonsen…',
    tips: [
      { icon: 'airplane-outline', title: 'Utleier er «i utlandet»', text: 'Vil sende nøklene i posten etter at du har betalt. Boligen finnes ofte ikke.' },
      { icon: 'cash-outline', title: 'Betal før visning', text: 'Ekte utleiere lar deg se boligen og skrive kontrakt før du betaler noe.' },
      { icon: 'pricetag-outline', title: 'For god til å være sann', text: 'Mye lavere husleie enn resten av området er et av de tydeligste faresignalene.' },
      { icon: 'card-outline', title: 'Depositum til privat konto', text: 'I Norge skal depositum stå på en egen depositumskonto i ditt navn.' },
      { icon: 'images-outline', title: 'Stjålne bilder', text: 'Søk opp bildene med Google Lens. Dukker de opp i en annen annonse eller på et hotell, er det svindel.' },
    ],
  },
  car: {
    key: 'car',
    label: 'Bil',
    icon: 'car-sport',
    headline: 'Er bilannonsen ekte?',
    subhead: 'Sjekk bruktbilen før du betaler. Vi ser etter kjente triks og det som mangler.',
    sites: ['Finn', 'Facebook', 'Blocket', 'Bilbasen'],
    placeholder: 'Lim inn lenke eller tekst fra bilannonsen…',
    tips: [
      { icon: 'boat-outline', title: 'Bilen står i utlandet', text: 'Selgeren vil «sende» bilen til deg. Kjøp bare bil du har sett og prøvekjørt.' },
      { icon: 'cube-outline', title: 'Falskt fraktfirma', text: 'Du blir bedt om å betale til et fraktfirma eller en «deponering». Det er svindlerens konto.' },
      { icon: 'lock-closed-outline', title: 'Betal for å reservere', text: 'Ekte selgere ber ikke om forskudd for å holde av en bil du ikke har sett.' },
      { icon: 'document-text-outline', title: 'Sjekk regnr. og heftelser', text: 'Sjekk at modell og årgang stemmer hos Statens vegvesen, og at bilen ikke har gjeld.' },
      { icon: 'speedometer-outline', title: 'Kilometerstand', text: 'Be om servicehefte. En bil med lav km og lav pris bør få deg til å stille spørsmål.' },
    ],
  },
};

export const CATEGORY_ORDER: Category[] = ['rental', 'car'];

// Saved analyses from before cars existed have no category: they are all rentals.
export function categoryOf(a: Pick<Analysis, 'category'>): Category {
  return a.category ?? 'rental';
}

export function listingTitle(a: Analysis): string {
  if (a.category === 'car') {
    const f = a.facts;
    return f.title ?? ([f.make, f.model, f.year].filter(Boolean).join(' ') || 'Bilannonse');
  }
  return a.facts.title ?? a.facts.address ?? 'Boligannonse';
}

export function listingPlace(a: Analysis): string | null {
  return a.category === 'car' ? a.facts.location : a.facts.city;
}
