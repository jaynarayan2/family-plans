import { UserName } from './types';

interface UserConfig {
  name: UserName;
  color: string;
  emoji: string;
  greeting: string;
  // Curated hotlinkable Unsplash images per person's theme.
  images: string[];
}

const U = (id: string) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=1400&q=70`;

// Reena — scenery / travel landscapes
const REENA = [
  '1506905925346-21bda4d32df4', // mountain lake
  '1470071459604-3b5ec3a7fe05', // foggy valley
  '1441974231531-c6227db76b6e', // forest
  '1501785888041-af3ef285b470', // lake sunset
  '1439066615861-d1af74d74000', // rolling hills
  '1454496522488-7a8e488e8606', // milky way road
];

// Dad — super cars + space
const DAD = [
  '1503376780353-7e6692767b70', // sports car
  '1552519507-da3b142c6e3d', // yellow supercar
  '1541348263662-e068662d82af', // red ferrari
  '1462331940025-496dfbfc7564', // galaxy
  '1451187580459-43490279c0fa', // earth from space
  '1614730321146-b6fa6a46bcb4', // nebula
];

// Mum — flowers
const MUM = [
  '1490750967868-88aa4486c946', // wildflowers
  '1487070183336-b863922373d4', // pink flower
  '1462275646964-a0e3386b89fa', // tulips
  '1508610048659-a06b669e3321', // sunflower field
  '1416879595882-3373a0480b5b', // lavender
  '1502977249166-824b3a8a4d6d', // roses
];

export const USER_CONFIG: Record<UserName, UserConfig> = {
  Reena: {
    name: 'Reena',
    color: '#06d6a0',
    emoji: '🏔️',
    greeting: 'Somewhere worth going',
    images: REENA,
  },
  Dad: {
    name: 'Dad',
    color: '#3a86ff',
    emoji: '🏎️',
    greeting: 'Fast cars & far galaxies',
    images: DAD,
  },
  Mum: {
    name: 'Mum',
    color: '#ef476f',
    emoji: '🌸',
    greeting: 'In full bloom',
    images: MUM,
  },
  Jay: {
    name: 'Jay',
    color: '#9d4edd',
    emoji: '✨',
    greeting: 'A little bit of everyone',
    // Jay = combination of everyone else's themes
    images: [...REENA, ...DAD, ...MUM],
  },
};

// Deterministic-per-open image pick (varies each app open).
export function pickImage(user: UserName, seed: number): string {
  const imgs = USER_CONFIG[user].images;
  return U(imgs[Math.abs(seed) % imgs.length]);
}
