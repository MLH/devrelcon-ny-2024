const LOGO_DEV_TOKEN = 'pk_cqaZGOfPRfGP-BOLlIIW0Q';

export function companyLogoUrl(companyName: string): string {
  if (!companyName) return '';
  return `https://img.logo.dev/name/${encodeURIComponent(companyName)}?token=${LOGO_DEV_TOKEN}&format=png`;
}
