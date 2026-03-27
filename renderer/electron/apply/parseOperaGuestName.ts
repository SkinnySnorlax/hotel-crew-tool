export type ParsedOperaGuestName =
  | {
      ok: true;
      cleanedFullName: string;
      firstName: string;
      lastName: string;
    }
  | {
      ok: false;
      cleanedFullName: string;
      error: string;
    };

function normalizeSpaces(value: string): string {
  return value.trim().replace(/\s+/g, ' ');
}

export function parseOperaGuestName(input: string): ParsedOperaGuestName {
  const cleanedFullName = normalizeSpaces(input.replace(/,/g, ''));

  if (!cleanedFullName) {
    return {
      ok: false,
      cleanedFullName: '',
      error: 'Name is empty',
    };
  }

  const tokens = cleanedFullName.split(' ').filter(Boolean);

  if (tokens.length < 2) {
    return {
      ok: false,
      cleanedFullName,
      error: 'Could not split into Opera last name and first name',
    };
  }

  const lastName = tokens[0];
  const firstName = tokens.slice(1).join(' ');

  if (!lastName || !firstName) {
    return {
      ok: false,
      cleanedFullName,
      error: 'Missing Opera last name or first name',
    };
  }

  return {
    ok: true,
    cleanedFullName,
    lastName,
    firstName,
  };
}
