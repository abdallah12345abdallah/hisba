// Stable pale tint + ink per person, from the name, so a trader keeps the same colours everywhere.
const TINTS = [
  ['#dbeff5', '#0b5870'], ['#ffe8e4', '#9a3412'], ['#e4f6ec', '#1f6b45'],
  ['#fff1d6', '#7a5200'], ['#ece9fb', '#4a3f8f'],
]

export function tint(name) {
  let h = 0
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  const [background, color] = TINTS[h % TINTS.length]
  return { background, color }
}

// two letters from the distinctive word: skips "مزرعة", "الحاج", "أبو", "سوبر ماركت"
export function initials(name) {
  const skip = ['مزرعة', 'الحاج', 'أبو', 'سوبر', 'ماركت', 'الشيخ', 'عميل']
  const word = name.split(' ').find((w) => !skip.includes(w)) || name
  return word.replace(/^ال/, '').slice(0, 2)
}
