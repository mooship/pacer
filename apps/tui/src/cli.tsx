import { render } from 'ink';
import { App } from './app.js';
import { classifyArg, HELP, unknownArgMessage, VERSION } from './args.js';
import { loadConfig } from './config-store.js';

const arg = process.argv[2];

switch (classifyArg(arg)) {
  case 'help':
    process.stdout.write(HELP);
    process.exit(0);
    break;
  case 'version':
    process.stdout.write(`pacer ${VERSION}\n`);
    process.exit(0);
    break;
  case 'unknown':
    process.stderr.write(unknownArgMessage(arg ?? ''));
    process.exit(2);
    break;
  case 'run': {
    const { config, invalid } = loadConfig();
    render(<App config={config} invalidConfig={invalid} />);
    break;
  }
}
