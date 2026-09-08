// Development-only server. Production remains the existing static Vercel site.
export default {appType:'mpa',server:{host:'0.0.0.0',allowedHosts:['terminal.local'],strictPort:true},optimizeDeps:{noDiscovery:true}};
