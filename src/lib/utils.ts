import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Define types locally since they're not properly exported from the package
type AccountAssociation = {
  header: {
    t: string;
    fid: number;
    [key: string]: any;
  };
  payload: {
    [key: string]: any;
  };
  signature: string;
};

type Manifest = {
  accountAssociation?: AccountAssociation;
  miniapp: {
    version: string;
    name: string;
    homeUrl: string;
    iconUrl: string;
    imageUrl: string;
    buttonTitle: string;
    splashImageUrl: string;
    splashBackgroundColor: string;
    webhookUrl: string;
  };
};
import {
  APP_BUTTON_TEXT,
  APP_DESCRIPTION,
  APP_ICON_URL,
  APP_NAME,
  APP_OG_IMAGE_URL,
  APP_PRIMARY_CATEGORY,
  APP_SPLASH_BACKGROUND_COLOR,
  APP_SPLASH_URL,
  APP_TAGS,
  APP_URL,
  APP_WEBHOOK_URL,
  APP_ACCOUNT_ASSOCIATION,
} from './constants';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getMiniAppEmbedMetadata(ogImageUrl?: string) {
  return {
    version: 'next',
    imageUrl: ogImageUrl ?? APP_OG_IMAGE_URL,
    ogTitle: APP_NAME,
    ogDescription: APP_DESCRIPTION,
    ogImageUrl: ogImageUrl ?? APP_OG_IMAGE_URL,
    button: {
      title: APP_BUTTON_TEXT,
      action: {
        type: 'launch_frame',
        name: APP_NAME,
        url: APP_URL,
        splashImageUrl: APP_SPLASH_URL,
        iconUrl: APP_ICON_URL,
        splashBackgroundColor: APP_SPLASH_BACKGROUND_COLOR,
        description: APP_DESCRIPTION,
        primaryCategory: APP_PRIMARY_CATEGORY,
        tags: APP_TAGS,
      },
    },
  };
}

export async function getFarcasterDomainManifest(): Promise<Manifest> {
  const manifest: Manifest = {
    miniapp: {
      version: '1',
      name: APP_NAME ?? 'Quiz Trivia',
      homeUrl: APP_URL,
      iconUrl: APP_ICON_URL,
      imageUrl: APP_OG_IMAGE_URL,
      buttonTitle: APP_BUTTON_TEXT ?? 'Launch Mini App',
      splashImageUrl: APP_SPLASH_URL,
      splashBackgroundColor: APP_SPLASH_BACKGROUND_COLOR,
      webhookUrl: APP_WEBHOOK_URL,
    },
  };

  // Only add accountAssociation if it's defined
  if (APP_ACCOUNT_ASSOCIATION) {
    manifest.accountAssociation = APP_ACCOUNT_ASSOCIATION;
  }

  return manifest;
}

// New function for frame manifest (Neynar format)
export async function getNeynarFrameManifest() {
  return {
    accountAssociation: APP_ACCOUNT_ASSOCIATION,
    frame: {
      version: '1',
      name: APP_NAME ?? 'Quiz Trivia',
      iconUrl: APP_ICON_URL,
      splashBackgroundColor: APP_SPLASH_BACKGROUND_COLOR,
      homeUrl: APP_URL,
      // Critical: Neynar webhook URL for notification events
      webhookUrl: `https://api.neynar.com/f/app/${process.env.NEYNAR_CLIENT_ID}/event`
    }
  };
}
