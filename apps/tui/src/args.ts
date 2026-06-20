export const VERSION = '0.1.0';

export const HELP = `pacer — split a salary into a bridge payment plus recurring allowances

Usage:
  pacer            launch the interactive TUI
  pacer --help     show this help and exit
  pacer --version  show the version and exit

In the TUI:
  Pay date   YYYY-MM-DD, MM-DD, blank or \`today\`
  Last day   YYYY-MM-DD, MM-DD, or a relative offset like +30
  Amount     Rand, optional cents: 5000, R5,000, 5000.50

Keys:
  Enter confirm   Esc back   ←/→ move cursor   F2 settings   Ctrl+C quit
  Results: ↑/↓ move money into the bridge   PgUp/PgDn ×10   Home/End min/max
           s save csv   q quit

Set NO_COLOR to disable colored output.
`;

type ArgKind = 'help' | 'version' | 'unknown' | 'run';

export function classifyArg(arg: string | undefined): ArgKind {
  if (arg === '-h' || arg === '--help') {
    return 'help';
  }
  if (arg === '-V' || arg === '--version') {
    return 'version';
  }
  if (arg !== undefined) {
    return 'unknown';
  }
  return 'run';
}

export const unknownArgMessage = (arg: string): string =>
  `pacer: unknown argument \`${arg}\`; try \`pacer --help\`\n`;
