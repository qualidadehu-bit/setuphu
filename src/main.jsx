import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '@/App.jsx'
import '@/index.css'
import { apiClient } from '@/api/apiClient'
import { registerServiceWorker } from '@/lib/push-notifications'

if ('serviceWorker' in navigator) {
  registerServiceWorker();
}
void apiClient.offline.init();

const rootElement = document.getElementById('root')

if (rootElement) {
  const appNode = /** @type {import('react').ReactNode} */ (
    /** @type {unknown} */ (<App />)
  )
  ReactDOM.createRoot(rootElement).render(appNode)
}