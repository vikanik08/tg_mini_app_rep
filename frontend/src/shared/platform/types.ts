export type RuntimePlatform = "telegram" | "vk" | "browser";

export type AuthPlatform = "dev" | "telegram" | "vk";

export type PlatformAuthContext =
  | {
      platform: "telegram";
      initData: string;
    }
  | {
      platform: "vk";
      launchParams: string;
    };
