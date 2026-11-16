import { sveltekit } from '@sveltejs/kit/vite';
import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';
import { defineConfig } from 'vitest/config';
export default defineConfig({plugins: [sveltekit({preprocess:vitePreprocess(),csp:{mode:'hash',directives:{'script-src':['self']}},adapter:adapter({fallback:'index.html'})})], test: {include: ['tests/**/*.test.ts'], testTimeout: 10000}});