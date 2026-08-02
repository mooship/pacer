import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const renderMock = vi.fn();
vi.mock('ink', () => ({ render: renderMock }));

const loadConfigMock = vi.fn(() => ({ config: {}, invalid: false }));
vi.mock('./config-store.js', () => ({ loadConfig: () => loadConfigMock() }));

const originalArgv = process.argv;
let exitSpy: ReturnType<typeof vi.spyOn>;
let stdoutSpy: ReturnType<typeof vi.spyOn>;
let stderrSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  renderMock.mockClear();
  loadConfigMock.mockClear();
  loadConfigMock.mockReturnValue({ config: {}, invalid: false });
  exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);
  stdoutSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
  stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
  vi.resetModules();
});

afterEach(() => {
  process.argv = originalArgv;
  vi.restoreAllMocks();
});

async function runCli(arg: string | undefined): Promise<void> {
  process.argv = [originalArgv[0], originalArgv[1], ...(arg === undefined ? [] : [arg])];
  await import('./cli.js');
}

describe('cli', () => {
  it('prints help and exits 0 for --help', async () => {
    await runCli('--help');
    expect(stdoutSpy).toHaveBeenCalledTimes(1);
    expect(stdoutSpy.mock.calls[0][0]).toContain('pacer — split a salary');
    expect(exitSpy).toHaveBeenCalledWith(0);
    expect(renderMock).not.toHaveBeenCalled();
  });

  it('prints help and exits 0 for -h', async () => {
    await runCli('-h');
    expect(exitSpy).toHaveBeenCalledWith(0);
  });

  it('prints the version and exits 0 for --version', async () => {
    await runCli('--version');
    expect(stdoutSpy.mock.calls[0][0]).toContain('pacer ');
    expect(exitSpy).toHaveBeenCalledWith(0);
    expect(renderMock).not.toHaveBeenCalled();
  });

  it('prints the version and exits 0 for -V', async () => {
    await runCli('-V');
    expect(exitSpy).toHaveBeenCalledWith(0);
  });

  it('prints an error and exits 2 for an unknown flag', async () => {
    await runCli('--bogus');
    expect(stderrSpy).toHaveBeenCalledTimes(1);
    expect(stderrSpy.mock.calls[0][0]).toContain('unknown argument `--bogus`');
    expect(exitSpy).toHaveBeenCalledWith(2);
    expect(renderMock).not.toHaveBeenCalled();
  });

  it('loads config and renders the app when given no arguments', async () => {
    await runCli(undefined);
    expect(loadConfigMock).toHaveBeenCalledTimes(1);
    expect(renderMock).toHaveBeenCalledTimes(1);
    expect(exitSpy).not.toHaveBeenCalled();
  });
});
