interface TelegramWebApp {
  ready: () => void;
  expand: () => void;
  initData: string;
  initDataUnsafe?: {
    start_param?: string;
  };
  platform?: string;
  version?: string;
  openTelegramLink?: (url: string) => void;
}

interface TelegramGlobal {
  WebApp: TelegramWebApp;
}

interface Window {
  Telegram?: TelegramGlobal;
}
