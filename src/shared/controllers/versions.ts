import type { RPCSchema } from "electrobun";

export type VersionController = RPCSchema<{
  requests: {
    getVersionsPath: {
      params: undefined;
      response: string;
    };
    getInstalledVersions: {
      params: undefined;
      response: { version: string; size: number }[];
    };
    getAllVersions: {
      params: undefined;
      response: string[];
    };
    downloadVersion: {
      params: {
        version: string;
      };
      response: void;
    };
    cancelDownload: {
      params: {
        version: string;
      };
      response: void;
    };
    openVersionFolder: {
      params: {
        version: string;
      };
      response: void;
    };
    deleteVersion: {
      params: {
        version: string;
      };
      response: boolean;
    };
  };
}>;
