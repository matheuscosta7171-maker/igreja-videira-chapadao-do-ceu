(() => {
  if (window.VIDEIRA_BIBLE_MODE !== 'local') return;
  const section = document.getElementById('biblia');
  if (!section) return;

  const BASE = 'data/biblia/almeida-historica';
  const SITE = 'https://matheuscosta7171-maker.github.io/igreja-videira-chapadao-do-ceu/';
  const keys = {
    testament:'videiraBibleTestament',book:'videiraBibleBook',chapter:'videiraBibleChapter',font:'videiraBibleFontScale',favorites:'videiraBibleFavorites'
  };
  const dailyReferences = [['JHN',3,16],['PSA',23,1],['PHP',4,13],['PRO',3,5],['ROM',8,28],['ISA',41,10],['MAT',11,28],['JOS',1,9],['PSA',46,1],['JER',29,11]];
  const cache = new Map();
  let manifest = null;
  let books = [];
  let activeBook = null;
  let activeBookData = null;
  let activeChapter = 1;
  let activeTestament = 'new';
  let highlightedVerse = null;
  let searchIndex = null;
  let fontScale = Number(localStorage.getItem(keys.font)) || 1;
  let initialized = false;

  const $ = selector => section.querySelector(selector);
  const elements = {
    sidebar:$('#bibleSidebar'),chapters:$('#bibleChapters'),title:$('#bibleReaderTitle'),pending:$('#biblePendingState'),chapter:$('#bibleLocalChapter'),content:$('#bibleLocalContent'),credits:$('#bibleLocalCredits'),nav:$('#bibleChapterNav'),previous:$('#previousChapter'),next:$('#nextChapter'),status:$('#bibleSearchStatus'),results:$('#bibleSearchResults'),favorites:$('#bibleFavoritesList'),reader:$('#bibleReader')
  };

  const normalize = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
  const folderTestament = book => book.testamento === 'Antigo Testamento' ? 'old' : 'new';
  const safeJson = value => { try { return JSON.parse(value); } catch { return null; } };
  const getFavorites = () => (safeJson(localStorage.getItem(keys.favorites)) || []).map(item => ({
    ...item,
    id:item.id,
    livro:item.livro||item.book||'',capitulo:item.capitulo??item.chapter,versiculo:item.versiculo??item.verse,
    referencia:item.referencia||item.reference||'Referência salva',traducao:item.traducao||item.translation||'Almeida Histórica'
  }));
  const saveFavorites = items => localStorage.setItem(keys.favorites,JSON.stringify(items));

  async function fetchJson(url) {
    if (cache.has(url)) return cache.get(url);
    const response = await fetch(url,{headers:{Accept:'application/json'}});
    if (!response.ok) throw new Error(`Falha ${response.status} ao carregar ${url}`);
    const data = await response.json();
    cache.set(url,data);
    return data;
  }

  async function loadBook(book) {
    if (!book) throw new Error('Livro não encontrado.');
    return fetchJson(`${BASE}/${book.arquivo}`);
  }

  function setLoading(message='Carregando capítulo...') {
    elements.pending.hidden = false;
    elements.pending.querySelector('h4').textContent = message;
    elements.pending.querySelector('p').textContent = 'Aguarde um instante.';
    elements.chapter.hidden = true;
  }

  function setError(message='Não foi possível carregar os versículos agora. Tente novamente.') {
    elements.pending.hidden = false;
    elements.chapter.hidden = true;
    elements.pending.querySelector('h4').textContent = 'Não foi possível carregar';
    elements.pending.querySelector('p').textContent = message;
    let retry = elements.pending.querySelector('[data-bible-retry]');
    if (!retry) {
      retry = document.createElement('button'); retry.type='button'; retry.dataset.bibleRetry=''; retry.textContent='Tentar novamente';
      elements.pending.appendChild(retry);
    }
  }

  function updateTestament(testament, persist=true) {
    activeTestament = testament;
    section.querySelectorAll('[data-testament]').forEach(button => {
      const active = button.dataset.testament === testament;
      button.classList.toggle('active',active); button.setAttribute('aria-selected',String(active));
    });
    section.querySelectorAll('[data-testament-panel]').forEach(panel => panel.hidden = panel.dataset.testamentPanel !== testament);
    if (persist) localStorage.setItem(keys.testament,testament);
  }

  function renderBookLists() {
    const makeButtons = list => list.map(book => `<button type="button" data-book="${book.id}" aria-label="Selecionar ${book.nome}">${book.nome}</button>`).join('');
    $('#oldTestamentBooks').innerHTML = makeButtons(books.filter(book=>folderTestament(book)==='old'));
    $('#newTestamentBooks').innerHTML = makeButtons(books.filter(book=>folderTestament(book)==='new'));
  }

  function renderChapters(book) {
    elements.chapters.innerHTML = `<h4>Escolha o capítulo</h4><div>${Array.from({length:book.capitulos},(_,index)=>`<button type="button" data-chapter="${index+1}" aria-label="${book.nome}, capítulo ${index+1}">${index+1}</button>`).join('')}</div>`;
    elements.chapters.querySelector(`[data-chapter="${activeChapter}"]`)?.classList.add('active');
  }

  function verseLink(bookId,chapter,verse=null) {
    return `${SITE}#biblia/${bookId}/${chapter}${verse?`/${verse}`:''}`;
  }

  function renderVerseActions(book,chapter,verse) {
    const reference = `${book.nome} ${chapter}:${verse.versiculo}`;
    return `<div class="bible-verse-actions" aria-label="Ações de ${reference}">
      <button type="button" data-action="copy" aria-label="Copiar ${reference}">Copiar</button>
      <button type="button" data-action="whatsapp" aria-label="Compartilhar ${reference} no WhatsApp">WhatsApp</button>
      <button type="button" data-action="favorite" aria-label="Favoritar ${reference}">☆ Favoritar</button>
    </div>`;
  }

  function renderChapter() {
    const verses = activeBookData?.capitulos?.[String(activeChapter)] || [];
    elements.title.textContent = `${activeBook.nome} ${activeChapter}`;
    elements.content.replaceChildren();
    verses.forEach(verse => {
      const article = document.createElement('article');
      article.className = 'bible-api-verse';
      article.id = `verse-${verse.versiculo}`;
      article.dataset.verse = String(verse.versiculo);
      if (Number(highlightedVerse) === verse.versiculo) article.classList.add('highlighted');
      const number = document.createElement('sup'); number.textContent = String(verse.versiculo);
      const text = document.createElement('p'); text.textContent = verse.texto;
      const actions = document.createElement('div'); actions.innerHTML = renderVerseActions(activeBook,activeChapter,verse);
      article.append(number,text,actions.firstElementChild); elements.content.appendChild(article);
    });
    elements.credits.innerHTML = `<strong>Almeida Histórica</strong><p>Tradução de João Ferreira de Almeida.</p><p>Texto disponibilizado a partir de fonte em domínio público. Fonte: <a href="https://www.gutenberg.org/ebooks/62383" target="_blank" rel="noopener noreferrer">Project Gutenberg, eBook nº 62383</a>.</p>`;
    elements.pending.hidden = true; elements.chapter.hidden = false; elements.nav.hidden = false;
    const globalIndex = books.findIndex(book=>book.id===activeBook.id);
    elements.previous.disabled = globalIndex === 0 && activeChapter === 1;
    elements.next.disabled = globalIndex === books.length-1 && activeChapter === activeBook.capitulos;
    elements.chapters.querySelectorAll('[data-chapter]').forEach(button=>button.classList.toggle('active',Number(button.dataset.chapter)===activeChapter));
    if (highlightedVerse) requestAnimationFrame(()=>document.getElementById(`verse-${highlightedVerse}`)?.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'center'}));
  }

  async function openPassage(bookId,chapter=1,verse=null,{updateHash=true,scroll=false}={}) {
    const book = books.find(item=>item.id===bookId);
    if (!book || chapter < 1 || chapter > book.capitulos) return setError('Não foi possível encontrar este capítulo.');
    activeBook = book; activeChapter = Number(chapter); highlightedVerse = verse ? Number(verse) : null;
    activeTestament = folderTestament(book); updateTestament(activeTestament);
    localStorage.setItem(keys.book,book.id); localStorage.setItem(keys.chapter,String(activeChapter));
    section.querySelectorAll('[data-book]').forEach(button=>{
      const active=button.dataset.book===book.id; button.classList.toggle('active',active); button.setAttribute('aria-current',active?'true':'false');
    });
    renderChapters(book); setLoading();
    try {
      activeBookData = await loadBook(book); renderChapter();
      if (updateHash) history.replaceState(null,'',`#biblia/${book.id}/${activeChapter}${highlightedVerse?`/${highlightedVerse}`:''}`);
      elements.sidebar.classList.remove('books-open'); $('#bibleBooksToggle').setAttribute('aria-expanded','false');
      if (scroll) section.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});
    } catch (error) { console.error(error); setError(); }
  }

  async function moveChapter(direction) {
    const index = books.findIndex(book=>book.id===activeBook.id);
    let targetBook = activeBook; let targetChapter = activeChapter + direction;
    if (targetChapter < 1 && index > 0) { targetBook=books[index-1]; targetChapter=targetBook.capitulos; }
    if (targetChapter > activeBook.capitulos && index < books.length-1) { targetBook=books[index+1]; targetChapter=1; }
    await openPassage(targetBook.id,targetChapter,null,{scroll:true});
  }

  function parseReference(query) {
    const match = query.trim().match(/^(.+?)\s+(\d+)(?::(\d+))?$/);
    if (!match) return null;
    const name = normalize(match[1]);
    const aliases = {salmo:'PSA',salmos:'PSA',joao:'JHN',genesis:'GEN',apocalipse:'REV',atos:'ACT'};
    const book = books.find(item=>normalize(item.nome)===name||normalize(item.abreviacao)===name||item.id.toLowerCase()===name) || books.find(item=>item.id===aliases[name]);
    const chapter=Number(match[2]),verse=match[3]?Number(match[3]):null;
    if (!book || chapter<1 || chapter>book.capitulos) return null;
    return {book,chapter,verse};
  }

  async function searchWords(query) {
    elements.status.textContent='Preparando a pesquisa local...'; elements.results.hidden=true;
    searchIndex ||= await fetchJson(`${BASE}/search-index.json`);
    const term=normalize(query);
    const found=searchIndex.entradas.filter(entry=>entry[3].includes(term)).slice(0,50);
    elements.results.innerHTML=found.length?found.map(entry=>{
      const book=books.find(item=>item.id===entry[0]); const reference=`${book.nome} ${entry[1]}:${entry[2]}`;
      return `<button type="button" class="bible-search-result" data-result-book="${entry[0]}" data-result-chapter="${entry[1]}" data-result-verse="${entry[2]}"><strong>${reference}</strong><span>${entry[4]}</span></button>`;
    }).join(''):'<p>Nenhum resultado encontrado.</p>';
    elements.results.hidden=false; elements.status.textContent=`${found.length} resultado(s) para “${query}”${found.length===50?' — mostrando os primeiros 50':''}.`;
  }

  async function copyText(value) {
    try { await navigator.clipboard.writeText(value); elements.status.textContent='Copiado para a área de transferência.'; }
    catch { elements.status.textContent='Não foi possível copiar automaticamente.'; }
  }

  function favoriteItem(book,chapter,verse) {
    const reference=`${book.nome} ${chapter}:${verse}`;
    return {id:`AH-${book.id}-${chapter}-${verse}`,testamento:book.testamento,livro:book.id,capitulo:chapter,versiculo:verse,referencia:reference,traducao:'Almeida Histórica'};
  }

  function renderFavorites() {
    const favorites=getFavorites();
    elements.favorites.innerHTML=favorites.length?favorites.map(item=>`<article><div><strong>${item.referencia}</strong><small>${item.traducao}</small></div><div class="favorite-actions"><button type="button" data-favorite-open="${item.id}">Abrir</button><button type="button" data-favorite-copy="${item.id}">Copiar</button><button type="button" data-favorite-remove="${item.id}" aria-label="Remover ${item.referencia}">Remover</button></div></article>`).join(''):'<p class="bible-empty-favorites">Nenhum versículo favoritado ainda.</p>';
  }

  function toggleFavorite(book,chapter,verse) {
    const item=favoriteItem(book,chapter,verse); const favorites=getFavorites(); const index=favorites.findIndex(saved=>saved.id===item.id);
    if(index>=0)favorites.splice(index,1);else favorites.push(item);
    saveFavorites(favorites);renderFavorites();elements.status.textContent=index>=0?'Favorito removido.':'Versículo adicionado aos favoritos.';
  }

  async function renderDailyVerse() {
    const day=Math.floor(new Date().setHours(0,0,0,0)/86400000); const [bookId,chapter,verse]=dailyReferences[day%dailyReferences.length];
    const book=books.find(item=>item.id===bookId); const data=await loadBook(book); const item=data.capitulos[String(chapter)]?.find(entry=>entry.versiculo===verse);
    const reference=`${book.nome} ${chapter}:${verse}`; $('#dailyVerseReference').textContent=reference; $('#dailyVerseText').textContent=item?.texto||'';
    $('#dailyVerseActions').innerHTML=`<button type="button" data-daily="open">Abrir</button><button type="button" data-daily="copy">Copiar</button><button type="button" data-daily="whatsapp">WhatsApp</button><button type="button" data-daily="favorite">☆ Favoritar</button>`;
    $('#dailyVerseActions').dataset.book=bookId;$('#dailyVerseActions').dataset.chapter=chapter;$('#dailyVerseActions').dataset.verse=verse;$('#dailyVerseActions').dataset.text=item?.texto||'';
  }

  function applyFont() {
    fontScale=Math.min(1.4,Math.max(.85,fontScale));elements.reader.style.setProperty('--bible-font-scale',fontScale);localStorage.setItem(keys.font,String(fontScale));
  }

  section.addEventListener('click', async event => {
    const testament=event.target.closest('[data-testament]'); if(testament){updateTestament(testament.dataset.testament);return;}
    const book=event.target.closest('[data-book]'); if(book){await openPassage(book.dataset.book,1,null,{scroll:true});return;}
    const chapter=event.target.closest('[data-chapter]'); if(chapter){await openPassage(activeBook.id,Number(chapter.dataset.chapter),null,{scroll:true});return;}
    if(event.target.closest('#previousChapter')){await moveChapter(-1);return;}
    if(event.target.closest('#nextChapter')){await moveChapter(1);return;}
    if(event.target.closest('#backToBooks')){elements.sidebar.classList.add('books-open');$('#bibleBooksToggle').setAttribute('aria-expanded','true');elements.sidebar.scrollIntoView({block:'nearest'});return;}
    if(event.target.closest('#bibleBooksToggle')){const open=elements.sidebar.classList.toggle('books-open');$('#bibleBooksToggle').setAttribute('aria-expanded',String(open));return;}
    const retry=event.target.closest('[data-bible-retry]');if(retry){await openPassage(activeBook?.id||'JHN',activeChapter||1,highlightedVerse);return;}
    const result=event.target.closest('[data-result-book]');if(result){await openPassage(result.dataset.resultBook,Number(result.dataset.resultChapter),Number(result.dataset.resultVerse),{scroll:true});return;}
    const font=event.target.closest('[data-font]');if(font){if(font.dataset.font==='decrease')fontScale-=.1;if(font.dataset.font==='increase')fontScale+=.1;if(font.dataset.font==='reset')fontScale=1;applyFont();return;}
    const verseAction=event.target.closest('.bible-api-verse [data-action]');
    if(verseAction){const verseArticle=verseAction.closest('[data-verse]');const verse=Number(verseArticle.dataset.verse);const item=activeBookData.capitulos[String(activeChapter)].find(entry=>entry.versiculo===verse);const reference=`${activeBook.nome} ${activeChapter}:${verse}`;const share=`${item.texto}\n\n${reference} — Almeida Histórica\n${verseLink(activeBook.id,activeChapter,verse)}`;if(verseAction.dataset.action==='copy')await copyText(share);if(verseAction.dataset.action==='whatsapp')window.open(`https://wa.me/?text=${encodeURIComponent(share)}`,'_blank','noopener,noreferrer');if(verseAction.dataset.action==='favorite')toggleFavorite(activeBook,activeChapter,verse);return;}
    const favoriteOpen=event.target.closest('[data-favorite-open]');if(favoriteOpen){const item=getFavorites().find(saved=>saved.id===favoriteOpen.dataset.favoriteOpen);if(item)await openPassage(item.livro,item.capitulo,item.versiculo,{scroll:true});return;}
    const favoriteCopy=event.target.closest('[data-favorite-copy]');if(favoriteCopy){const item=getFavorites().find(saved=>saved.id===favoriteCopy.dataset.favoriteCopy);if(item)await copyText(`${item.referencia} — ${item.traducao}`);return;}
    const favoriteRemove=event.target.closest('[data-favorite-remove]');if(favoriteRemove){saveFavorites(getFavorites().filter(item=>item.id!==favoriteRemove.dataset.favoriteRemove));renderFavorites();return;}
    const daily=event.target.closest('[data-daily]');if(daily){const box=$('#dailyVerseActions'),book=books.find(item=>item.id===box.dataset.book),chapter=Number(box.dataset.chapter),verse=Number(box.dataset.verse),reference=`${book.nome} ${chapter}:${verse}`,share=`${box.dataset.text}\n\n${reference} — Almeida Histórica\n${verseLink(book.id,chapter,verse)}`;if(daily.dataset.daily==='open')await openPassage(book.id,chapter,verse,{scroll:true});if(daily.dataset.daily==='copy')await copyText(share);if(daily.dataset.daily==='whatsapp')window.open(`https://wa.me/?text=${encodeURIComponent(share)}`,'_blank','noopener,noreferrer');if(daily.dataset.daily==='favorite')toggleFavorite(book,chapter,verse);}
  });

  $('#bibleSearchForm').addEventListener('submit',async event=>{
    event.preventDefault();const query=$('#bibleSearch').value.trim();if(!query)return;
    const reference=parseReference(query);
    if(reference){elements.results.hidden=true;elements.status.textContent=`Abrindo ${reference.book.nome} ${reference.chapter}${reference.verse?`:${reference.verse}`:''}.`;await openPassage(reference.book.id,reference.chapter,reference.verse,{scroll:true});return;}
    try{await searchWords(query);}catch(error){console.error(error);elements.status.textContent='Não foi possível realizar a pesquisa agora. Tente novamente.';}
  });

  window.addEventListener('hashchange',()=>{
    if(!location.hash.startsWith('#biblia'))return;
    if(!initialized){ensureInitialized();return;}
    const match=location.hash.match(/^#biblia\/([^/]+)\/(\d+)(?:\/(\d+))?$/);if(match&&books.length)openPassage(match[1],Number(match[2]),match[3]?Number(match[3]):null,{updateHash:false});
  });

  async function initialize() {
    applyFont();renderFavorites();setLoading('Preparando a Bíblia completa...');
    try{
      manifest=await fetchJson(`${BASE}/manifest.json`);books=manifest.livros;renderBookLists();
      const route=location.hash.match(/^#biblia\/([^/]+)\/(\d+)(?:\/(\d+))?$/);
      const savedBook=localStorage.getItem(keys.book);const defaultBook=books.some(book=>book.id===savedBook)?savedBook:'JHN';
      const bookId=route?.[1]||defaultBook;const chapter=route?Number(route[2]):Number(localStorage.getItem(keys.chapter)||1);const verse=route?.[3]?Number(route[3]):null;
      updateTestament(route?folderTestament(books.find(book=>book.id===bookId)):localStorage.getItem(keys.testament)||folderTestament(books.find(book=>book.id===bookId)),false);
      await Promise.all([openPassage(bookId,chapter,verse,{updateHash:Boolean(route)}),renderDailyVerse()]);
    }catch(error){console.error(error);setError('Não foi possível preparar a Bíblia local. Verifique os arquivos do site e tente novamente.');}
  }
  function ensureInitialized(){
    if(initialized)return;
    initialized=true;
    initialize();
  }
  if(location.hash.startsWith('#biblia'))ensureInitialized();
  const observer=new IntersectionObserver(entries=>{if(entries.some(entry=>entry.isIntersecting)){ensureInitialized();observer.disconnect();}},{rootMargin:'180px'});
  observer.observe(section);
})();
