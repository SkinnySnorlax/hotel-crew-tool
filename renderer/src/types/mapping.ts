export type RowStatus = 'READY' | 'SKIP' | 'WARNING' | 'UPDATED' | 'FAILED';

export type MappingRow = {
  rowId: string;
  reservationId: string;
  confirmationNo?: string;
  roomNo?: string | null;
  currentName: string;
  newName: string | null;
  rank?: string;
  apply: boolean;
  status: RowStatus;
  message?: string;
};
