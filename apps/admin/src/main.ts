import { createApp } from 'vue'
import dayjs from 'dayjs'
import 'dayjs/locale/vi'
import App from './App.vue'
import { createAdminRouter } from './router'
import './styles/main.css'

dayjs.locale('vi')

createApp(App).use(createAdminRouter()).mount('#app')
