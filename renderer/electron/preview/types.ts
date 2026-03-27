// electron/preview/types.ts
export type OperaReservation = {
  reservationId: string;
  confirmationNo?: string;
  roomNo?: string | null;
  currentName: string;
  status?: string;
};
