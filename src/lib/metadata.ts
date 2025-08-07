import { Metadata } from 'next';

export interface PageMetadata {
  title: string;
  description: string;
  keywords?: string[];
  image?: string;
  noIndex?: boolean;
}

export function generateMetadata({
  title,
  description,
  keywords = [],
  image,
  noIndex = false,
}: PageMetadata): Metadata {
  const baseTitle = 'Shivgoraksha Ashram Management System';
  const fullTitle = title ? `${title} | ${baseTitle}` : baseTitle;

  return {
    title: fullTitle,
    description,
    keywords: [
      'ashram',
      'spiritual',
      'appointments',
      'guruji',
      'meditation',
      'ayurveda',
      'spiritual guidance',
      ...keywords,
    ],
    openGraph: {
      title: fullTitle,
      description,
      type: 'website',
      locale: 'en_US',
      images: image ? [{ url: image }] : undefined,
    },
    twitter: {
      card: 'summary_large_image',
      title: fullTitle,
      description,
      images: image ? [image] : undefined,
    },
    robots: {
      index: !noIndex,
      follow: !noIndex,
    },
  };
}

export const defaultMetadata: Metadata = generateMetadata({
  title: 'Home',
  description: 'Comprehensive management system for Shivgoraksha Ashram - appointments, spiritual guidance, and community services.',
  keywords: ['ashram', 'spiritual', 'management'],
});

export const authMetadata: Metadata = generateMetadata({
  title: 'Authentication',
  description: 'Sign in to your Shivgoraksha Ashram account',
  noIndex: true,
});

export const dashboardMetadata: Metadata = generateMetadata({
  title: 'Dashboard',
  description: 'Your personal dashboard for managing appointments and spiritual activities',
});

export const appointmentsMetadata: Metadata = generateMetadata({
  title: 'Appointments',
  description: 'Book and manage your spiritual appointments with our gurujis',
  keywords: ['appointments', 'booking', 'spiritual guidance'],
});

export const remediesMetadata: Metadata = generateMetadata({
  title: 'Remedies',
  description: 'Access spiritual and ayurvedic remedies prescribed by our gurujis',
  keywords: ['remedies', 'ayurveda', 'spiritual healing'],
});

export const adminMetadata: Metadata = generateMetadata({
  title: 'Admin Panel',
  description: 'Administrative dashboard for managing ashram operations',
  noIndex: true,
}); 