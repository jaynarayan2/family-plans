import { HOME_ADDRESS } from './types';

export interface Suggestion {
  name: string;
  detail: string; // cuisine/type + why
  approxDistance: string; // e.g. "1.2 km"
  area: string;
}

const MODEL = 'claude-haiku-4-5-20251001';

async function askClaude(prompt: string): Promise<Suggestion[] | null> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return null;
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 1024,
        messages: [
          {
            role: 'user',
            content:
              prompt +
              `\n\nHome base is ${HOME_ADDRESS}. Respond ONLY with a JSON array of 5 objects, each: ` +
              `{"name": string, "detail": string, "approxDistance": string (like "1.4 km"), "area": string (neighbourhood)}. No prose, no markdown.`,
          },
        ],
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const text: string = data?.content?.[0]?.text ?? '';
    const match = text.match(/\[[\s\S]*\]/);
    if (!match) return null;
    const parsed = JSON.parse(match[0]);
    if (Array.isArray(parsed)) return parsed.slice(0, 6);
    return null;
  } catch {
    return null;
  }
}

export async function recommendRestaurants(
  cuisine: string,
  maxKm: number
): Promise<{ source: 'ai' | 'curated'; items: Suggestion[] }> {
  const ai = await askClaude(
    `Recommend real ${cuisine} restaurants within about ${maxKm} km of home, good for a family of 4.`
  );
  if (ai && ai.length) return { source: 'ai', items: ai };
  return { source: 'curated', items: curatedRestaurants(cuisine) };
}

export async function findActivities(
  when: string,
  maxKm: number
): Promise<{ source: 'ai' | 'curated'; items: Suggestion[] }> {
  const ai = await askClaude(
    `Suggest real things to do / activities/events around ${when} within about ${maxKm} km of home, suitable for a family.`
  );
  if (ai && ai.length) return { source: 'ai', items: ai };
  return { source: 'curated', items: curatedActivities() };
}

// ---- Curated fallbacks near 57 Spadina Ave (King West / Entertainment District) ----

function curatedRestaurants(cuisine: string): Suggestion[] {
  const c = cuisine.toLowerCase();
  const banks: Record<string, Suggestion[]> = {
    italian: [
      { name: 'Buca (King West)', detail: 'Rustic Italian, handmade pasta', approxDistance: '1.1 km', area: 'King West' },
      { name: 'Gusto 101', detail: 'Casual Italian, wood-fired', approxDistance: '0.9 km', area: 'King West' },
      { name: 'Terroni Adelaide', detail: 'Southern Italian, pizza', approxDistance: '1.3 km', area: 'Adelaide' },
      { name: 'Il Fornello', detail: 'Family-friendly pasta & pizza', approxDistance: '1.6 km', area: 'Downtown' },
      { name: 'Figo', detail: 'Modern Italian, bright room', approxDistance: '1.0 km', area: 'Entertainment District' },
    ],
    chinese: [
      { name: 'Dailo', detail: 'Modern Asian / Chinese', approxDistance: '2.2 km', area: 'Little Italy' },
      { name: 'R&D by Alvin Leung', detail: 'Chinese fusion, dim sum', approxDistance: '1.5 km', area: 'Chinatown' },
      { name: 'Rol San', detail: 'Classic Cantonese dim sum', approxDistance: '1.4 km', area: 'Chinatown' },
      { name: 'Mother’s Dumplings', detail: 'Handmade dumplings', approxDistance: '1.6 km', area: 'Chinatown' },
      { name: 'Swatow', detail: 'Late-night Cantonese', approxDistance: '1.5 km', area: 'Chinatown' },
    ],
    indian: [
      { name: 'Pukka', detail: 'Contemporary Indian', approxDistance: '4.5 km', area: 'St Clair' },
      { name: 'Adrak', detail: 'Upscale Indian', approxDistance: '5.5 km', area: 'Yorkville' },
      { name: 'Banjara', detail: 'Classic North Indian', approxDistance: '3.8 km', area: 'Annex' },
      { name: 'Bombay Palace', detail: 'Buffet & curries', approxDistance: '1.7 km', area: 'Downtown' },
      { name: 'Curry Twist', detail: 'Homestyle Indian', approxDistance: '4.0 km', area: 'Midtown' },
    ],
    japanese: [
      { name: 'Kinka Izakaya', detail: 'Izakaya small plates', approxDistance: '2.0 km', area: 'Church-Wellesley' },
      { name: 'Sushi Kaji', detail: 'Omakase sushi', approxDistance: '6.0 km', area: 'Etobicoke' },
      { name: 'JaBistro', detail: 'Premium sushi', approxDistance: '1.2 km', area: 'King West' },
      { name: 'Ramen Isshin', detail: 'Tonkotsu ramen', approxDistance: '2.4 km', area: 'College' },
      { name: 'Aburi Hana', detail: 'Kaiseki (special occasion)', approxDistance: '5.5 km', area: 'Yorkville' },
    ],
    thai: [
      { name: 'Pai Northern Thai', detail: 'Bustling northern Thai', approxDistance: '1.0 km', area: 'Entertainment District' },
      { name: 'Khao San Road', detail: 'Popular Thai street food', approxDistance: '1.1 km', area: 'Adelaide' },
      { name: 'Sabai Sabai', detail: 'Thai comfort food', approxDistance: '2.3 km', area: 'Yonge-Dundas' },
      { name: 'Sukhothai', detail: 'Cozy Thai', approxDistance: '2.0 km', area: 'Downtown' },
      { name: 'Salad King', detail: 'Fast, family-friendly Thai', approxDistance: '2.1 km', area: 'Ryerson' },
    ],
  };
  const key = Object.keys(banks).find((k) => c.includes(k));
  if (key) return banks[key];
  // generic
  return [
    { name: `Top ${cuisine} spot`, detail: `Well-reviewed ${cuisine} nearby`, approxDistance: '1.5 km', area: 'King West' },
    { name: 'Assembly Chef’s Hall', detail: 'Food hall — many cuisines', approxDistance: '1.2 km', area: 'Financial District' },
    { name: 'St. Lawrence Market', detail: 'Market eats, variety', approxDistance: '2.2 km', area: 'Old Town' },
    { name: 'Kensington Market', detail: 'Global street food', approxDistance: '1.6 km', area: 'Kensington' },
    { name: 'Richmond Station', detail: 'Comfort Canadian', approxDistance: '1.4 km', area: 'Downtown' },
  ];
}

function curatedActivities(): Suggestion[] {
  return [
    { name: 'Toronto Islands ferry', detail: 'Beaches, bikes, picnic', approxDistance: '2.5 km', area: 'Harbourfront' },
    { name: 'Ripley’s Aquarium', detail: 'Indoor, all-ages', approxDistance: '2.3 km', area: 'CN Tower' },
    { name: 'Harbourfront Centre', detail: 'Free events, waterfront walk', approxDistance: '1.8 km', area: 'Harbourfront' },
    { name: 'AGO (Art Gallery)', detail: 'Art, cafe, family programs', approxDistance: '1.5 km', area: 'Grange Park' },
    { name: 'Kensington Market stroll', detail: 'Shops, food, vintage', approxDistance: '1.6 km', area: 'Kensington' },
    { name: 'Stackt Market', detail: 'Pop-ups, food, open-air', approxDistance: '1.3 km', area: 'Bathurst' },
  ];
}
