/**
 * 20 default sticker definitions.
 * Using emoji as the visual representation to avoid bundling image assets.
 * Each sticker has a unique id and a display emoji.
 */
export interface StickerDef {
  id: string;
  emoji: string;
  label: string;
}

export const DEFAULT_STICKERS: StickerDef[] = [
  { id: 'heart', emoji: '❤️', label: 'Heart' },
  { id: 'star', emoji: '⭐', label: 'Star' },
  { id: 'fire', emoji: '🔥', label: 'Fire' },
  { id: 'sparkles', emoji: '✨', label: 'Sparkles' },
  { id: 'kiss', emoji: '💋', label: 'Kiss' },
  { id: 'rose', emoji: '🌹', label: 'Rose' },
  { id: 'ring', emoji: '💍', label: 'Ring' },
  { id: 'couple', emoji: '💑', label: 'Couple' },
  { id: 'moon', emoji: '🌙', label: 'Moon' },
  { id: 'sun', emoji: '☀️', label: 'Sun' },
  { id: 'rainbow', emoji: '🌈', label: 'Rainbow' },
  { id: 'cake', emoji: '🎂', label: 'Cake' },
  { id: 'gift', emoji: '🎁', label: 'Gift' },
  { id: 'balloon', emoji: '🎈', label: 'Balloon' },
  { id: 'music', emoji: '🎵', label: 'Music' },
  { id: 'plane', emoji: '✈️', label: 'Plane' },
  { id: 'palm', emoji: '🌴', label: 'Palm Tree' },
  { id: 'camera', emoji: '📷', label: 'Camera' },
  { id: 'wine', emoji: '🍷', label: 'Wine' },
  { id: 'butterfly', emoji: '🦋', label: 'Butterfly' },
];
