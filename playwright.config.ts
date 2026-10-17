import {defineConfig,devices} from '@playwright/test';
export default defineConfig({testDir:'Tests',testMatch:'*.spec.ts',outputDir:'Test Results',workers:1,timeout:30000,
 use:{baseURL:process.env.TEST_BASE_URL||'http://127.0.0.1:4173/',browserName:'webkit',trace:'retain-on-failure'},
 projects:[{name:'Desktop WebKit',use:{viewport:{width:1440,height:1050}}},{name:'Mobile WebKit',use:{...devices['iPhone 13']}}],
 webServer:process.env.TEST_BASE_URL?undefined:{command:'npm run build && npm run preview',url:'http://127.0.0.1:4173/',reuseExistingServer:!process.env.CI},
});
