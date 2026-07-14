const whatsappLeaders={
  'matheus-costa':{name:'Matheus Costa',whatsapp:'5564999774263'},
  'matheus-victor':{name:'Matheus Victor',whatsapp:'5564999551166'},
  'daniel':{name:'Daniel',whatsapp:'5564999829078'}
};

const whatsappIcon='<svg viewBox="0 0 32 32" aria-hidden="true"><path fill="currentColor" d="M16 3a12 12 0 0 0-10.4 18l-1.7 6.2 6.4-1.7A12 12 0 1 0 16 3Zm0 21.8c-1.9 0-3.6-.5-5.1-1.4l-.4-.2-3.8 1 1-3.7-.2-.4A9.7 9.7 0 1 1 16 24.8Zm5.3-7.3c-.3-.1-1.7-.8-2-.9-.3-.1-.5-.1-.7.2l-.9 1.1c-.2.2-.3.2-.6.1-1.8-.7-3.1-2-4-3.6-.2-.3 0-.5.1-.6l.6-.7c.2-.2.2-.4.3-.6 0-.2 0-.4-.1-.6l-.9-2.1c-.2-.5-.5-.5-.7-.5h-.6c-.2 0-.6.1-.9.4-.3.3-1.2 1.2-1.2 2.9s1.2 3.3 1.4 3.5c.2.2 2.4 3.7 5.9 5.1.8.4 1.5.6 2 .7.9.3 1.7.2 2.3.1.7-.1 2-1 2.3-1.6.3-.6.3-1.2.2-1.3-.1-.1-.3-.2-.6-.3Z"/></svg>';

document.querySelectorAll('#celulas .leader-card[data-leader-id]').forEach(card=>{
  const leader=whatsappLeaders[card.dataset.leaderId];
  if(!leader)return;
  const message=`Olá, ${leader.name}! Encontrei seu contato pelo site da Igreja Videira e gostaria de saber mais sobre a célula.`;
  const contact=document.createElement('a');
  contact.className='leader-whatsapp';
  contact.href=`https://wa.me/${leader.whatsapp}?text=${encodeURIComponent(message)}`;
  contact.target='_blank';
  contact.rel='noopener noreferrer';
  contact.setAttribute('aria-label',`Falar com ${leader.name} pelo WhatsApp`);
  contact.innerHTML=`${whatsappIcon}<span>Falar com o líder</span>`;
  card.appendChild(contact);
});
