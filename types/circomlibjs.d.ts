declare module "circomlibjs" {
  interface PoseidonFunction {
    (inputs: bigint[]): Uint8Array;
    F: {
      toString(value: Uint8Array, radix: number): string;
      toObject(value: Uint8Array): bigint;
    };
  }

  export function buildPoseidon(): Promise<PoseidonFunction>;
  export function buildPoseidonOpt(): Promise<PoseidonFunction>;
  export function buildMimc7(): Promise<unknown>;
  export function buildMimcSponge(): Promise<unknown>;
  export function buildBabyjub(): Promise<unknown>;
  export function buildEddsa(): Promise<unknown>;
}
