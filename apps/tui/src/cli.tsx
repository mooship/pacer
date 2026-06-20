import { render } from 'ink';
import { App } from './app.js';
import { loadConfig } from './config-store.js';

const VERSION = '0.1.0';

const HELP = `pacer — split a salary into a bridge payment plus recurring allowances

Usage:
  pacer            launch the interactive TUI
  pacer --help     show this help and exit
  pacer --version  show the version and exit

In the TUI:
  Pay date   YYYY-MM-DD, blank or \`today\`
  Last day   YYYY-MM-DD or a relative offset like +30
  Amount     Rand, optional cents: 5000, R5,000, 5000.50

Keys:
  Enter confirm   Esc back   ←/→ move cursor   F2 settings   Ctrl+C quit
  Results: ↑/↓ move money into the bridge   PgUp/PgDn ×10   Home/End min/max
           s save csv   q quit

Set NO_COLOR to disable colored output.
`;

const arg = process.argv[2];
if (arg === '-h' || arg === '--help') {
  process.stdout.write(HELP);
  process.exit(0);
}
if (arg === '-V' || arg === '--version') {
  process.stdout.write(`pacer ${VERSION}\n`);
  process.exit(0);
}
if (arg !== undefined) {
  process.stderr.write(`pacer: unknown argument \`${arg}\`; try \`pacer --help\`\n`);
  process.exit(2);
}

const { config, invalid } = loadConfig();
render(<App config={config} invalidConfig={invalid} />);
