const pastoraDirectory=document.querySelector('.pastora-directory');
if(pastoraDirectory){
  pastoraDirectory.innerHTML=`
    <span class="eyebrow">Discipuladoras e líderes</span>
    <h3>Estrutura de liderança da Pastora Joarla</h3>
    <p class="pastora-intro">Selecione uma discipuladora para visualizar sua equipe. Os nomes das líderes poderão ser preenchidos posteriormente.</p>
    <div class="leadership-filters pastora-filters" role="tablist" aria-label="Selecionar discipuladora">
      <button class="pastora-filter active" data-pastora="veronica">Verônica</button>
      <button class="pastora-filter" data-pastora="flavia">Flávia</button>
      <button class="pastora-filter" data-pastora="leliane">Leliane</button>
    </div>
    <div class="pastora-hierarchy">
      <article class="leadership-person discipleship-head" data-pastora-group="veronica"><span>VE</span><div><small>DISCIPULADORA</small><strong>Verônica</strong></div></article>
      <article class="leadership-person pending-leader" data-pastora-group="veronica"><span>＋</span><div><small>LÍDERES</small><strong>Nomes a adicionar</strong></div></article>
      <article class="leadership-person discipleship-head hidden" data-pastora-group="flavia"><span>FL</span><div><small>DISCIPULADORA</small><strong>Flávia</strong></div></article>
      <article class="leadership-person pending-leader hidden" data-pastora-group="flavia"><span>＋</span><div><small>LÍDERES</small><strong>Nomes a adicionar</strong></div></article>
      <article class="leadership-person discipleship-head hidden" data-pastora-group="leliane"><span>LE</span><div><small>DISCIPULADORA</small><strong>Leliane</strong></div></article>
      <article class="leadership-person pending-leader hidden" data-pastora-group="leliane"><span>＋</span><div><small>LÍDERES</small><strong>Nomes a adicionar</strong></div></article>
    </div>
    <p class="pastora-note">Os espaços vazios aguardam os nomes oficiais das líderes de cada discipuladora.</p>`;
  document.querySelectorAll('.pastora-filter').forEach(button=>button.addEventListener('click',()=>{
    document.querySelectorAll('.pastora-filter').forEach(item=>item.classList.remove('active'));
    button.classList.add('active');
    document.querySelectorAll('[data-pastora-group]').forEach(person=>person.classList.toggle('hidden',person.dataset.pastoraGroup!==button.dataset.pastora));
  }));
}
