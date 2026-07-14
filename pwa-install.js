(()=>{
  if('serviceWorker'in navigator){
    window.addEventListener('load',()=>navigator.serviceWorker.register('./service-worker.js').catch(()=>{}));
  }

  const isMobile=matchMedia('(max-width: 699px)').matches;
  const isStandalone=matchMedia('(display-mode: standalone)').matches||window.navigator.standalone===true;
  const dismissedAt=Number(localStorage.getItem('videira-install-dismissed')||0);
  const dismissalExpired=Date.now()-dismissedAt>14*24*60*60*1000;
  if(!isMobile||isStandalone||!dismissalExpired)return;

  let installPrompt=null;
  const isIos=/iphone|ipad|ipod/i.test(navigator.userAgent);
  const card=document.createElement('aside');
  card.className='install-app-card';
  card.hidden=true;
  card.setAttribute('role','dialog');
  card.setAttribute('aria-labelledby','installAppTitle');
  card.innerHTML=`
    <button class="install-app-close" type="button" aria-label="Fechar instruções de instalação">×</button>
    <div class="install-app-header">
      <img class="install-app-logo" src="logo-videira.png" alt="" />
      <div><h2 id="installAppTitle">Instalar Igreja Videira</h2><p>Adicione o site à sua tela inicial</p></div>
    </div>
    <ol class="install-app-steps"></ol>
    <button class="install-app-action" type="button">${isIos?'Entendi':'Instalar aplicativo'}</button>`;
  document.body.appendChild(card);

  const steps=card.querySelector('.install-app-steps');
  const action=card.querySelector('.install-app-action');
  const close=card.querySelector('.install-app-close');
  const show=()=>{card.hidden=false;};
  const dismiss=()=>{
    card.hidden=true;
    localStorage.setItem('videira-install-dismissed',String(Date.now()));
  };

  if(isIos){
    steps.innerHTML=`
      <li class="install-app-step"><b>1</b><span><strong>Toque em Compartilhar</strong><small>Use o ícone de compartilhar na barra do Safari.</small></span></li>
      <li class="install-app-step"><b>2</b><span><strong>Escolha “Adicionar à Tela de Início”</strong><small>Role o menu até encontrar essa opção.</small></span></li>
      <li class="install-app-step"><b>3</b><span><strong>Confirme em “Adicionar”</strong><small>O ícone da Igreja Videira aparecerá no seu telefone.</small></span></li>`;
    action.addEventListener('click',dismiss);
    setTimeout(show,1800);
  }else{
    steps.innerHTML=`<li class="install-app-step"><b>1</b><span><strong>Tenha a Igreja Videira sempre por perto</strong><small>Acesse a programação e a Bíblia direto pela tela inicial do telefone.</small></span></li>`;
    action.disabled=true;
    action.textContent='Preparando instalação…';
    window.addEventListener('beforeinstallprompt',event=>{
      event.preventDefault();
      installPrompt=event;
      action.disabled=false;
      action.textContent='Instalar aplicativo';
      show();
    });
    setTimeout(()=>{
      if(installPrompt||!card.hidden)return;
      steps.innerHTML=`
        <li class="install-app-step"><b>1</b><span><strong>Abra o menu do navegador</strong><small>Toque nos três pontos no canto da tela.</small></span></li>
        <li class="install-app-step"><b>2</b><span><strong>Escolha “Adicionar à tela inicial”</strong><small>Confirme para criar o ícone da Igreja Videira.</small></span></li>`;
      action.disabled=false;
      action.textContent='Entendi';
      show();
    },2500);
    action.addEventListener('click',async()=>{
      if(!installPrompt){dismiss();return;}
      installPrompt.prompt();
      await installPrompt.userChoice;
      installPrompt=null;
      dismiss();
    });
  }
  close.addEventListener('click',dismiss);
})();
