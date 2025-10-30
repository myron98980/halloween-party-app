import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      // Aquí empieza la configuración importante para tu APK
      manifest: {
        name: 'Tickets Halloween', // El nombre completo de tu app
        short_name: 'Tickets', // Un nombre corto para la pantalla de inicio
        description: 'Registro de tickets para control',
        theme_color: '#ffffff', // El color de la barra de herramientas de la app
        // AQUÍ DEFINES LOS ÍCONOS
        icons: [
          {
            src: 'calabaza.png', // Nombre del archivo de tu ícono
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'calabaza.png', // Un ícono más grande para otras pantallas
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      }
    })
  ],
})