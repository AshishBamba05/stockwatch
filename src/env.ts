function isPlaceholder(value: string) {
  return ['USER', 'PASSWORD', 'HOST', 'PORT', 'DBNAME'].some(token => value.includes(token));
}

export function getEnvOrDefault(value: string | undefined, fallback: string) {
  const trimmed = value?.trim();
  if (!trimmed || isPlaceholder(trimmed)) return fallback;
  return trimmed;
}
