// electron/preview/parseTxt.ts

export type ParsedCrewMember = {
  name: string;
  rank: string;
};

export type ParsedTxt = {
  techCrew: ParsedCrewMember[];
  cabinCrew: ParsedCrewMember[];
};

const FLIGHT_LINE_RE = /^[A-Z]{2}\d{3,4}\/\d{2}[A-Z]{3}\d{2}$/i;

const IGNORE_EXACT = new Set(['CREW NAME', 'OUTBOUND', 'OPERATING']);

function normalizeLine(line: string): string {
  return line.replace(/\s+/g, ' ').trim();
}

function isIgnoredLine(line: string): boolean {
  if (!line) return true;

  const upper = line.toUpperCase();

  if (IGNORE_EXACT.has(upper)) return true;
  if (upper.startsWith('SPOUSE NAME:')) return true;
  if (upper.startsWith('*CREW-IN-COMMAND')) return true;
  if (FLIGHT_LINE_RE.test(upper)) return true;

  return false;
}

function extractCrewMember(line: string): ParsedCrewMember | null {
  // Examples:
  // 01 CPT *LEMUEL CHANG SZE SIANG
  // 02 FO ALVIN NICHOLAS CHEW SOO BIN
  // 01 IFM RONALD DOMINIC GALLYOT
  const match = line.match(/^\d{1,2}\s+([A-Z]{2,5})\s+(.+)$/i);
  if (!match) return null;

  const rank = match[1].toUpperCase();
  const cleaned = match[2].replace(/^\*+/, '').replace(/,/g, '').replace(/\s+/g, ' ').trim();
  if (!cleaned) return null;
  return { rank, name: cleaned };
}

export function parseTxt(txtContent: string): ParsedTxt {
  const lines = txtContent
    .replace(/^\uFEFF/, '')
    .split(/\r?\n/)
    .map(normalizeLine)
    .filter(Boolean);

  const techCrew: ParsedCrewMember[] = [];
  const cabinCrew: ParsedCrewMember[] = [];

  let section: 'TECH' | 'CABIN' | null = null;

  for (const line of lines) {
    const upper = line.toUpperCase();

    if (upper.startsWith('TECH CREW ON ')) {
      section = 'TECH';
      continue;
    }

    if (upper.startsWith('CABIN CREW ON ')) {
      section = 'CABIN';
      continue;
    }

    if (isIgnoredLine(line)) continue;

    const member = extractCrewMember(line);
    if (!member) continue;

    if (section === 'TECH') {
      techCrew.push(member);
      continue;
    }

    if (section === 'CABIN') {
      cabinCrew.push(member);
      continue;
    }
  }

  return { techCrew, cabinCrew };
}
