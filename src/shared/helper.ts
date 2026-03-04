import { RPCSchema } from "electrobun";

export type InferRPCSchema<T> = RPCSchema<{
  requests: {
    [K in keyof T]: T[K] extends (...args: any[]) => Promise<infer R>
      ? {
          params: Parameters<T[K]> extends readonly []
            ? undefined
            : Parameters<T[K]> extends readonly [infer Single]
              ? Single
              : Parameters<T[K]>;
          response: R | undefined;
        }
      : never;
  };
}>;
