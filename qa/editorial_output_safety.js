'use strict';
// The new editorial renderer is deliberately static: source links are allowed,
// but no script execution, form submission, remote media or CSS fetch is added.
function staticHtml(html) {
  let valid=true;
  const rest=html.replace(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi,(_match,attrs,body)=>{
    if(!/^\s+type=["']application\/ld\+json["']\s*$/i.test(attrs)) valid=false;
    try {JSON.parse(body);} catch {valid=false;}
    return '';
  });
  if(!valid||/<\/?(?:script|iframe|object|embed|form|style|foreignObject)\b/i.test(rest)
      ||/\s(?:on[a-z]+|style|srcdoc|http-equiv)\s*=/i.test(rest)
      ||/rel=["'][^"']*(?:preconnect|dns-prefetch)/i.test(rest)) return false;
  // Enforce the generator's small, quoted-attribute vocabulary rather than
  // pretending to sanitize arbitrary third-party HTML. Unknown tags fail closed.
  const tags=new Set('html head meta title link body a header div nav img main p h1 h2 h3 aside strong section article dl dt dd footer ul ol li br span small em'.split(' '));
  for(const [,name,raw] of rest.matchAll(/<([a-z][\w:-]*)([^>]*)>/gi)) {
    const tag=name.toLowerCase(),attrs={};let left=raw.replace(/\/$/,'');
    if(!tags.has(tag)) return false;
    while(left.trim()) {
      const match=left.match(/^\s+([\w:-]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'))?/);
      if(!match) return false;
      const key=match[1].toLowerCase();if(key in attrs)return false;
      attrs[key]=match[2]??match[3]??'';left=left.slice(match[0].length);
    }
    if(Object.keys(attrs).some(k=>/^on[a-z]/.test(k)||['style','srcdoc','srcset','poster','ping','http-equiv'].includes(k))) return false;
    const local=value=>value.startsWith('/')&&!value.startsWith('//')&&!/[\\&]/.test(value);
    if('src' in attrs&&(tag!=='img'||!local(attrs.src))) return false;
    if('href' in attrs&&(!/^(?:https:\/\/|\/(?!\/)|#)/.test(attrs.href)||attrs.href.includes('\\')||(attrs.href.startsWith('/')&&!local(attrs.href)))) return false;
    if(tag==='link'&&(!['stylesheet','canonical'].includes(attrs.rel)||!attrs.href||(attrs.rel==='stylesheet'&&!local(attrs.href)))) return false;
  }
  return true;
}
const staticStylesheet=css=>!css.includes('\\')&&!/@import|url\s*\(|expression\s*\(/i.test(css)&&!/(?:^|[;{])\s*behavior\s*:/i.test(css);
module.exports={staticHtml,staticStylesheet};
