export function slugify(input: string, max = 80): string {
  return input
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, max)
    .replace(/-+$/g, '')
}

export const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/
