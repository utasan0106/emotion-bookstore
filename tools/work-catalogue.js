'use strict';
// Existing city identities remain authoritative. Proposals do not become public
// because their metadata or media passed a check. Adoption records require a real
// owner's editorial decision; builds, dates and successful QA cannot create one.
const citySource = require('./city-discovery-source');
const bookProposals = require('./editorial-proposals/books.json');
const shelfProposals = require('./editorial-proposals/shelves.json');
const HOST = 'https://emotionbookstore.com';
function reviewed(entry) {
  if (!['pending', 'approved', 'rejected'].includes(entry.editorialReview)) throw Error('Invalid editorial review: '+entry.id);
  if (entry.editorialReview !== 'approved') return false;
  const adoption=entry.adoption;
  if (!adoption || typeof adoption.reference !== 'string' || !adoption.reference.trim()
      || !/^\d{4}-\d{2}-\d{2}$/.test(adoption.confirmedOn || '')
      || !Number.isFinite(Date.parse(adoption.confirmedOn))
      || new Date(adoption.confirmedOn).toISOString().slice(0,10)!==adoption.confirmedOn) {
    throw Error('Approved proposal lacks explicit adoption record: '+entry.id);
  }
  return true;
}
function catalogue({cityItems=citySource.items, books=bookProposals, shelves=shelfProposals}={}) {
  const works=cityItems.map(item=>({...item,key:item.city+'/'+item.id,path:'/discover/'+item.city+'/'+item.id+'.html',origin:'city'}));
  const keys=new Set(works.map(w=>w.key)), paths=new Set(works.map(w=>w.path));
  const isbns=new Set();
  for (const book of books) {
    if (!/^books\/[a-z0-9-]+$/.test(book.id) || book.id!=='books/'+book.slug || book.path!=='/'+book.id+'.html' || book.kind!=='book') throw Error('Invalid independent book identity: '+book.id);
    if(!/^\d{13}$/.test(book.isbn)||!book.cover||book.cover.file!==book.isbn+'.jpg'||book.cover.path!=='/assets/editorial-books/'+book.isbn+'.jpg') throw Error('Invalid independent edition/asset path: '+book.id);
    if(isbns.has(book.isbn)) throw Error('Duplicate proposed ISBN: '+book.isbn);
    isbns.add(book.isbn);
    if(keys.has(book.id)||paths.has(book.path)) throw Error('Duplicate work identity: '+book.id);
    keys.add(book.id);paths.add(book.path);
    if(reviewed(book)) works.push({...book,key:book.id,id:book.slug,hook:book.fact,url:book.sourceUrl,origin:'editorial'});
  }
  const byId=new Map(works.map(w=>[w.key,w]));
  const publicShelves=[];
  for(const shelf of shelves) {
    if(!/^shelves\/[a-z0-9-]+$/.test(shelf.id)||shelf.id!=='shelves/'+shelf.slug||shelf.path!=='/'+shelf.id+'.html'||paths.has(shelf.path)) throw Error('Invalid shelf identity: '+shelf.id);
    paths.add(shelf.path);
    if(!reviewed(shelf)) continue;
    if(shelf.works.length!==3||new Set(shelf.works.map(w=>w.id)).size!==3) throw Error('Shelf must contain three distinct works: '+shelf.id);
    for(const entry of shelf.works) {
      if(!byId.has(entry.id)) throw Error('Approved shelf references unpublished work: '+entry.id);
      if(entry.next && !shelf.works.some(w=>w.id===entry.next.id)) throw Error('Shelf bridge must resolve within this shelf: '+shelf.id);
    }
    publicShelves.push(shelf);
  }
  return {works,byId,shelves:publicShelves,books:works.filter(w=>w.origin==='editorial'),
    managedPaths:[...books,...shelves].map(x=>x.path),
    publishablePaths:new Set([...works.filter(w=>w.origin==='editorial'),...publicShelves].map(x=>x.path))};
}
module.exports={catalogue,reviewed,HOST,bookProposals,shelfProposals};
