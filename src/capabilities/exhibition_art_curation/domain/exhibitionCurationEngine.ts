export interface ArtExhibitionPiece {
  id: string;
  artworkCode: string;
  title: string;
  artistName: string;
  medium: string;
  dimensions: string;
  zoneLocation: string;
  insuranceValue: number;
  rentalFeeMonthly: number;
  status: 'on_display' | 'in_storage' | 'returned' | 'under_repair';
  startDate: string;
  endDate: string;
}

export function calculateMonthlyRentalTotal(pieces: ArtExhibitionPiece[]): number {
  return pieces
    .filter((p) => p.status === 'on_display')
    .reduce((sum, p) => sum + p.rentalFeeMonthly, 0);
}

export function calculateTotalInsuredValue(pieces: ArtExhibitionPiece[]): number {
  return pieces
    .filter((p) => p.status === 'on_display' || p.status === 'in_storage')
    .reduce((sum, p) => sum + p.insuranceValue, 0);
}

export function filterExpiringExhibitions(
  pieces: ArtExhibitionPiece[],
  currentDateStr: string,
  withinDays: number
): ArtExhibitionPiece[] {
  const current = new Date(currentDateStr).getTime();
  const threshold = current + withinDays * 24 * 60 * 60 * 1000;

  return pieces.filter((p) => {
    if (p.status !== 'on_display') return false;
    const end = new Date(p.endDate).getTime();
    return end >= current && end <= threshold;
  });
}
