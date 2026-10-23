'use strict';
// Source-identical C3 contrast/image checks, with the deep-page cover container selector.
function measureContrast() {
  const rows = [];
  // Resolve only simple absolute decorations in their own positioned ancestor.
  // Any unmodelled geometry remains unsupported, never silently passed.
  function pseudoBounds(p, ps) {
    const owner=getComputedStyle(p);
    const px=v=>/^[-\d.]+px$/.test(v)?parseFloat(v):null;
    if(ps.position!=='absolute'||owner.position==='static'||owner.transform!=='none'||(owner.zoom&&Number(owner.zoom)!==1)||ps.transform!=='none'||ps.boxShadow!=='none'||ps.filter!=='none'||ps.writingMode!=='horizontal-tb') return null;
    for(let a=p.parentElement;a;a=a.parentElement) if(getComputedStyle(a).transform!=='none'||(getComputedStyle(a).zoom&&Number(getComputedStyle(a).zoom)!==1)) return null;
    if(['marginLeft','marginRight','marginTop','marginBottom'].some(k=>px(ps[k])!==0)) return null;
    const w=px(ps.width),h=px(ps.height);
    if(w===null||h===null) return null;
    const extras=keys=>keys.reduce((n,k)=>n+(px(ps[k])??NaN),0);
    const width=w+(ps.boxSizing==='border-box'?0:extras(['paddingLeft','paddingRight','borderLeftWidth','borderRightWidth']));
    const height=h+(ps.boxSizing==='border-box'?0:extras(['paddingTop','paddingBottom','borderTopWidth','borderBottomWidth']));
    const r=p.getBoundingClientRect(),left=px(ps.left),right=px(ps.right),top=px(ps.top),bottom=px(ps.bottom);
    if(!Number.isFinite(width)||!Number.isFinite(height)||(left===null&&right===null)||(top===null&&bottom===null)) return null;
    const x=r.left+p.clientLeft-p.scrollLeft+(left===null?p.clientWidth-right-width:left);
    const y=r.top+p.clientTop-p.scrollTop+(top===null?p.clientHeight-bottom-height:top);
    return {left:x,top:y,right:x+width,bottom:y+height};
  }
  const intersects=(a,b)=>a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top;
  const media=[...document.querySelectorAll('img,video,canvas,svg')].map(el=>({el,rect:el.getBoundingClientRect()}));
  const rgba = value => {
    const m = value.match(/^rgba?\(([^)]+)\)$/);
    if (!m) return null;
    const n = m[1].split(/[\s,/]+/).filter(Boolean).map(Number);
    return n.length >= 3 ? [n[0], n[1], n[2], n.length > 3 ? n[3] : 1] : null;
  };
  const over = (a, b) => [0,1,2].map(i => a[i] * a[3] + b[i] * (1-a[3])).concat(1);
  const luminance = c => c.slice(0,3).map(v => {v /= 255; return v <= .04045 ? v/12.92 : ((v+.055)/1.055)**2.4;}).reduce((s,v,i) => s+v*[.2126,.7152,.0722][i],0);
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let node; (node = walker.nextNode());) {
    if (!node.textContent.trim()) continue;
    const el = node.parentElement;
    if (!el || ['SCRIPT','STYLE','NOSCRIPT'].includes(el.tagName)) continue;
    const style = getComputedStyle(el), range = document.createRange();
    range.selectNodeContents(node);
    const rects = [...range.getClientRects()].filter(r => r.width && r.height);
    if (!rects.length || style.visibility !== 'visible' || !el.checkVisibility({checkOpacity:true,checkVisibilityCSS:true})) continue;
    const row = {text:node.textContent.trim().slice(0,180),tag:el.tagName.toLowerCase(),className:el.className,
      color:style.color,fontSize:parseFloat(style.fontSize),fontWeight:style.fontWeight};
    const unsupported = [], backgrounds = [];
    let opaque = false, opaqueElement = null;
    for (let p=el; p; p=p.parentElement) {
      const s=getComputedStyle(p);
      if (parseFloat(s.opacity) !== 1) unsupported.push('ancestor opacity: '+s.opacity);
      if (s.filter !== 'none' || s.backdropFilter !== 'none' || s.mixBlendMode !== 'normal') unsupported.push('filter/backdrop/blending');
      if (!opaque) {
        if (s.backgroundImage !== 'none') unsupported.push('gradient/image background: '+s.backgroundImage);
        const c=rgba(s.backgroundColor);
        if (!c) unsupported.push('unsupported background color: '+s.backgroundColor);
        else {backgrounds.push(c); if (c[3] === 1) {opaque=true;opaqueElement=p;}}
      }
      for (const pseudo of ['::before','::after']) {
        const ps=getComputedStyle(p,pseudo);
        if (ps.content !== 'none' && ps.content !== 'normal' && ps.display !== 'none' && (ps.backgroundImage !== 'none' || (rgba(ps.backgroundColor)||[0,0,0,0])[3]>0)) {
          const bounds=pseudoBounds(p,ps);
          if(!bounds||rects.some(r=>intersects(r,bounds))) unsupported.push('painted pseudo-element: '+pseudo+(bounds?' overlaps text':' geometry unmodelled'));
        }
      }
    }
    // Text laid over a sibling photo/video cannot be proven from ancestor colors.
    for (const r of rects) {
      const x=r.left+r.width/2, y=r.top+r.height/2;
      if (media.some(({el:p,rect:m})=>m.width&&m.height&&x>=m.left&&x<=m.right&&y>=m.top&&y<=m.bottom&&!el.contains(p)&&(!opaqueElement||opaqueElement.contains(p)))) unsupported.push('potential overlapping image/video/canvas/SVG; manual paint-order review');
    }
    const fg=rgba(style.color);
    if (!fg) unsupported.push('unsupported foreground color');
    if (style.webkitTextFillColor && style.webkitTextFillColor !== style.color) unsupported.push('text fill differs from color');
    if (unsupported.length) {rows.push({...row,status:'unsupported',review:'manual-review-needed',reasons:[...new Set(unsupported)]});continue;}
    let bg=[255,255,255,1];
    for (const c of backgrounds.reverse()) bg=over(c,bg);
    const actual=over(fg,bg), l1=luminance(actual),l2=luminance(bg);
    const ratio=(Math.max(l1,l2)+.05)/(Math.min(l1,l2)+.05);
    const large=row.fontSize>=24 || (row.fontSize>=18.6666667 && parseInt(style.fontWeight,10)>=700);
    const required=large?3:4.5;
    rows.push({...row,background:bg.slice(0,3),effectiveForeground:actual.slice(0,3),ratio,required,status:ratio>=required?'pass':'fail'});
  }
  return {passed:rows.length>0 && rows.every(x=>x.status==='pass'),checked:rows.length,rows};
}

const measureImages=async()=>{
          const rows=[];
          // Finish lazy image layout before capturing adjacent text rectangles.
          for(const img of document.images) img.loading='eager';
          const decodeErrors=new Map();
          await Promise.all([...document.images].map(async img=>{
            try {await Promise.race([img.decode(),new Promise((_,reject)=>setTimeout(()=>reject(new Error('Image decode timeout')),15000))]);}
            catch(e) {decodeErrors.set(img,e.message);}
          }));
          // Range rectangles cover text glyph runs, not broad parent boxes. This
          // permits contain letterboxing while catching cover intrusion into text.
          const textRects=[];
          const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);
          for(let node;(node=walker.nextNode());) {
            const el=node.parentElement;
            if(!node.textContent.trim()||!el||['SCRIPT','STYLE','NOSCRIPT'].includes(el.tagName)||!el.checkVisibility({checkOpacity:true,checkVisibilityCSS:true})) continue;
            const range=document.createRange();range.selectNodeContents(node);
            for(const r of range.getClientRects()) if(r.width&&r.height) textRects.push({el,text:node.textContent.trim().slice(0,100),left:r.left,top:r.top,right:r.right,bottom:r.bottom});
          }
          for(const img of document.images) {
            const error=decodeErrors.get(img)||null;
            const box=img.getBoundingClientRect(),style=getComputedStyle(img);
            const px=k=>parseFloat(style[k])||0;
            const insetX=px('paddingLeft')+px('paddingRight')+px('borderLeftWidth')+px('borderRightWidth');
            const insetY=px('paddingTop')+px('paddingBottom')+px('borderTopWidth')+px('borderBottomWidth');
            const contentWidth=box.width-insetX,contentHeight=box.height-insetY;
            const naturalRatio=img.naturalWidth/img.naturalHeight;
            const actualRatio=contentWidth/contentHeight;
            const isBookCover=img.matches('.work-art img,.book-mat img,[data-full-cover]')||/\/book-covers\//.test(img.currentSrc||img.src);
            const declared=style.aspectRatio.match(/^([\d.]+)\s*\/\s*([\d.]+)$/);
            const expectedRatio=declared?Number(declared[1])/Number(declared[2]):null;
            const declaredBoxRatio=style.boxSizing==='border-box'?box.width/box.height:actualRatio;
            const declaredRatioPassed=expectedRatio===null||(Number.isFinite(declaredBoxRatio)&&Math.abs(declaredBoxRatio/expectedRatio-1)<=0.02);
            const fit=style.objectFit;
            const sx=contentWidth/img.naturalWidth,sy=contentHeight/img.naturalHeight;
            let paintedWidth=contentWidth,paintedHeight=contentHeight;
            if(['contain','cover','none','scale-down'].includes(fit)) {
              const scale=fit==='none'?1:fit==='cover'?Math.max(sx,sy):fit==='scale-down'?Math.min(1,sx,sy):Math.min(sx,sy);
              paintedWidth=img.naturalWidth*scale;paintedHeight=img.naturalHeight*scale;
            }
            const paintedRatio=paintedWidth/paintedHeight;
            const stretched=!Number.isFinite(paintedRatio)||Math.abs(paintedRatio/naturalRatio-1)>0.02;
            const objectCropped=paintedWidth>contentWidth+1||paintedHeight>contentHeight+1;
            const coverIssues=[];
            let workArtBounds=null, overlappingText=[];
            // Use percentage positioning to locate the actual painted object, not
            // letterboxing. Unsupported positioning/transforms never prove a cover safe.
            const position=style.objectPosition.match(/^(-?[\d.]+)%\s+(-?[\d.]+)%$/);
            let paintedBounds=null;
            if(position) {
              const left=box.left+px('borderLeftWidth')+px('paddingLeft')+(contentWidth-paintedWidth)*Number(position[1])/100;
              const top=box.top+px('borderTopWidth')+px('paddingTop')+(contentHeight-paintedHeight)*Number(position[2])/100;
              paintedBounds={left,top,right:left+paintedWidth,bottom:top+paintedHeight};
            } else if(isBookCover) coverIssues.push('unsupported object-position geometry');
            if(isBookCover) {
              const workArt=img.closest('.cover');
              if(!workArt) coverIssues.push('book cover missing required .cover container');
              if(workArt&&paintedBounds) {
                const r=workArt.getBoundingClientRect();
                // Require containment regardless of overflow:visible. Use the
                // inner border edge (padding box), not the image element box.
                workArtBounds={left:r.left+workArt.clientLeft,top:r.top+workArt.clientTop,
                  right:r.left+workArt.clientLeft+workArt.clientWidth,bottom:r.top+workArt.clientTop+workArt.clientHeight};
                if(paintedBounds.left<workArtBounds.left-1||paintedBounds.right>workArtBounds.right+1||paintedBounds.top<workArtBounds.top-1||paintedBounds.bottom>workArtBounds.bottom+1) coverIssues.push('painted book cover escapes .cover bounds (including visible overflow)');
              }
              if(paintedBounds) {
                overlappingText=textRects.filter(r=>paintedBounds.left<r.right&&paintedBounds.right>r.left&&paintedBounds.top<r.bottom&&paintedBounds.bottom>r.top)
                  .map(({text,left,top,right,bottom})=>({text,left,top,right,bottom}));
                if(overlappingText.length) coverIssues.push('painted book cover overlaps text glyph-run rectangles');
              }
              if(fit==='cover') coverIssues.push('book cover uses cover fit; require contain or uncropped natural proportions');
              if(stretched) coverIssues.push('book cover stretched');
              if(objectCropped) coverIssues.push('book cover cropped by object-fit');
              for(let ancestor=img;ancestor;ancestor=ancestor.parentElement) {
                const s=getComputedStyle(ancestor);
                if(s.transform!=='none'||s.clipPath!=='none'||s.maskImage!=='none'||s.clip!=='auto'||(s.zoom&&Number(s.zoom)!==1)) coverIssues.push('unsupported transformed/masked/clipped cover geometry');
                if(ancestor===img||!paintedBounds) continue;
                const r=ancestor.getBoundingClientRect(),left=r.left+ancestor.clientLeft,top=r.top+ancestor.clientTop;
                if(['hidden','clip','scroll','auto'].includes(s.overflowX)&&(paintedBounds.left<left-1||paintedBounds.right>left+ancestor.clientWidth+1)) coverIssues.push('book cover clipped horizontally by ancestor');
                if(['hidden','clip','scroll','auto'].includes(s.overflowY)&&(paintedBounds.top<top-1||paintedBounds.bottom>top+ancestor.clientHeight+1)) coverIssues.push('book cover clipped vertically by ancestor');
              }
            }
            const ratioPassed=declaredRatioPassed&&!stretched&&(!isBookCover||coverIssues.length===0);
            rows.push({src:img.currentSrc||img.src,isBookCover,naturalWidth:img.naturalWidth,naturalHeight:img.naturalHeight,naturalRatio,
              renderedWidth:box.width,renderedHeight:box.height,contentWidth,contentHeight,
              paintedWidth,paintedHeight,paintedRatio,paintedBounds,workArtBounds,overlappingText,objectCropped,stretched,
              cssAspectRatio:style.aspectRatio,objectFit:fit,objectPosition:style.objectPosition,
              expectedRatio,actualRatio,declaredRatioPassed,coverIssues:[...new Set(coverIssues)],ratioPassed,error,
              passed:!error&&img.naturalWidth>0&&img.naturalHeight>0&&contentWidth>0&&contentHeight>0&&ratioPassed});
          }
          return {passed:rows.length>0&&rows.every(x=>x.passed),rows};
        };
module.exports={measureContrast,measureImages};
