import { defineConfig } from 'vite'

export default defineConfig({
  server: {
    watch: {
      // WSL/Docker'da dosya olayları gelmeyebilir → polling aç
      usePolling: true,
      // İsteğe bağlı: polling interval ve ignored desenleri
      interval: 300,
    },
    open: true,
  },
})
