(() => {
  window.VIDEIRA_BIBLE_MODE = 'local';

  const nav = document.querySelector('.nav');
  const wordLink = nav?.querySelector('a[href="#palavra"]');
  if (nav && wordLink && !nav.querySelector('a[href="#biblia"]')) {
    const link = document.createElement('a');
    link.href = '#biblia';
    link.textContent = 'Bíblia';
    link.addEventListener('click', () => {
      nav.classList.remove('open');
      document.querySelector('.menu-button')?.setAttribute('aria-expanded','false');
    });
    nav.insertBefore(link, wordLink);
  }

  const section = document.createElement('section');
  section.id = 'biblia';
  section.className = 'bible-section';
  section.innerHTML = `
    <header class="bible-hero">
      <span class="bible-kicker">Leitura e meditação</span>
      <h2>Bíblia Sagrada</h2>
      <p>Leia, medite e compartilhe a Palavra de Deus.</p>
      <span class="bible-api-badge">Bíblia completa disponível localmente</span>
    </header>

    <div class="bible-toolbar" aria-label="Controles da Bíblia">
      <label for="bibleTranslation">Tradução
        <select id="bibleTranslation" aria-describedby="translationStatus">
          <option value="almeida-historica" selected>Almeida Histórica — Bíblia completa</option>
          <option value="api-blt" disabled>BLT — online (opção secundária desativada)</option>
          <option value="api-tpt" disabled>TPT — online (opção secundária desativada)</option>
        </select>
      </label>
      <p id="translationStatus">Tradução selecionada: Almeida Histórica.</p>
      <form class="bible-search" id="bibleSearchForm" role="search">
        <label for="bibleSearch">Buscar na Bíblia</label>
        <div><input id="bibleSearch" type="search" placeholder="Ex.: João 3:16, amor ou graça"><button type="submit">Buscar</button></div>
      </form>
      <div class="bible-font-controls" aria-label="Tamanho do texto">
        <span>Tamanho</span><button type="button" data-font="decrease" aria-label="Diminuir fonte">A−</button><button type="button" data-font="reset" aria-label="Restaurar fonte">A</button><button type="button" data-font="increase" aria-label="Aumentar fonte">A+</button>
      </div>
    </div>
    <p class="bible-search-status" id="bibleSearchStatus" aria-live="polite">Pesquise por referência, palavra ou expressão.</p>
    <div class="bible-search-results" id="bibleSearchResults" hidden></div>

    <div class="bible-testament-tabs" role="tablist" aria-label="Selecionar testamento">
      <button type="button" role="tab" data-testament="old" aria-selected="false">Antigo Testamento</button>
      <button type="button" role="tab" data-testament="new" aria-selected="true">Novo Testamento</button>
    </div>
    <button class="bible-books-toggle" id="bibleBooksToggle" type="button" aria-expanded="false" aria-controls="bibleSidebar">Escolher livro <span aria-hidden="true">⌄</span></button>
    <div class="bible-app">
      <aside class="bible-sidebar" id="bibleSidebar" aria-label="Livros da Bíblia">
        <div class="bible-testament" data-testament-panel="old"><h3>Antigo Testamento</h3><div class="bible-book-list" id="oldTestamentBooks"></div></div>
        <div class="bible-testament" data-testament-panel="new"><h3>Novo Testamento</h3><div class="bible-book-list" id="newTestamentBooks"></div></div>
      </aside>

      <div class="bible-reader" id="bibleReader" role="region" aria-label="Leitura bíblica">
        <div class="bible-reader-heading">
          <div><span id="bibleReaderTranslation">Almeida Histórica</span><h3 id="bibleReaderTitle">Carregando Bíblia...</h3></div>
          <button type="button" id="backToBooks">Voltar aos livros</button>
        </div>
        <div class="bible-chapters" id="bibleChapters" aria-label="Capítulos"></div>
        <div class="bible-chapter-nav" id="bibleChapterNav" hidden>
          <button type="button" id="previousChapter">← Capítulo anterior</button>
          <button type="button" id="nextChapter">Próximo capítulo →</button>
        </div>
        <div class="bible-pending" id="biblePendingState">
          <span aria-hidden="true">▤</span><h4>Carregando capítulo...</h4><p>Aguarde um instante.</p>
        </div>
        <article class="bible-api-chapter bible-local-chapter" id="bibleLocalChapter" hidden>
          <div class="bible-api-content" id="bibleLocalContent"></div>
          <footer class="bible-api-credits" id="bibleLocalCredits"></footer>
        </article>
      </div>
    </div>

    <div class="bible-lower-grid">
      <article class="daily-verse-card">
        <span class="bible-kicker">Leitura diária</span><h3>Versículo do Dia</h3>
        <strong id="dailyVerseReference">Carregando...</strong><p id="dailyVerseText"></p>
        <div class="verse-actions" id="dailyVerseActions"></div>
      </article>
      <section class="bible-favorites" aria-labelledby="favoritesTitle">
        <span class="bible-kicker">Salvos neste navegador</span><h3 id="favoritesTitle">Meus Versículos Favoritos</h3>
        <div id="bibleFavoritesList"></div>
      </section>
    </div>`;

  const anchor = document.getElementById('jejum21') || document.getElementById('agenda');
  anchor?.after(section);
})();
