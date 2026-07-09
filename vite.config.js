import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'
import { resolve } from 'path'

export default defineConfig({
  plugins: [tailwindcss()],
  build: {
    rollupOptions: {
      input: {
        main:           resolve(__dirname, 'index.html'),
        dm:             resolve(__dirname, 'pages/dm.html'),
        threads:        resolve(__dirname, 'pages/threads.html'),
        calls:          resolve(__dirname, 'pages/calls.html'),
        notifications:  resolve(__dirname, 'pages/notifications.html'),
        profile:        resolve(__dirname, 'pages/profile.html'),
        settings:       resolve(__dirname, 'pages/settings.html'),
        files:          resolve(__dirname, 'pages/files.html'),
        'media-gallery':resolve(__dirname, 'pages/media-gallery.html'),
        'team-dir':     resolve(__dirname, 'pages/team-directory.html'),
        bookmarks:      resolve(__dirname, 'pages/bookmarks.html'),
        activity:       resolve(__dirname, 'pages/activity-feed.html'),
        welcome:        resolve(__dirname, 'pages/welcome.html'),
        invite:         resolve(__dirname, 'pages/invite.html'),
        shortcuts:      resolve(__dirname, 'pages/shortcuts.html'),
        '404':          resolve(__dirname, 'pages/404.html'),
        maintenance:    resolve(__dirname, 'pages/maintenance.html'),
        status:         resolve(__dirname, 'pages/status.html'),
        billing:        resolve(__dirname, 'pages/billing.html'),
      }
    }
  },
  server: {
    host: '0.0.0.0',
    port: 5000,
    allowedHosts: true,
  },
})
