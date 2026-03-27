import type { MappingRow } from '../../src/types/mapping';
import type { ParsedTxt } from './parseTxt.js';

export type PreviewReservation = {
  reservationId: string;
  roomNo: string | null;
  currentName: string;
};

type Bucket = 'TECH' | 'CABIN' | 'NONE';

function parseRoomNo(roomNo: string | null): number {
  if (!roomNo) return -1;

  const n = Number(roomNo);
  return Number.isNaN(n) ? -1 : n;
}

function getPlaceholderBucket(currentName: string): Bucket {
  const upper = currentName.toUpperCase().trim();

  if (
    upper === 'SINGAPORE AIRLINES TECH CREW' ||
    upper === 'SINGAPORE AIRLINES TECH CREW (NIGHT)'
  ) {
    return 'TECH';
  }

  if (
    upper === 'SINGAPORE AIRLINES CREW' ||
    upper === 'SINGAPORE AIRLINES CREW (NIGHT)'
  ) {
    return 'CABIN';
  }

  return 'NONE';
}

function bucketRank(bucket: Bucket): number {
  if (bucket === 'TECH') return 0;
  if (bucket === 'CABIN') return 1;
  return 2;
}

function sortReservationsForReview(
  reservations: PreviewReservation[],
): PreviewReservation[] {
  return [...reservations].sort((a, b) => {
    const bucketCompare =
      bucketRank(getPlaceholderBucket(a.currentName)) -
      bucketRank(getPlaceholderBucket(b.currentName));

    if (bucketCompare !== 0) return bucketCompare;

    // Highest room number first within each bucket
    return parseRoomNo(b.roomNo) - parseRoomNo(a.roomNo);
  });
}

export function buildPreviewRows(
  reservations: PreviewReservation[],
  parsedTxt: ParsedTxt,
): MappingRow[] {
  const sortedReservations = sortReservationsForReview(reservations);

  // Keep TXT order as-is:
  // 01, 02, 03... should map to highest rooms first within each bucket.
  const remainingTechCrew = [...parsedTxt.techCrew];
  const remainingCabinCrew = [...parsedTxt.cabinCrew];

  return sortedReservations.map((reservation) => {
    const bucket = getPlaceholderBucket(reservation.currentName);

    if (bucket === 'NONE') {
      return {
        rowId: reservation.reservationId,
        reservationId: reservation.reservationId,
        roomNo: reservation.roomNo,
        currentName: reservation.currentName,
        newName: null,
        apply: false,
        status: 'SKIP',
        message: 'Not a supported placeholder',
      };
    }

    const nextMember =
      bucket === 'TECH'
        ? (remainingTechCrew.shift() ?? null)
        : (remainingCabinCrew.shift() ?? null);

    if (!nextMember) {
      return {
        rowId: reservation.reservationId,
        reservationId: reservation.reservationId,
        roomNo: reservation.roomNo,
        currentName: reservation.currentName,
        newName: null,
        apply: false,
        status: 'SKIP',
        message:
          bucket === 'TECH'
            ? 'No TECH crew name available'
            : 'No CABIN crew name available',
      };
    }

    return {
      rowId: reservation.reservationId,
      reservationId: reservation.reservationId,
      roomNo: reservation.roomNo,
      currentName: reservation.currentName,
      newName: nextMember.name,
      rank: nextMember.rank,
      apply: true,
      status: 'READY',
    };
  });
}
