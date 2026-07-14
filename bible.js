(() => {
  const oldTestament = [
    ['GEN','Gênesis',50],['EXO','Êxodo',40],['LEV','Levítico',27],['NUM','Números',36],['DEU','Deuteronômio',34],['JOS','Josué',24],['JDG','Juízes',21],['RUT','Rute',4],['1SA','1 Samuel',31],['2SA','2 Samuel',24],['1KI','1 Reis',22],['2KI','2 Reis',25],['1CH','1 Crônicas',29],['2CH','2 Crônicas',36],['EZR','Esdras',10],['NEH','Neemias',13],['EST','Ester',10],['JOB','Jó',42],['PSA','Salmos',150],['PRO','Provérbios',31],['ECC','Eclesiastes',12],['SNG','Cânticos',8],['ISA','Isaías',66],['JER','Jeremias',52],['LAM','Lamentações',5],['EZK','Ezequiel',48],['DAN','Daniel',12],['HOS','Oséias',14],['JOL','Joel',3],['AMO','Amós',9],['OBA','Obadias',1],['JON','Jonas',4],['MIC','Miqueias',7],['NAM','Naum',3],['HAB','Habacuque',3],['ZEP','Sofonias',3],['HAG','Ageu',2],['ZEC','Zacarias',14],['MAL','Malaquias',4]
  ];
  const newTestament = [
    ['MAT','Mateus',28],['MRK','Marcos',16],['LUK','Lucas',24],['JHN','João',21],['ACT','Atos',28],['ROM','Romanos',16],['1CO','1 Coríntios',16],['2CO','2 Coríntios',13],['GAL','Gálatas',6],['EPH','Efésios',6],['PHP','Filipenses',4],['COL','Colossenses',4],['1TH','1 Tessalonicenses',5],['2TH','2 Tessalonicenses',3],['1TI','1 Timóteo',6],['2TI','2 Timóteo',4],['TIT','Tito',3],['PHM','Filemom',1],['HEB','Hebreus',13],['JAS','Tiago',5],['1PE','1 Pedro',5],['2PE','2 Pedro',3],['1JN','1 João',5],['2JN','2 João',1],['3JN','3 João',1],['JUD','Judas',1],['REV','Apocalipse',22]
  ];
  const bibleBooks = [...oldTestament, ...newTestament].map(([code,name,chapters],index) => ({code,name,chapters,testament:index<39?'Antigo Testamento':'Novo Testamento'}));
  const officialSite = 'https://matheuscosta7171-maker.github.io/igreja-videira-chapadao-do-ceu/';
  const favoriteKey = 'videiraBibleFavorites';
  const fontKey = 'videiraBibleFontScale';
  const dailyReferences = [
    {code:'JHN',chapter:3,verse:16},{code:'PSA',chapter:23,verse:1},{code:'PHP',chapter:4,verse:13},{code:'PRO',chapter:3,verse:5},{code:'ROM',chapter:8,verse:28},{code:'ISA',chapter:41,verse:10},{code:'MAT',chapter:11,verse:28}
  ];

  const normalize = value => value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
  const bookByCode = code => bibleBooks.find(book => book.code === code);
  const bibleNav = document.querySelector('.nav');
  const wordLink = bibleNav?.querySelector('a[href="#palavra"]');
  if (bibleNav && wordLink && !bibleNav.querySelector('a[href="#biblia"]')) {
    const link = document.createElement('a');
    link.href = '#biblia';
    link.textContent = 'Bíblia';
    link.addEventListener('click', () => {
      bibleNav.classList.remove('open');
      document.querySelector('.menu-button')?.setAttribute('aria-expanded','false');
    });
    bibleNav.insertBefore(link, wordLink);
  }

  const bibleSection = document.createElement('section');
  bibleSection.id = 'biblia';
  bibleSection.className = 'bible-section';
  bibleSection.innerHTML = `
    <header class="bible-hero">
      <span class="bible-kicker">Leitura e meditação</span>
      <h2>Bíblia Sagrada</h2>
      <p>Leia, medite e compartilhe a Palavra de Deus.</p>
      <span class="bible-api-badge">Integração oficial pendente</span>
    </header>

    <div class="bible-toolbar" aria-label="Controles da Bíblia">
      <label for="bibleTranslation">Tradução
        <select id="bibleTranslation" disabled aria-describedby="translationStatus">
          <option selected>Traduções aguardando autorização</option>
          <option>NVI — Nova Versão Internacional</option>
          <option>A Mensagem</option>
          <option>ARA — Almeida Revista e Atualizada</option>
        </select>
      </label>
      <p id="translationStatus">Tradução aguardando autorização.</p>
      <form class="bible-search" id="bibleSearchForm" role="search">
        <label for="bibleSearch">Buscar na Bíblia</label>
        <div><input id="bibleSearch" type="search" placeholder="Ex.: João 3:16 ou Salmos 23"><button type="submit">Buscar</button></div>
      </form>
      <div class="bible-font-controls" aria-label="Tamanho do texto">
        <span>Tamanho</span><button type="button" data-font="decrease" aria-label="Diminuir fonte">A−</button><button type="button" data-font="reset" aria-label="Restaurar fonte">A</button><button type="button" data-font="increase" aria-label="Aumentar fonte">A+</button>
      </div>
    </div>
    <p class="bible-search-status" id="bibleSearchStatus" aria-live="polite">A pesquisa bíblica será liberada após a configuração da integração oficial. Referências podem ser usadas para navegar pela estrutura.</p>

    <button class="bible-books-toggle" id="bibleBooksToggle" type="button" aria-expanded="false" aria-controls="bibleSidebar">Escolher livro <span aria-hidden="true">⌄</span></button>
    <div class="bible-app">
      <aside class="bible-sidebar" id="bibleSidebar" aria-label="Livros da Bíblia">
        <div class="bible-testament"><h3>Antigo Testamento</h3><div class="bible-book-list" id="oldTestamentBooks"></div></div>
        <div class="bible-testament"><h3>Novo Testamento</h3><div class="bible-book-list" id="newTestamentBooks"></div></div>
      </aside>

      <div class="bible-reader" id="bibleReader" role="region" aria-label="Leitura bíblica">
        <div class="bible-reader-heading">
          <div><span id="bibleReaderTranslation">Tradução aguardando autorização</span><h3 id="bibleReaderTitle">Escolha um livro</h3></div>
          <button type="button" id="backToBooks">Voltar aos livros</button>
        </div>
        <div class="bible-chapters" id="bibleChapters" aria-label="Capítulos"></div>
        <div class="bible-chapter-nav" id="bibleChapterNav" hidden>
          <button type="button" id="previousChapter">← Capítulo anterior</button>
          <button type="button" id="nextChapter">Próximo capítulo →</button>
        </div>
        <div class="bible-pending" id="biblePendingState">
          <span aria-hidden="true">▤</span>
          <h4>Área de leitura preparada</h4>
          <p>A área de leitura bíblica está pronta para receber uma integração oficial. Configure a API autorizada para disponibilizar as traduções.</p>
        </div>
      </div>
    </div>

    <div class="bible-lower-grid">
      <article class="daily-verse-card">
        <span class="bible-kicker">Referência autorizada</span>
        <h3>Versículo do Dia</h3>
        <strong id="dailyVerseReference"></strong>
        <p>O texto será exibido somente depois da autorização da tradução pela API oficial.</p>
        <div class="verse-actions" id="dailyVerseActions"></div>
      </article>
      <section class="bible-favorites" aria-labelledby="favoritesTitle">
        <span class="bible-kicker">Salvos neste navegador</span>
        <h3 id="favoritesTitle">Meus Versículos Favoritos</h3>
        <div id="bibleFavoritesList"></div>
      </section>
    </div>`;

  const bibleAnchor = document.getElementById('jejum21') || document.getElementById('agenda');
  bibleAnchor?.after(bibleSection);

  const renderBookButtons = (books, targetId) => {
    document.getElementById(targetId).innerHTML = books.map(book => `<button type="button" data-book="${book.code}" aria-label="Selecionar ${book.name}">${book.name}</button>`).join('');
  };
  renderBookButtons(bibleBooks.slice(0,39),'oldTestamentBooks');
  renderBookButtons(bibleBooks.slice(39),'newTestamentBooks');

  let selectedBook = null;
  let selectedChapter = null;
  let fontScale = Number(localStorage.getItem(fontKey)) || 1;
  const reader = document.getElementById('bibleReader');
  const chaptersBox = document.getElementById('bibleChapters');
  const chapterNav = document.getElementById('bibleChapterNav');
  const readerTitle = document.getElementById('bibleReaderTitle');
  const pendingState = document.getElementById('biblePendingState');

  const applyFontScale = () => {
    fontScale = Math.min(1.35, Math.max(.85, fontScale));
    reader.style.setProperty('--bible-font-scale', fontScale);
    localStorage.setItem(fontKey, String(fontScale));
  };
  applyFontScale();

  function selectBook(code, focusChapters=true) {
    selectedBook = bookByCode(code);
    selectedChapter = null;
    document.querySelectorAll('[data-book]').forEach(button => {
      const active = button.dataset.book === code;
      button.classList.toggle('active',active);
      button.setAttribute('aria-current',active?'true':'false');
    });
    readerTitle.textContent = selectedBook.name;
    chaptersBox.innerHTML = `<h4>Escolha o capítulo</h4><div>${Array.from({length:selectedBook.chapters},(_,index)=>`<button type="button" data-chapter="${index+1}" aria-label="${selectedBook.name}, capítulo ${index+1}">${index+1}</button>`).join('')}</div>`;
    chapterNav.hidden = true;
    pendingState.querySelector('h4').textContent = `${selectedBook.name} — selecione um capítulo`;
    pendingState.querySelector('p').textContent = 'Os capítulos estão disponíveis para navegação. O texto bíblico será carregado após a integração oficial e a autorização da tradução.';
    if (focusChapters) chaptersBox.querySelector('button')?.focus();
  }

  function selectChapter(chapter, updateHash=true) {
    if (!selectedBook || chapter < 1 || chapter > selectedBook.chapters) return;
    selectedChapter = chapter;
    readerTitle.textContent = `${selectedBook.name} ${chapter}`;
    document.querySelectorAll('[data-chapter]').forEach(button => button.classList.toggle('active',Number(button.dataset.chapter)===chapter));
    chapterNav.hidden = false;
    document.getElementById('previousChapter').disabled = chapter === 1;
    document.getElementById('nextChapter').disabled = chapter === selectedBook.chapters;
    pendingState.querySelector('h4').textContent = `${selectedBook.name} ${chapter}`;
    pendingState.querySelector('p').textContent = 'Tradução aguardando autorização. Nenhum texto bíblico protegido foi armazenado nesta página.';
    document.getElementById('bibleSidebar').classList.remove('books-open');
    document.getElementById('bibleBooksToggle').setAttribute('aria-expanded','false');
    if (updateHash) history.replaceState(null,'',`#biblia/${selectedBook.code}/${chapter}`);
  }

  document.getElementById('bibleSidebar').addEventListener('click', event => {
    const button = event.target.closest('[data-book]');
    if (button) selectBook(button.dataset.book);
  });
  chaptersBox.addEventListener('click', event => {
    const button = event.target.closest('[data-chapter]');
    if (button) selectChapter(Number(button.dataset.chapter));
  });
  document.getElementById('previousChapter').addEventListener('click',() => selectChapter(selectedChapter-1));
  document.getElementById('nextChapter').addEventListener('click',() => selectChapter(selectedChapter+1));
  document.getElementById('backToBooks').addEventListener('click',() => {
    selectedBook = null; selectedChapter = null; chaptersBox.innerHTML = ''; chapterNav.hidden = true;
    readerTitle.textContent = 'Escolha um livro';
    history.replaceState(null,'','#biblia');
    document.getElementById('bibleSidebar').classList.add('books-open');
    document.getElementById('bibleBooksToggle').setAttribute('aria-expanded','true');
  });
  document.getElementById('bibleBooksToggle').addEventListener('click', event => {
    const sidebar = document.getElementById('bibleSidebar');
    const open = sidebar.classList.toggle('books-open');
    event.currentTarget.setAttribute('aria-expanded',String(open));
  });

  document.querySelector('.bible-font-controls').addEventListener('click', event => {
    const action = event.target.dataset.font;
    if (!action) return;
    if (action === 'decrease') fontScale -= .1;
    if (action === 'increase') fontScale += .1;
    if (action === 'reset') fontScale = 1;
    applyFontScale();
  });

  function parseReference(value) {
    const match = value.trim().match(/^(.+?)\s+(\d+)(?::(\d+))?$/);
    if (!match) return null;
    const book = [...bibleBooks].sort((a,b)=>b.name.length-a.name.length).find(item => normalize(item.name) === normalize(match[1]));
    const chapter = Number(match[2]);
    if (!book || chapter < 1 || chapter > book.chapters) return null;
    return {book,chapter,verse:match[3]?Number(match[3]):null};
  }
  document.getElementById('bibleSearchForm').addEventListener('submit', event => {
    event.preventDefault();
    const query = document.getElementById('bibleSearch').value.trim();
    const status = document.getElementById('bibleSearchStatus');
    const reference = parseReference(query);
    if (reference) {
      selectBook(reference.book.code,false);
      selectChapter(reference.chapter);
      status.textContent = reference.verse ? `${reference.book.name} ${reference.chapter}:${reference.verse} localizado. O texto aguarda a integração oficial.` : `${reference.book.name} ${reference.chapter} selecionado. O texto aguarda a integração oficial.`;
      bibleSection.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});
    } else {
      status.textContent = 'A pesquisa por palavras e expressões será liberada após a configuração da integração oficial.';
    }
  });

  const todayReference = dailyReferences[Math.floor(Date.now()/86400000)%dailyReferences.length];
  const todayBook = bookByCode(todayReference.code);
  const dailyReferenceLabel = `${todayBook.name} ${todayReference.chapter}:${todayReference.verse}`;
  document.getElementById('dailyVerseReference').textContent = dailyReferenceLabel;
  document.getElementById('dailyVerseActions').innerHTML = `
    <button type="button" data-verse-action="copy" data-reference="${dailyReferenceLabel}">Copiar referência</button>
    <button type="button" data-verse-action="whatsapp" data-reference="${dailyReferenceLabel}">Compartilhar no WhatsApp</button>
    <button type="button" data-verse-action="favorite" data-reference="${dailyReferenceLabel}" data-book="${todayBook.code}" data-chapter="${todayReference.chapter}" data-verse="${todayReference.verse}">☆ Favoritar</button>
    <button type="button" data-verse-action="link" data-book="${todayBook.code}" data-chapter="${todayReference.chapter}">Copiar link do capítulo</button>
    <button type="button" disabled title="Disponível após autorização da licença">Compartilhar texto</button>`;

  const getFavorites = () => {
    try { return JSON.parse(localStorage.getItem(favoriteKey) || '[]'); } catch { return []; }
  };
  const saveFavorites = favorites => localStorage.setItem(favoriteKey,JSON.stringify(favorites));
  function renderFavorites() {
    const favorites = getFavorites();
    document.getElementById('bibleFavoritesList').innerHTML = favorites.length ? favorites.map(item => `<article><div><strong>${item.reference}</strong><small>Tradução aguardando autorização</small></div><button type="button" data-remove-favorite="${item.id}" aria-label="Remover ${item.reference} dos favoritos">Remover</button></article>`).join('') : '<p class="bible-empty-favorites">Nenhuma referência favoritada ainda.</p>';
  }
  renderFavorites();

  async function copyValue(value) {
    const status = document.getElementById('bibleSearchStatus');
    try { await navigator.clipboard.writeText(value); status.textContent = 'Copiado para a área de transferência.'; }
    catch { status.textContent = 'Não foi possível copiar automaticamente. Selecione e copie a referência manualmente.'; }
  }
  document.getElementById('dailyVerseActions').addEventListener('click', event => {
    const button = event.target.closest('[data-verse-action]');
    if (!button) return;
    const action = button.dataset.verseAction;
    const reference = button.dataset.reference;
    if (action === 'copy') copyValue(`${reference} — Tradução aguardando autorização`);
    if (action === 'link') copyValue(`${officialSite}#biblia/${button.dataset.book}/${button.dataset.chapter}`);
    if (action === 'whatsapp') {
      const text = `${reference} — Tradução aguardando autorização\n${officialSite}#biblia/${todayBook.code}/${todayReference.chapter}`;
      const opened = window.open(`https://wa.me/?text=${encodeURIComponent(text)}`,'_blank','noopener,noreferrer');
      if (opened) opened.opener = null;
    }
    if (action === 'favorite') {
      const favorites = getFavorites();
      const id = `${button.dataset.book}-${button.dataset.chapter}-${button.dataset.verse}-pending`;
      if (!favorites.some(item => item.id === id)) favorites.push({id,translation:'pending',book:button.dataset.book,chapter:Number(button.dataset.chapter),verse:Number(button.dataset.verse),reference});
      saveFavorites(favorites); renderFavorites();
    }
  });
  document.getElementById('bibleFavoritesList').addEventListener('click', event => {
    const id = event.target.dataset.removeFavorite;
    if (!id) return;
    saveFavorites(getFavorites().filter(item => item.id !== id)); renderFavorites();
  });

  function applyHashRoute() {
    const match = location.hash.match(/^#biblia\/([^/]+)\/(\d+)$/);
    if (!match) return;
    const book = bookByCode(match[1]);
    if (!book) return;
    selectBook(book.code,false); selectChapter(Number(match[2]),false); bibleSection.scrollIntoView();
  }
  window.addEventListener('hashchange',applyHashRoute);
  applyHashRoute();
})();
