import { defineConfig } from 'vite';

export default defineConfig({
  // 静的ホスティングのサブパスに置かれても動くよう相対パスで出力する
  base: './',
  build: {
    // Phaser本体だけで約1.3MBあり、分割しても初回に全部必要なので警告の閾値を上げる
    chunkSizeWarningLimit: 1600,
  },
});
