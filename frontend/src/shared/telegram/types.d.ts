interface TelegramWebApp {
  ready: () => void;
  expand: () => void;
  initData: string;
  platform?: string;
  version?: string;
}

interface TelegramGlobal {
  WebApp: TelegramWebApp;
}

interface Window {
  Telegram?: TelegramGlobal;
}
