/** Indonesian number as WhatsApp wants it: digits only, country code 62 instead of the leading 0.
 * "0812-3456-7890", "+62 812 3456 7890" and "812 3456 7890" all become "6281234567890". Null if it can't be a phone number. */
export function waNumber(input: string): string | null {
  let d = input.replace(/\D/g, '')
  if (d.startsWith('0')) d = '62' + d.slice(1)
  else if (d.startsWith('8')) d = '62' + d
  return /^62\d{8,13}$/.test(d) ? d : null
}

export const waLink = (input: string) => {
  const n = waNumber(input)
  return n ? `https://wa.me/${n}` : null
}
