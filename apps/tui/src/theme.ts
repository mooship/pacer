export interface Theme {
  accent?: string;
  green?: string;
  yellow?: string;
  red?: string;
}

export function makeTheme(color: boolean): Theme {
  if (!color) {
    return {};
  }
  return { accent: 'cyan', green: 'green', yellow: 'yellow', red: 'red' };
}

export function colorEnabled(): boolean {
  const v = process.env.NO_COLOR;
  return v === undefined || v === '';
}
