// Preencha somente com números no formato DDD + número. Ex.: 64999999999.
const leaderPhones={
  'Matheus Costa':'','Matheus Victor':'','Daniel':'','Isadora':'',
  'Klebson':'','Rhayngrid':'','Wiliane':'',
  'Antônio':'','Humberto':'','José Nivolan':'','Elimar':'',
  'Edson':'','Messias':'','Enio':'','Celio':''
};
document.querySelectorAll('#celulas .leader-card').forEach(card=>{
  const name=card.querySelector('h3')?.textContent.trim();if(!name)return;
  const number=(leaderPhones[name]||'').replace(/\D/g,'');
  const contact=document.createElement(number?'a':'span');
  contact.className='leader-whatsapp'+(number?'':' pending');
  if(number){contact.href=`https://wa.me/55${number}?text=${encodeURIComponent(`Olá, ${name}! Encontrei sua célula no site da Igreja Videira.`)}`;contact.target='_blank';contact.rel='noopener';contact.setAttribute('aria-label',`Conversar com ${name} pelo WhatsApp`);contact.innerHTML=`<b>WhatsApp</b><small>+55 ${number}</small>`}
  else{contact.innerHTML='<b>WhatsApp</b><small>Número a adicionar</small>'}
  card.appendChild(contact);
});
