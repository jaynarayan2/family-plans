import { Category } from './types';

// Best-effort category guess from a plan's title. Rule-based so it's instant
// and works offline. Returns null when nothing matches (leave choice to user).
export function guessCategory(title: string): Category | null {
  const t = ` ${title.toLowerCase()} `;
  if (!title.trim()) return null;
  const has = (words: string[]) => words.some((w) => t.includes(w));

  if (has(['nap', 'sleep', 'rest', 'snooze', 'siesta', 'lie down', 'lie-down', 'bedtime']))
    return 'nap';

  if (
    has([
      'dentist', 'doctor', 'appointment', 'appt', 'bank', 'haircut', 'barber', 'pharmacy',
      'pick up', 'pickup', 'drop off', 'dropoff', 'oil change', 'car service', 'mechanic',
      'vaccine', 'clinic', 'lab', 'renew', 'passport', 'post office', 'dry clean',
    ])
  )
    return 'errand';

  if (has(['mall', 'eaton', 'yorkdale', 'outlet', 'plaza', 'square one', 'shopping centre', 'shopping center']))
    return 'mall';

  if (
    has([
      'costco', 'grocery', 'groceries', 'no frills', 'walmart', 'superstore', 'loblaws',
      'metro ', 'ikea', 'target', 'shopping', 'shop ', 'buy ', 'pick up milk', 'home depot',
    ])
  )
    return 'shopping';

  if (
    has([
      'flight', 'fly', 'airport', 'vacation', 'holiday', 'trip', 'road trip', 'cottage',
      'island', 'getaway', 'cruise', 'weekend away', 'hotel', 'resort', 'travel',
    ])
  )
    return 'travel';

  if (
    has([
      'dinner', 'lunch', 'breakfast', 'brunch', 'restaurant', 'eat', 'meal', 'cafe', 'coffee',
      'ramen', 'sushi', 'pizza', 'italian', 'chinese', 'indian', 'thai', 'mexican', 'bbq',
      'burger', 'dumpling', 'noodle', 'drinks', 'food', 'takeout', 'take-out', 'tacos',
    ])
  )
    return 'dinner';

  if (
    has([
      'movie', 'cinema', 'park', 'museum', 'zoo', 'aquarium', 'hike', 'walk', 'concert',
      'show', 'gym', 'swim', 'class', 'festival', 'beach', 'bowling', 'skate', 'skating',
      'game', 'play ', 'picnic', 'tour', 'gallery', 'fair', 'workout', 'yoga', 'bike',
    ])
  )
    return 'activity';

  return null;
}
