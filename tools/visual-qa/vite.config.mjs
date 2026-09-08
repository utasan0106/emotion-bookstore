import weather from '../../api/tokyo-weather.js';
// Development-only adapter for the same handler deployed under /api on Vercel.
export default {
  appType:'mpa',
  server:{host:'0.0.0.0',allowedHosts:['terminal.local'],strictPort:true},
  optimizeDeps:{noDiscovery:true},
  plugins:[{name:'local-weather-api',transformIndexHtml(html,ctx){const q=new URL(ctx.originalUrl||ctx.path,'http://localhost').searchParams;return q.has('qa-atmosphere')?html.replace('<head>','<head><script src="/qa/atmosphere-fixture.js"></script>'):html;},configureServer(server){
    server.middlewares.use((req,res,next)=>{
      if(req.url?.split('?')[0]!=='/api/tokyo-weather')return next();
      weather(req,res).catch(()=>{res.statusCode=503;res.setHeader('Content-Type','application/json');res.end('{"forecast":null,"stations":{}}');});
    });
  }}]
};
