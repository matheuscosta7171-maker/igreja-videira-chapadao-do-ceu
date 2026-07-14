(() => {
  if (window.VIDEIRA_BIBLE_MODE !== 'local') return;
  const section = document.getElementById('biblia');
  if (!section) return;

  const BASE = 'data/biblia/almeida-historica';
  const SITE = 'https://matheuscosta7171-maker.github.io/igreja-videira-chapadao-do-ceu/';
  const keys = {
    testament:'videiraBibleTestament',book:'videiraBibleBook',chapter:'videiraBibleChapter',font:'videiraBibleFontScale',favorites:'videiraBibleFavorites',readingPlan:'videiraBibleNt31Progress'
  };
  const dailyReferences = [['JHN',3,16],['PSA',23,1],['PHP',4,13],['PRO',3,5],['ROM',8,28],['ISA',41,10],['MAT',11,28],['JOS',1,9],['PSA',46,1],['JER',29,11]];
  const readingPlan = [
    {label:'Mateus 1–9',start:['MAT',1]},
    {label:'Mateus 10–18',start:['MAT',10]},
    {label:'Mateus 19–27',start:['MAT',19]},
    {label:'Mateus 28 e Marcos 1–8',start:['MAT',28]},
    {label:'Marcos 9–16 e Lucas 1',start:['MRK',9]},
    {label:'Lucas 2–10',start:['LUK',2]},
    {label:'Lucas 11–19',start:['LUK',11]},
    {label:'Lucas 20–24 e João 1–4',start:['LUK',20]},
    {label:'João 5–13',start:['JHN',5]},
    {label:'João 14–21 e Atos 1',start:['JHN',14]},
    {label:'Atos 2–10',start:['ACT',2]},
    {label:'Atos 11–19',start:['ACT',11]},
    {label:'Atos 20–27',start:['ACT',20]},
    {label:'Atos 28 e Romanos 1–7',start:['ACT',28]},
    {label:'Romanos 8–15',start:['ROM',8]},
    {label:'Romanos 16 e 1 Coríntios 1–7',start:['ROM',16]},
    {label:'1 Coríntios 8–15',start:['1CO',8]},
    {label:'1 Coríntios 16 e 2 Coríntios 1–7',start:['1CO',16]},
    {label:'2 Coríntios 8–13 e Gálatas 1–2',start:['2CO',8]},
    {label:'Gálatas 3–6 e Efésios 1–4',start:['GAL',3]},
    {label:'Efésios 5–6, Filipenses 1–4 e Colossenses 1–2',start:['EPH',5]},
    {label:'Colossenses 3–4, 1 Tessalonicenses 1–5 e 2 Tessalonicenses 1',start:['COL',3]},
    {label:'2 Tessalonicenses 2–3 e 1 Timóteo 1–6',start:['2TH',2]},
    {label:'2 Timóteo 1–4, Tito 1–3 e Filemom',start:['2TI',1]},
    {label:'Hebreus 1–8',start:['HEB',1]},
    {label:'Hebreus 9–13 e Tiago 1–3',start:['HEB',9]},
    {label:'Tiago 4–5, 1 Pedro 1–5 e 2 Pedro 1',start:['JAS',4]},
    {label:'2 Pedro 2–3, 1 João 1–5 e 2 João',start:['2PE',2]},
    {label:'3 João, Judas e Apocalipse 1–6',start:['3JN',1]},
    {label:'Apocalipse 7–14',start:['REV',7]},
    {label:'Apocalipse 15–22',start:['REV',15]}
  ];
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
    sidebar:$('#bibleSidebar'),chapters:$('#bibleChapters'),title:$('#bibleReaderTitle'),pending:$('#biblePendingState'),chapter:$('#bibleLocalChapter'),content:$('#bibleLocalContent'),credits:$('#bibleLocalCredits'),nav:$('#bibleChapterNav'),previous:$('#previousChapter'),next:$('#nextChapter'),status:$('#bibleSearchStatus'),results:$('#bibleSearchResults'),favorites:$('#bibleFavoritesList'),reader:$('#bibleReader'),planDays:$('#readingPlanDays'),planProgress:$('#readingPlanProgress'),planProgressText:$('#readingPlanProgressText')
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

  function showReaderPrompt(title,text) {
    elements.pending.hidden = false;
    elements.pending.querySelector('h4').textContent = title;
    elements.pending.querySelector('p').textContent = text;
    elements.pending.querySelector('[data-bible-retry]')?.remove();
    elements.chapter.hidden = true;
    elements.nav.hidden = true;
  }

  function showBookSelection({scroll=false,updateHash=true}={}) {
    activeBook = null; activeBookData = null; highlightedVerse = null;
    elements.title.textContent = 'Escolha um livro e um capítulo';
    elements.chapters.replaceChildren(); elements.content.replaceChildren(); elements.credits.replaceChildren();
    section.querySelectorAll('[data-book]').forEach(button=>{button.classList.remove('active');button.removeAttribute('aria-current')});
    showReaderPrompt('Selecione um livro','Escolha um livro na lista e, em seguida, selecione o capítulo que deseja ler.');
    elements.sidebar.classList.add('books-open'); $('#bibleBooksToggle').setAttribute('aria-expanded','true');
    if(updateHash)history.replaceState(null,'','#biblia');
    if(scroll)elements.sidebar.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'nearest'});
  }

  function selectBook(bookId,{scroll=true}={}) {
    const book=books.find(item=>item.id===bookId);if(!book)return;
    activeBook=book;activeBookData=null;activeChapter=1;highlightedVerse=null;
    updateTestament(folderTestament(book));localStorage.setItem(keys.book,book.id);
    section.querySelectorAll('[data-book]').forEach(button=>{const active=button.dataset.book===book.id;button.classList.toggle('active',active);button.setAttribute('aria-current',active?'true':'false')});
    elements.title.textContent=book.nome;renderChapters(book);
    showReaderPrompt('Agora escolha um capítulo',`Selecione um capítulo de ${book.nome} para abrir os versículos.`);
    elements.sidebar.classList.remove('books-open');$('#bibleBooksToggle').setAttribute('aria-expanded','false');
    history.replaceState(null,'','#biblia');
    if(scroll)elements.reader.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'});
  }

  function getPlanProgress(){const saved=safeJson(localStorage.getItem(keys.readingPlan));return new Set(Array.isArray(saved)?saved.filter(day=>Number.isInteger(day)&&day>=1&&day<=31):[])}
  function renderReadingPlan(){
    const completed=getPlanProgress();
    elements.planDays.innerHTML=readingPlan.map((day,index)=>{const number=index+1,done=completed.has(number);return`<article class="reading-plan-day${done?' completed':''}"><span>Dia ${String(number).padStart(2,'0')}</span><h4>${day.label}</h4><div><button type="button" data-plan-open="${number}">Ler agora</button><button type="button" data-plan-complete="${number}" aria-pressed="${done}">${done?'✓ Concluído':'Marcar concluído'}</button></div></article>`}).join('');
    elements.planProgress.value=completed.size;elements.planProgress.textContent=`${Math.round(completed.size/31*100)}%`;
    elements.planProgressText.textContent=`${completed.size} de 31 dias concluídos`;
  }

  function togglePlanDay(day){const completed=getPlanProgress();completed.has(day)?completed.delete(day):completed.add(day);localStorage.setItem(keys.readingPlan,JSON.stringify([...completed].sort((a,b)=>a-b)));renderReadingPlan()}

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
    const testament=event.target.closest('[data-testament]'); if(testament){updateTestament(testament.dataset.testament);showBookSelection({scroll:false});return;}
    const book=event.target.closest('[data-book]'); if(book){selectBook(book.dataset.book);return;}
    const chapter=event.target.closest('[data-chapter]'); if(chapter){await openPassage(activeBook.id,Number(chapter.dataset.chapter),null,{scroll:true});return;}
    if(event.target.closest('#previousChapter')){await moveChapter(-1);return;}
    if(event.target.closest('#nextChapter')){await moveChapter(1);return;}
    if(event.target.closest('#backToBooks')){showBookSelection({scroll:true});return;}
    if(event.target.closest('#bibleBooksToggle')){const open=elements.sidebar.classList.toggle('books-open');$('#bibleBooksToggle').setAttribute('aria-expanded',String(open));return;}
    const retry=event.target.closest('[data-bible-retry]');if(retry){await openPassage(activeBook?.id||'JHN',activeChapter||1,highlightedVerse);return;}
    const result=event.target.closest('[data-result-book]');if(result){await openPassage(result.dataset.resultBook,Number(result.dataset.resultChapter),Number(result.dataset.resultVerse),{scroll:true});return;}
    const planOpen=event.target.closest('[data-plan-open]');if(planOpen){const day=readingPlan[Number(planOpen.dataset.planOpen)-1];if(day)await openPassage(day.start[0],day.start[1],null,{scroll:true});return;}
    const planComplete=event.target.closest('[data-plan-complete]');if(planComplete){togglePlanDay(Number(planComplete.dataset.planComplete));return;}
    if(event.target.closest('#resetReadingPlan')){if(confirm('Reiniciar todo o progresso do plano de leitura?')){localStorage.removeItem(keys.readingPlan);renderReadingPlan()}return;}
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
    applyFont();renderFavorites();renderReadingPlan();setLoading('Preparando a Bíblia completa...');
    try{
      manifest=await fetchJson(`${BASE}/manifest.json`);books=manifest.livros;renderBookLists();
      const route=location.hash.match(/^#biblia\/([^/]+)\/(\d+)(?:\/(\d+))?$/);const routeBook=route?books.find(book=>book.id===route[1]):null;
      updateTestament(routeBook?folderTestament(routeBook):'new',false);
      if(route&&routeBook)await Promise.all([openPassage(route[1],Number(route[2]),route[3]?Number(route[3]):null,{updateHash:true}),renderDailyVerse()]);
      else{showBookSelection({updateHash:false});await renderDailyVerse()}
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
