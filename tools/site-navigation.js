'use strict';
// Four stable destinations; section names do not change with a featured story.
module.exports=function navigation(active='') {
 const links=[['cities','/discover/','街から探す'],['works','/works.html','作品を探す'],['outings','/outings/','催しを探す'],['stories','/discover/essays/','街の記事']];
 return `<nav class="site-sections" aria-label="サイトの主な入口">${links.map(([id,url,label])=>`<a href="${url}"${id===active?' aria-current="location"':''}>${label}</a>`).join('')}</nav>`;
};
