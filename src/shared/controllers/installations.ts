import type { RPCSchema } from "electrobun";

export type InstallationController = RPCSchema<{
  requests: {
    getInstallationsPath: {
      params: undefined;
      response: string;
    };
    getInstallations: {
      params: undefined;
      response: {
        path: string;
        name: string;
        size: number;
        version: string | null;
        startParams: string | null;
      }[];
    };
    openInstallationFolder: {
      params: {
        path: string;
      };
      response: void;
    };
    deleteInstallation: {
      params: {
        path: string;
      };
      response: boolean;
    };
    playWithInstallation: {
      params: {
        path: string;
      };
      response: void;
    };
  };
}>;
