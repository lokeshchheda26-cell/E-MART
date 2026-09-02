import { defineConfig } from 'vite'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'

// https://vite.dev/config/
export default defineConfig({
    plugins: [
        react(),
        babel({ presets: [reactCompilerPreset()] })
    ],
    server: {
        port: 5173,
        proxy: {
            '/api': {
                target: 'http://localhost:8080',
                changeOrigin: true,
            },
            // NOTE: deliberately no '/oauth2' proxy rule here. The Google
            // sign-in button already navigates to an absolute backend URL
            // (http://localhost:8080/oauth2/authorization/google - see
            // getGoogleLoginUrl() in src/api/userApi.js), so it never hits
            // this dev server. A blanket '/oauth2' proxy rule used to also
            // wrongly catch '/oauth2/redirect' - the frontend's OWN
            // React Router page (OAuth2Redirect.jsx) that reads the token
            // off the URL after Google's redirect - and forward it to the
            // backend instead, which has no matching resource there and
            // returned a 500 "No static resource oauth2/redirect" error.
        },
    },
})
