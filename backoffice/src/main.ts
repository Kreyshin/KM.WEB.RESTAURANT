import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import { router } from './router'
import { useAuthStore } from './stores/auth.store'
import './assets/main.css'

const app = createApp(App)

app.use(createPinia())

// La sesión debe estar restaurada antes de que el router evalúe sus guardas.
useAuthStore().restaurar()

app.use(router)
app.mount('#app')
