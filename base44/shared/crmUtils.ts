// Shared CRM/dedup utilities — used by crmSync and xtremeDirectorySync

export function normEmail(e) {
  return (e || '').toLowerCase().trim();
}

export function normPhone(p) {
  if (!p) return '';
  let n = p.replace(/[^\d+]/g, '');
  if (!n.startsWith('+') && n.length === 10) n = '+1' + n;
  if (!n.startsWith('+') && n.length === 11) n = '+' + n;
  return n;
}

export function dedupKeyCrm(c) {
  const e = normEmail(c.email);
  if (e) return `email:${e}`;
  const p = normPhone(c.phone);
  if (p) return `phone:${p}`;
  const co = (c.company || c.business_name || c.full_name || '').toLowerCase().trim();
  return `name:${co}`;
}

export function dedupKeyDirectory(businessName, phone, city, state) {
  return `${(businessName || '').toLowerCase()}|${phone || ''}|${city || ''}|${state || ''}`;
}