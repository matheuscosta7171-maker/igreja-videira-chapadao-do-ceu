const homeHighlights=[
  {title:'Vigília Radical',description:'Uma noite de busca, oração e comunhão para os jovens Radicais Livres.',image:'assets/images/destaques/vigilia-radical.jpg',alt:'Arte de divulgação da Vigília Radical',date:'',time:'',address:'',link:''},
  {title:'Projeto MT28',description:'Treinando crianças, fortalecendo sua fé e preparando uma geração comprometida com o Evangelho.',image:'assets/images/destaques/mt28.jpg',alt:'Arte de apresentação do Projeto MT28',date:'',time:'',address:'',link:''},
  {title:'21 Dias de Jejum e Oração',description:'Um tempo de consagração, crescimento espiritual e transmissão da graça.',image:'assets/images/destaques/jejum-21-dias.jpg',alt:'Arte dos 21 Dias de Jejum e Oração - Transmitindo Graça',date:'',time:'',address:'',link:''},
  {title:'Conferência de Mulheres',description:'Chamadas para multiplicar, servir e cumprir o propósito de Deus.',image:'assets/images/destaques/conferencia-mulheres.jpeg',alt:'Arte da Conferência de Mulheres - Chamadas para Multiplicar',date:'',time:'',address:'',link:''},
  {title:'Retiro RL Camp 2.0',description:'Três dias de comunhão, transformação e experiências com Deus.',image:'assets/images/destaques/retiro-rl-camp.jpeg',alt:'Arte do Retiro RL Camp 2.0',date:'',time:'',address:'',link:''},
  {title:'Assados da Videira',description:'Reserve seu frango ou costela assada e participe desta ação da igreja.',image:'assets/images/destaques/assados-videira.jpg',alt:'Arte da ação Assados da Videira',date:'',time:'',address:'',link:''}
];

const weeklyMeetings=[
  {day:'Quarta-feira',title:'Células',time:'19h30',description:'Encontros nos lares para comunhão, Palavra e crescimento espiritual.',icon:'⌂'},
  {day:'Quinta-feira',title:'Vigília',time:'Consulte a programação',description:'Um tempo de oração, busca e fortalecimento espiritual.',icon:'✦'},
  {day:'Sábado',title:'Célula de Jovens',time:'Consulte a programação',description:'Um encontro de jovens para comunhão, Palavra e crescimento espiritual.',icon:'◎'},
  {day:'Domingo',title:'Culto de Celebração',time:'18h30',description:'Um culto para toda a família, com louvor, Palavra e comunhão.',icon:'♡'}
];

const carouselTrack=document.getElementById('carouselTrack');
const carouselDots=document.getElementById('carouselDots');
const carouselList=document.getElementById('carouselNewsList');
const carouselRoot=document.getElementById('highlightCarousel');
const reduceMotion=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
let activeHighlight=0;
let carouselTimer;
let touchStartX=0;

function highlightDetails(item){
  const details=[item.date,item.time,item.address].filter(Boolean);
  return details.length?`<small class="slide-details">${details.join(' • ')}</small>`:'';
}

function renderHighlights(){
  if(!carouselTrack||!carouselDots||!carouselList)return;
  carouselTrack.innerHTML=homeHighlights.map((item,index)=>`<article class="carousel-slide" aria-hidden="${index!==0}"><img class="slide-backdrop" src="${item.image}" alt="" aria-hidden="true"><img class="slide-image" src="${item.image}" alt="${item.alt}"><div class="slide-copy"><span>Destaque da semana</span><h2>${item.title}</h2><p>${item.description}</p>${highlightDetails(item)}${item.link?`<a class="home-button home-button-light" href="${item.link}">Saiba mais</a>`:''}</div></article>`).join('');
  carouselDots.innerHTML=homeHighlights.map((item,index)=>`<button class="carousel-dot${index===0?' active':''}" type="button" data-slide="${index}" aria-label="Mostrar destaque: ${item.title}" aria-current="${index===0?'true':'false'}"></button>`).join('');
  carouselList.innerHTML='<div class="carousel-news-title">Em destaque</div>'+homeHighlights.map((item,index)=>`<button class="carousel-news-button${index===0?' active':''}" type="button" data-slide="${index}"><b>${String(index+1).padStart(2,'0')}</b><span>${item.title}</span></button>`).join('');
}

function showHighlight(index,userInitiated=false){
  activeHighlight=(index+homeHighlights.length)%homeHighlights.length;
  carouselTrack.style.transform=`translateX(-${activeHighlight*100}%)`;
  carouselTrack.querySelectorAll('.carousel-slide').forEach((slide,i)=>slide.setAttribute('aria-hidden',String(i!==activeHighlight)));
  document.querySelectorAll('[data-slide]').forEach(control=>{const selected=Number(control.dataset.slide)===activeHighlight;control.classList.toggle('active',selected);if(control.classList.contains('carousel-dot'))control.setAttribute('aria-current',String(selected))});
  document.getElementById('carouselStatus').textContent=`Destaque ${activeHighlight+1} de ${homeHighlights.length}: ${homeHighlights[activeHighlight].title}`;
  if(userInitiated)restartCarousel();
}

function stopCarousel(){clearInterval(carouselTimer)}
function startCarousel(){stopCarousel();carouselTimer=setInterval(()=>showHighlight(activeHighlight+1),5000)}
function restartCarousel(){stopCarousel();startCarousel()}

renderHighlights();
carouselRoot?.querySelector('.carousel-prev').addEventListener('click',()=>showHighlight(activeHighlight-1,true));
carouselRoot?.querySelector('.carousel-next').addEventListener('click',()=>showHighlight(activeHighlight+1,true));
carouselDots?.addEventListener('click',event=>{const button=event.target.closest('[data-slide]');if(button)showHighlight(Number(button.dataset.slide),true)});
carouselList?.addEventListener('click',event=>{const button=event.target.closest('[data-slide]');if(button)showHighlight(Number(button.dataset.slide),true)});
carouselRoot?.addEventListener('mouseenter',stopCarousel);
carouselRoot?.addEventListener('mouseleave',startCarousel);
carouselRoot?.addEventListener('focusin',stopCarousel);
carouselRoot?.addEventListener('focusout',startCarousel);
carouselRoot?.addEventListener('touchstart',event=>{touchStartX=event.changedTouches[0].clientX;stopCarousel()},{passive:true});
carouselRoot?.addEventListener('touchend',event=>{const distance=event.changedTouches[0].clientX-touchStartX;if(Math.abs(distance)>45)showHighlight(activeHighlight+(distance<0?1:-1),true);else startCarousel()},{passive:true});
document.addEventListener('visibilitychange',()=>document.hidden?stopCarousel():startCarousel());
startCarousel();

const meetingsContainer=document.getElementById('weeklyMeetings');
if(meetingsContainer)meetingsContainer.innerHTML=weeklyMeetings.map(item=>`<article class="meeting-card home-reveal"><span class="meeting-icon" aria-hidden="true">${item.icon}</span><span class="meeting-day">${item.day}</span><h3>${item.title}</h3><strong class="meeting-time">${item.time}</strong><p>${item.description}</p>${item.link?`<a class="meeting-link" href="${item.link}">${item.linkLabel} →</a>`:''}</article>`).join('');

if(!reduceMotion&&'IntersectionObserver'in window){
  document.body.classList.add('home-motion-ready');
  const revealObserver=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add('is-visible');revealObserver.unobserve(entry.target)}}),{threshold:.12});
  document.querySelectorAll('.home-reveal').forEach(element=>revealObserver.observe(element));
}else document.querySelectorAll('.home-reveal').forEach(element=>element.classList.add('is-visible'));
