export class RwfitError extends Error {
  readonly code: number;
  readonly nativeCode?: string;

  constructor(code: number, message: string, nativeCode?: string) {
    super(message);
    this.name = 'RwfitError';
    this.code = code;
    this.nativeCode = nativeCode;
  }
}
