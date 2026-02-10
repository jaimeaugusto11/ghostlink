export const adjectives = [
  'Neon', 'Shadow', 'Cyber', 'Ghost', 'Crimson', 'Azure', 'Silent', 'Rapid', 'Digital', 'Techno',
  'Solar', 'Lunar', 'Cosmic', 'Void', 'Electric', 'Stealth', 'Rogue', 'Prime', 'Elite', 'Null'
];

export const nouns = [
  'Fox', 'Eagle', 'Wolf', 'Hawk', 'Falcon', 'Viper', 'Cobra', 'Phantom', 'Spectre', 'Ronin',
  'Knight', 'Ninja', 'Samurai', 'Hunter', 'Scout', 'Nomad', 'Reaper', 'Raven', 'Tiger', 'Dragon'
];

export function generateCodename(): string {
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  const num = Math.floor(Math.random() * 99) + 1;
  return `${adj} ${noun} ${num}`;
}
