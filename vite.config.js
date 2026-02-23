import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/iron-carbon-sim/', // <--- Add this line matching your repo name
})