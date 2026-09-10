export const PRODUCT_DISPLAY_LABELS = {
  AVAILABLE: 'Còn hàng',
  LOCKED: 'Đang lock',
  DEPOSITED: 'Đã bán',
  SOLD: 'Đã bán',
  UNAVAILABLE: 'Tạm ngưng'
} as const;

export function getCanonicalProductLabel(
  status?: string | null,
  legacyLabel?: string | null
): string {
  const normalizedStatus = String(status || '').trim().toUpperCase();
  if (normalizedStatus in PRODUCT_DISPLAY_LABELS) {
    return PRODUCT_DISPLAY_LABELS[normalizedStatus as keyof typeof PRODUCT_DISPLAY_LABELS];
  }

  const normalizedLabel = String(legacyLabel || '').trim().toLowerCase();
  if (['đã bán', 'đã cọc', 'đã khớp'].includes(normalizedLabel)) return 'Đã bán';
  if (['đang lock', 'đang giữ chỗ', 'đang khóa', 'đang khoá'].includes(normalizedLabel)) return 'Đang lock';
  if (['còn hàng', 'check admin', 'available'].includes(normalizedLabel)) return 'Còn hàng';
  if (normalizedLabel === 'tạm ngưng' || normalizedLabel === 'cdt thu căn') return 'Tạm ngưng';
  return 'Còn hàng';
}
