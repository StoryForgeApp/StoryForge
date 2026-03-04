import { RPCSchema } from "electrobun";

export type InferRPCSchema<T> = RPCSchema<{
  requests: {
    [K in keyof T]: T[K] extends (...args: infer P) => infer R
      ? {
          params: P extends readonly []
            ? undefined
            : P extends readonly [infer Single]
              ? Single
              : P; // keep as tuple for multi-param functions
          response: Awaited<R> | undefined;
        }
      : never;
  };
}>;

export type DeepMerge<T, U> =
  T extends Array<infer TItem>
    ? U extends Array<infer UItem>
      ? Array<DeepMerge<TItem, UItem>>
      : U
    : T extends object
      ? U extends object
        ? {
            [K in keyof T | keyof U]: K extends keyof U
              ? K extends keyof T
                ? DeepMerge<T[K], U[K]>
                : U[K]
              : T[Extract<K, keyof T>];
          }
        : U
      : U;

export type DeepMergeAll<T extends readonly any[]> = T extends readonly [infer First, ...infer Rest]
  ? Rest extends readonly [any, ...any[]]
    ? DeepMerge<First, DeepMergeAll<Rest>>
    : First
  : {}; // Returns {} for empty tuples
