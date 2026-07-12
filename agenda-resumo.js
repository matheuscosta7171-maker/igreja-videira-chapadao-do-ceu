const agendaTotal=document.querySelector('.annual-count strong');
if(agendaTotal)agendaTotal.textContent=Object.values(annualAgenda).reduce((total,events)=>total+events.length,0);
