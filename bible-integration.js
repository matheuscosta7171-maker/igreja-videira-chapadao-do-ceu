(() => {
  if(window.VIDEIRA_BIBLE_MODE==='local')return;
  const section=document.getElementById('biblia');
  if(!section)return;

  const translationSelect=document.getElementById('bibleTranslation');
  const translationStatus=document.getElementById('translationStatus');
  const searchForm=document.getElementById('bibleSearchForm');
  const searchInput=document.getElementById('bibleSearch');
  const searchStatus=document.getElementById('bibleSearchStatus');
  const pending=document.getElementById('biblePendingState');
  const readerTranslation=document.getElementById('bibleReaderTranslation');
  const previousButton=document.getElementById('previousChapter');
  const nextButton=document.getElementById('nextChapter');
  const translationKey='videiraBibleTranslation';
  const favoriteKey='videiraBibleFavorites';
  const cachePrefix='videira-bible-cache';
  const cacheTtl=5*60*1000;
  const requestTimeout=15000;
  const bibleApiUrl='https://lzytpdkqdiamlikvvcuu.supabase.co/functions/v1/bible-api';
  const defaultBibleId='d63894c8d9a7a503-01';
  const canonicalButtons=[...document.querySelectorAll('#biblia [data-book]')].filter(button=>button.closest('.bible-book-list'));
  const canonicalOrder=canonicalButtons.map(button=>button.dataset.book);
  const canonicalNames=new Map(canonicalButtons.map(button=>[button.dataset.book,button.textContent.trim()]));
  let activeProvider='';
  let availableBibles=[];
  let selectedBible=null;
  let apiBooks=[];
  let apiBookMap=new Map();
  let lastRequest=0;

  const integrationRoot=document.createElement('div');
  integrationRoot.className='bible-integration-root';
  integrationRoot.hidden=true;
  integrationRoot.innerHTML=`<div class="bible-loading" id="bibleLoadingState" hidden><span aria-hidden="true"></span><p>Carregando capítulo...</p></div><div class="bible-pending bible-api-error" id="bibleApiErrorState" hidden><span aria-hidden="true">▤</span><h4>Integração oficial pendente</h4><p></p></div><article class="bible-api-chapter" id="bibleApiChapter" hidden><div id="bibleApiContent" class="bible-api-content"></div><footer id="bibleApiCredits" class="bible-api-credits"></footer></article>`;
  pending.after(integrationRoot);
  const retryButton=document.createElement('button');
  retryButton.type='button';
  retryButton.id='bibleRetry';
  retryButton.className='bible-retry';
  retryButton.textContent='Tentar novamente';
  retryButton.hidden=true;
  const errorState=document.getElementById('bibleApiErrorState');
  errorState.appendChild(retryButton);
  const results=document.createElement('div');
  results.id='bibleSearchResults';
  results.className='bible-search-results';
  results.hidden=true;
  searchStatus.after(results);

  const loading=document.getElementById('bibleLoadingState');
  const chapterArticle=document.getElementById('bibleApiChapter');
  const chapterContent=document.getElementById('bibleApiContent');
  const chapterCredits=document.getElementById('bibleApiCredits');

  const normalize=value=>(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
  const errorMessages={
    NOT_CONFIGURED:'A integração da Bíblia ainda não foi configurada. Cadastre uma chave oficial para liberar os versículos.',
    UNAUTHORIZED_TRANSLATION:'Esta tradução não está disponível para a chave atual.',
    BOOK_UNAVAILABLE:'Este livro não está disponível nesta tradução.',
    NOT_FOUND:'Não foi possível encontrar este capítulo.',
    INVALID_CHAPTER:'Não foi possível encontrar este capítulo.',
    SEARCH_UNAVAILABLE:'A pesquisa por palavras não está disponível para esta tradução.',
    RATE_LIMIT:'Muitas solicitações foram feitas. Aguarde um minuto e tente novamente.',
    UPSTREAM_LIMIT:'A API bíblica atingiu um limite temporário. Tente novamente em instantes.',
    CONNECTION_ERROR:'Não foi possível carregar os versículos agora. Tente novamente.',
    UPSTREAM_ERROR:'Não foi possível carregar os versículos agora. Tente novamente.'
  };

  class BibleApiError extends Error{
    constructor(code,message){super(message);this.code=code}
  }

  function ensureFumsTracker(){
    window.fumsData=window.fumsData||[];
    window.fums=window.fums||function(){window.fumsData.push(arguments)};
    if(!document.getElementById('apiBibleFumsTracker')){
      const script=document.createElement('script');
      script.id='apiBibleFumsTracker';script.src='https://pkg.api.bible/fumsV3.min.js';script.async=true;
      document.head.appendChild(script);
    }
  }
  function trackFums(token){
    if(typeof token==='string'&&token.length>10&&token.length<4096){ensureFumsTracker();window.fums('trackView',token)}
  }

  function cacheKey(action,params){
    return `${cachePrefix}:${activeProvider||'configured'}:${action}:${params.bibleId||''}:${params.bookId||''}:${params.chapterId||''}:${params.reference||''}:${params.query||''}`;
  }
  function readCache(key){
    try{const item=JSON.parse(sessionStorage.getItem(key)||'null');if(item&&item.expires>Date.now())return item.data;sessionStorage.removeItem(key)}catch{}return null;
  }
  function writeCache(key,data){
    try{sessionStorage.setItem(key,JSON.stringify({expires:Date.now()+cacheTtl,data}))}catch{}
  }

  async function callBibleApi(action,params={}){
    const key=cacheKey(action,params);
    const cached=readCache(key);
    if(cached)return cached;
    const controller=new AbortController();
    const timeout=setTimeout(()=>controller.abort(),requestTimeout);
    try{
      const url=new URL(bibleApiUrl);
      Object.entries({action,...params}).forEach(([name,value])=>{if(value!==undefined&&value!==null&&value!=='')url.searchParams.set(name,String(value))});
      const response=await fetch(url,{method:'GET',headers:{Accept:'application/json'},signal:controller.signal});
      const data=await response.json().catch(()=>null);
      if(!response.ok||data?.error){
        const apiError=data?.error;
        throw new BibleApiError(apiError?.code||'CONNECTION_ERROR',apiError?.message||`Erro HTTP ${response.status}`);
      }
      activeProvider=data.provider||activeProvider;
      writeCache(cacheKey(action,params),data);
      return data;
    }catch(error){
      if(error instanceof BibleApiError)throw error;
      throw new BibleApiError('CONNECTION_ERROR',String(error?.message||error));
    }finally{clearTimeout(timeout)}
  }

  function showPending(code,message){
    pending.hidden=true;integrationRoot.hidden=false;loading.hidden=true;chapterArticle.hidden=true;errorState.hidden=false;
    errorState.querySelector('h4').textContent=code==='NOT_CONFIGURED'?'Integração oficial pendente':'Não foi possível carregar';
    errorState.querySelector('p').textContent=errorMessages[code]||message||errorMessages.CONNECTION_ERROR;
    retryButton.hidden=code==='NOT_CONFIGURED';
  }
  function showLoading(){
    pending.hidden=true;integrationRoot.hidden=false;errorState.hidden=true;chapterArticle.hidden=true;loading.hidden=false;retryButton.hidden=true;
  }
  function showChapter(){
    pending.hidden=true;integrationRoot.hidden=false;errorState.hidden=true;loading.hidden=true;chapterArticle.hidden=false;retryButton.hidden=true;
  }

  function appendSanitizedHtml(target,html){
    const source=new DOMParser().parseFromString(String(html||''),'text/html');
    const allowedTags=new Set(['P','DIV','SPAN','BR','B','STRONG','I','EM','H4','H5']);
    const allowedClasses=new Set(['p','m','v','s','q','q1','q2','wj','nd']);
    const fragment=document.createDocumentFragment();
    const cleanNode=node=>{
      if(node.nodeType===Node.TEXT_NODE)return document.createTextNode(node.textContent||'');
      if(node.nodeType!==Node.ELEMENT_NODE)return document.createDocumentFragment();
      const tag=allowedTags.has(node.tagName)?node.tagName.toLowerCase():'span';
      const clean=document.createElement(tag);
      const className=[...node.classList].filter(name=>allowedClasses.has(name)).join(' ');
      if(className)clean.className=className;
      ['data-number','data-sid','data-eid'].forEach(attribute=>{const value=node.getAttribute(attribute);if(value&&/^[A-Za-z0-9._:-]{1,40}$/.test(value))clean.setAttribute(attribute,value)});
      node.childNodes.forEach(child=>clean.appendChild(cleanNode(child)));
      return clean;
    };
    source.body.childNodes.forEach(node=>fragment.appendChild(cleanNode(node)));
    target.replaceChildren(fragment);
  }

  function addCredits(chapter){
    chapterCredits.replaceChildren();
    const translation=document.createElement('strong');
    translation.textContent=selectedBible?`${selectedBible.name}${selectedBible.abbreviation?` (${selectedBible.abbreviation})`:''}`:'Tradução autorizada';
    chapterCredits.appendChild(translation);
    if(chapter.copyright){const copyright=document.createElement('p');copyright.textContent=chapter.copyright;chapterCredits.appendChild(copyright)}
    if(chapter.attribution){const attribution=document.createElement('p');attribution.textContent=chapter.attribution;chapterCredits.appendChild(attribution)}
    if(chapter.attributionUrl){
      try{const url=new URL(chapter.attributionUrl);if(url.protocol==='https:'){const link=document.createElement('a');link.href=url.href;link.target='_blank';link.rel='noopener noreferrer';link.textContent='Informações de licenciamento';chapterCredits.appendChild(link)}}catch{}
    }
  }

  function renderTextVerses(chapter){
    chapterContent.replaceChildren();
    const verses=Array.isArray(chapter.verses)?chapter.verses:[];
    verses.forEach((verse,index)=>{
      const article=document.createElement('article');article.className='bible-api-verse';
      const number=document.createElement('sup');number.textContent=verse.number||String(index+1);
      const text=document.createElement('span');text.textContent=verse.text||'';
      const reference=document.createElement('small');reference.textContent=verse.reference||`${document.getElementById('bibleReaderTitle').textContent}:${verse.number||index+1}`;
      const actions=document.createElement('div');actions.className='bible-api-verse-actions';
      [['copy','Copiar referência'],['whatsapp','Compartilhar no WhatsApp'],['favorite','☆ Favoritar']].forEach(([action,label])=>{const button=document.createElement('button');button.type='button';button.dataset.apiVerseAction=action;button.dataset.reference=reference.textContent;button.textContent=label;actions.appendChild(button)});
      article.append(number,text,reference,actions);chapterContent.appendChild(article);
    });
    if(!verses.length){const empty=document.createElement('p');empty.className='bible-api-empty';empty.textContent='Não foi possível encontrar este capítulo.';chapterContent.appendChild(empty)}
  }

  function renderChapter(data){
    const chapter=data.chapter||{};
    readerTranslation.textContent=selectedBible?`${selectedBible.name}${selectedBible.abbreviation?` • ${selectedBible.abbreviation}`:''}`:'Tradução autorizada';
    if(chapter.contentType==='html')appendSanitizedHtml(chapterContent,chapter.content);
    else renderTextVerses(chapter);
    addCredits(chapter);showChapter();trackFums(data.fumsToken);
  }

  function mapApiBooks(books){
    apiBookMap=new Map();
    books.forEach(book=>{
      const direct=canonicalOrder.find(code=>code===book.code||code===book.id);
      const byName=canonicalOrder.find(code=>normalize(canonicalNames.get(code))===normalize(book.name)||normalize(canonicalNames.get(code))===normalize(book.nameLong));
      const canonical=direct||byName;
      if(canonical)apiBookMap.set(canonical,book);
    });
  }

  async function loadBooks(){
    if(!selectedBible)return;
    try{
      const data=await callBibleApi('books',{bibleId:selectedBible.id});
      apiBooks=Array.isArray(data.books)?data.books:[];mapApiBooks(apiBooks);
      canonicalButtons.forEach(button=>{button.classList.toggle('bible-book-unavailable',!apiBookMap.has(button.dataset.book));button.setAttribute('aria-disabled',String(!apiBookMap.has(button.dataset.book)))});
      const route=currentRoute();
      if(route&&apiBookMap.has(route.code))await loadBookChapters(route.code,false);
    }catch(error){showPending(error.code,error.message)}
  }

  function renderApiChapters(apiBook,canonicalCode){
    const chapters=Array.isArray(apiBook.chapters)?apiBook.chapters:[];
    const box=document.getElementById('bibleChapters');
    const bookName=canonicalNames.get(canonicalCode)||apiBook.name;
    box.replaceChildren();
    const heading=document.createElement('h4');heading.textContent='Escolha o capítulo';
    const list=document.createElement('div');
    chapters.forEach((chapter,index)=>{
      const number=Number(chapter.number)||index+1;
      const button=document.createElement('button');button.type='button';button.dataset.chapter=String(number);button.dataset.chapterId=chapter.id;button.setAttribute('aria-label',`${bookName}, capítulo ${number}`);button.textContent=String(number);list.appendChild(button);
    });
    box.append(heading,list);
    const route=currentRoute();
    if(route?.code===canonicalCode)box.querySelector(`[data-chapter="${route.chapter}"]`)?.classList.add('active');
  }

  async function loadBookChapters(canonicalCode,showError=true){
    const apiBook=apiBookMap.get(canonicalCode);
    if(!apiBook){if(showError)showPending('BOOK_UNAVAILABLE');return null}
    if(!Array.isArray(apiBook.chapters)||!apiBook.chapters.length){
      const data=await callBibleApi('chapters',{bibleId:selectedBible.id,bookId:apiBook.id});
      apiBook.chapters=Array.isArray(data.chapters)?data.chapters:[];
    }
    renderApiChapters(apiBook,canonicalCode);
    return apiBook;
  }

  async function chapterIdentifier(apiBook,canonicalCode,chapterNumber){
    await loadBookChapters(canonicalCode);
    const chapter=apiBook.chapters.find(item=>Number(item.number)===chapterNumber||item.id===`${apiBook.id}.${chapterNumber}`||item.id===String(chapterNumber));
    if(!chapter)throw new BibleApiError('NOT_FOUND','Capítulo não encontrado.');
    return chapter.id;
  }

  function currentRoute(){
    const match=location.hash.match(/^#biblia\/([^/]+)\/(\d+)$/);
    return match?{code:match[1],chapter:Number(match[2])}:null;
  }

  async function loadCurrentChapter(){
    const route=currentRoute();
    if(!route||!selectedBible)return;
    const apiBook=apiBookMap.get(route.code);
    if(!apiBook){showPending('BOOK_UNAVAILABLE');return}
    const requestId=++lastRequest;showLoading();
    try{
      const chapterId=await chapterIdentifier(apiBook,route.code,route.chapter);
      const data=await callBibleApi('chapter',{bibleId:selectedBible.id,bookId:apiBook.id,chapterId});
      if(requestId!==lastRequest)return;
      renderChapter(data);
    }catch(error){if(requestId===lastRequest)showPending(error.code,error.message)}
  }

  function populateTranslations(bibles){
    translationSelect.replaceChildren();
    if(!bibles.length){
      const option=document.createElement('option');option.textContent='Nenhuma tradução em português autorizada';option.selected=true;translationSelect.appendChild(option);translationSelect.disabled=true;
      translationStatus.textContent='Esta tradução ainda não está autorizada para este aplicativo.';return;
    }
    availableBibles=[...bibles].sort((a,b)=>a.id===defaultBibleId?-1:b.id===defaultBibleId?1:0);
    availableBibles.forEach(bible=>{
      const option=document.createElement('option');option.value=bible.id;
      option.textContent=bible.id===defaultBibleId?'BLT — Bíblia Livre Para Todos':bible.id==='90799bb5b996fddc-01'?'TPT — Translation for Translators in Brazilian Portuguese':`${bible.abbreviation?`${bible.abbreviation} — `:''}${bible.name}`;
      translationSelect.appendChild(option);
    });
    const saved=localStorage.getItem(translationKey);
    selectedBible=availableBibles.find(bible=>bible.id===saved)||availableBibles.find(bible=>bible.id===defaultBibleId)||availableBibles[0];
    translationSelect.value=selectedBible.id;translationSelect.disabled=false;
    translationStatus.textContent=`Tradução selecionada: ${selectedBible.name}.`;
    readerTranslation.textContent=`${selectedBible.name}${selectedBible.abbreviation?` • ${selectedBible.abbreviation}`:''}`;
  }

  async function loadBibles(){
    translationStatus.textContent='Consultando traduções autorizadas...';
    try{
      const data=await callBibleApi('bibles');
      activeProvider=data.provider||activeProvider;
      const bibles=(Array.isArray(data.bibles)?data.bibles:[]).filter(bible=>['pt','por'].some(code=>String(bible.languageCode).toLowerCase().startsWith(code))||/portugu/i.test(bible.languageName));
      populateTranslations(bibles);
      if(!selectedBible){showPending('UNAUTHORIZED_TRANSLATION');return}
      document.querySelector('.bible-api-badge').textContent='API oficial • API.Bible';
      searchStatus.textContent='Pesquise por uma palavra, expressão ou referência bíblica.';
      await loadBooks();await loadCurrentChapter();
    }catch(error){translationSelect.disabled=true;translationStatus.textContent='Integração oficial não configurada.';showPending(error.code,error.message)}
  }

  translationSelect.addEventListener('change',async()=>{
    selectedBible=availableBibles.find(bible=>bible.id===translationSelect.value)||null;
    if(!selectedBible)return;
    localStorage.setItem(translationKey,selectedBible.id);translationStatus.textContent=`Tradução selecionada: ${selectedBible.name}.`;await loadBooks();await loadCurrentChapter();
  });

  document.addEventListener('click',event=>{
    const bookButton=event.target.closest('#biblia .bible-book-list [data-book]');
    if(bookButton)setTimeout(()=>loadBookChapters(bookButton.dataset.book).catch(error=>showPending(error.code,error.message)),0);
    if(event.target.closest('#bibleChapters [data-chapter]'))setTimeout(loadCurrentChapter,0);
  });
  window.addEventListener('hashchange',()=>setTimeout(()=>{refreshBoundaryNavigation();loadCurrentChapter()},0));

  function refreshBoundaryNavigation(){
    const route=currentRoute();if(!route)return;
    const index=canonicalOrder.indexOf(route.code);const chapters=document.querySelectorAll('#bibleChapters [data-chapter]').length;
    if(route.chapter===1&&index>0)previousButton.disabled=false;
    if(route.chapter===chapters&&index<canonicalOrder.length-1)nextButton.disabled=false;
  }
  function crossBook(direction,event){
    const route=currentRoute();if(!route)return false;
    const chapters=document.querySelectorAll('#bibleChapters [data-chapter]').length;const index=canonicalOrder.indexOf(route.code);
    const crosses=direction<0?route.chapter===1:route.chapter===chapters;
    const targetIndex=index+direction;
    if(!crosses||targetIndex<0||targetIndex>=canonicalOrder.length)return false;
    event.preventDefault();event.stopImmediatePropagation();
    const targetCode=canonicalOrder[targetIndex];
    document.querySelector(`#biblia .bible-book-list [data-book="${targetCode}"]`)?.click();
    setTimeout(()=>{const available=document.querySelectorAll('#bibleChapters [data-chapter]').length;const targetChapter=direction<0?available:1;document.querySelector(`#bibleChapters [data-chapter="${targetChapter}"]`)?.click();refreshBoundaryNavigation()},0);
    return true;
  }
  previousButton.addEventListener('click',event=>{if(!crossBook(-1,event))setTimeout(()=>{refreshBoundaryNavigation();loadCurrentChapter()},0)},true);
  nextButton.addEventListener('click',event=>{if(!crossBook(1,event))setTimeout(()=>{refreshBoundaryNavigation();loadCurrentChapter()},0)},true);

  function parseReference(value){
    const match=value.trim().match(/^(.+?)\s+(\d+)(?::(\d+))?$/);if(!match)return null;
    const code=canonicalOrder.find(item=>normalize(canonicalNames.get(item))===normalize(match[1]));
    return code?{code,chapter:Number(match[2]),verse:match[3]?Number(match[3]):null}:null;
  }
  function renderSearchResults(items){
    results.replaceChildren();results.hidden=false;
    if(!items.length){const empty=document.createElement('p');empty.textContent='Nenhum resultado encontrado.';results.appendChild(empty);return}
    items.forEach(item=>{
      const button=document.createElement('button');button.type='button';button.className='bible-search-result';
      const title=document.createElement('strong');title.textContent=item.reference||item.id;
      const excerpt=document.createElement('span');excerpt.textContent=String(item.text||'').replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim().slice(0,220);
      button.append(title,excerpt);button.addEventListener('click',()=>{
        const code=canonicalOrder.find(canonical=>apiBookMap.get(canonical)?.id===item.bookId||item.chapterId?.startsWith(`${apiBookMap.get(canonical)?.id}.`));
        const chapter=Number(String(item.chapterId||'').split('.')[1]);
        if(code&&chapter)location.hash=`biblia/${code}/${chapter}`;
      });results.appendChild(button);
    });
  }
  searchForm.addEventListener('submit',async event=>{
    event.preventDefault();event.stopImmediatePropagation();
    const query=searchInput.value.trim();const reference=parseReference(query);
    results.hidden=true;
    if(!selectedBible){showPending('NOT_CONFIGURED');return}
    if(reference&&!apiBookMap.has(reference.code)){searchStatus.textContent='Esta tradução não disponibiliza o livro pesquisado.';return}
    const apiQuery=reference?`${apiBookMap.get(reference.code).id}.${reference.chapter}${reference.verse?`.${reference.verse}`:''}`:query;
    searchStatus.textContent='Pesquisando na tradução selecionada...';
    try{const data=await callBibleApi('search',{bibleId:selectedBible.id,query:apiQuery});renderSearchResults(Array.isArray(data.results)?data.results:[]);trackFums(data.fumsToken);searchStatus.textContent=`Resultados para “${query}”.`}
    catch(error){searchStatus.textContent=errorMessages[error.code]||error.message;results.hidden=true}
  },true);

  function favoriteReference(reference){
    let favorites=[];try{favorites=JSON.parse(localStorage.getItem(favoriteKey)||'[]')}catch{}
    const id=`api-${normalize(reference)}`;
    if(!favorites.some(item=>item.id===id))favorites.push({id,translation:selectedBible?.id||'',book:'',chapter:null,verse:null,reference});
    localStorage.setItem(favoriteKey,JSON.stringify(favorites));
  }
  chapterContent.addEventListener('click',event=>{
    const button=event.target.closest('[data-api-verse-action]');if(!button)return;
    const reference=button.dataset.reference;const action=button.dataset.apiVerseAction;
    if(action==='copy')navigator.clipboard.writeText(`${reference} — ${selectedBible?.name||'Tradução bíblica'} — ${location.href}`).catch(()=>{});
    if(action==='favorite')favoriteReference(reference);
    if(action==='whatsapp'){
      const message=`${reference} — ${selectedBible?.name||'Tradução bíblica'}\n${location.href}`;
      const opened=window.open(`https://wa.me/?text=${encodeURIComponent(message)}`,'_blank','noopener,noreferrer');if(opened)opened.opener=null;
    }
  });

  retryButton.addEventListener('click',()=>selectedBible?loadCurrentChapter():loadBibles());
  loadBibles();
})();
