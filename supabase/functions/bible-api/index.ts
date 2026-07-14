const allowedOrigins = new Set([
  'https://matheuscosta7171-maker.github.io',
  'http://localhost:8080',
  'http://127.0.0.1:8080'
]);
const rateWindowMs = 60_000;
const rateLimit = 60;
const requestsByClient = new Map<string,{count:number;reset:number}>();
const actions = new Set(['bibles','books','chapters','chapter','verses','verse','passage','search']);
const safeId = /^[A-Za-z0-9._:-]{1,100}$/;
const safeBook = /^[A-Za-z0-9]{2,10}$/;

function corsHeaders(request:Request) {
  const origin=request.headers.get('origin')||'';
  const allowed=allowedOrigins.has(origin)||/^http:\/\/localhost:\d+$/.test(origin)||/^http:\/\/127\.0\.0\.1:\d+$/.test(origin);
  return {
    'Access-Control-Allow-Origin':allowed?origin:'https://matheuscosta7171-maker.github.io',
    'Access-Control-Allow-Headers':'authorization, apikey, content-type, x-client-info',
    'Access-Control-Allow-Methods':'GET, POST, OPTIONS',
    'Vary':'Origin',
    'Content-Type':'application/json; charset=utf-8'
  };
}

function response(request:Request,body:unknown,status=200,cache='no-store') {
  return new Response(JSON.stringify(body),{status,headers:{...corsHeaders(request),'Cache-Control':cache}});
}

function fail(code:string,message:string,status=400):never {
  throw Object.assign(new Error(message),{code,status});
}

function validateInput(input:Record<string,unknown>) {
  const action=String(input.action||'');
  if(!actions.has(action))fail('INVALID_ACTION','Ação não permitida.',400);
  const bibleId=input.bibleId==null?'':String(input.bibleId);
  const bookId=input.bookId==null?'':String(input.bookId);
  const chapterId=input.chapterId==null?'':String(input.chapterId);
  const verseId=input.verseId==null?'':String(input.verseId);
  const reference=input.reference==null?'':String(input.reference);
  const query=input.query==null?'':String(input.query).trim();
  if(action!=='bibles'&&!safeId.test(bibleId))fail('INVALID_BIBLE','Tradução inválida.',400);
  if(action==='chapters'&&!safeBook.test(bookId))fail('INVALID_BOOK','Livro inválido.',400);
  if(action==='chapter'&&!safeId.test(chapterId))fail('INVALID_CHAPTER','Capítulo inválido.',400);
  if(action==='verses'&&!safeId.test(chapterId))fail('INVALID_CHAPTER','Capítulo inválido.',400);
  if(action==='verse'&&!safeId.test(verseId))fail('INVALID_VERSE','Versículo inválido.',400);
  if(action==='passage'&&(!reference||reference.length>100||/[<>\u0000-\u001f]/.test(reference)))fail('INVALID_REFERENCE','Referência inválida.',400);
  if(action==='search'&&(!query||query.length>100||/[<>\u0000-\u001f]/.test(query)))fail('INVALID_QUERY','Pesquisa inválida.',400);
  return {action,bibleId,bookId,chapterId,verseId,reference,query};
}

function enforceRateLimit(request:Request) {
  const client=request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()||'unknown';
  const now=Date.now();
  const current=requestsByClient.get(client);
  if(!current||current.reset<=now){requestsByClient.set(client,{count:1,reset:now+rateWindowMs});return}
  current.count+=1;
  if(current.count>rateLimit)fail('RATE_LIMIT','Muitas solicitações. Aguarde um minuto.',429);
}

async function upstream(url:string,headers:Record<string,string>) {
  const controller=new AbortController();
  const timeout=setTimeout(()=>controller.abort(),10_000);
  try{
    const result=await fetch(url,{headers,signal:controller.signal});
    const payload=await result.json().catch(()=>({}));
    if(!result.ok){
      if(result.status===401||result.status===403)fail('UNAUTHORIZED_TRANSLATION','A chave não autoriza esta tradução.',403);
      if(result.status===404)fail('NOT_FOUND','Conteúdo bíblico não encontrado.',404);
      if(result.status===429)fail('UPSTREAM_LIMIT','Limite temporário da API atingido.',429);
      fail('UPSTREAM_ERROR','A API bíblica não respondeu corretamente.',502);
    }
    return payload;
  }catch(error){
    if((error as {code?:string}).code)throw error;
    fail('CONNECTION_ERROR','Não foi possível consultar a API bíblica.',502);
  }finally{clearTimeout(timeout)}
}

function list(value:any){return Array.isArray(value)?value:Array.isArray(value?.data)?value.data:[]}
function normalizeBibles(raw:any,provider:string){
  return list(raw).map((item:any)=>({
    id:String(item.id??item.version_id??''),
    abbreviation:String(item.abbreviation??item.abbreviated_title??''),
    name:String(item.name??item.title??item.nameLocal??''),
    languageCode:String(item.language?.id??item.language?.iso_639_1??item.language?.iso_639_3??''),
    languageName:String(item.language?.nameLocal??item.language?.name??''),
    description:String(item.description??item.descriptionLocal??''),
    copyright:String(item.copyright??''),
    provider
  })).filter((item:any)=>item.id&&item.name);
}
function normalizeBooks(raw:any){
  return list(raw).map((item:any)=>({
    id:String(item.id??item.usfm??''),
    code:String(item.usfm??item.id??''),
    name:String(item.name??item.title??item.nameLong??''),
    nameLong:String(item.nameLong??item.name??item.title??''),
    chapters:list(item.chapters).map((chapter:any)=>({id:String(chapter.id??chapter.number??''),number:String(chapter.number??'')}))
  })).filter((item:any)=>item.id);
}
function normalizeChapters(raw:any){
  return list(raw).map((item:any)=>({id:String(item.id??item.number??''),number:String(item.number??''),bookId:String(item.bookId??item.book_usfm??''),reference:String(item.reference??'')})).filter((item:any)=>item.id);
}

async function apiBible(input:ReturnType<typeof validateInput>,key:string){
  const base='https://rest.api.bible/v1';
  const headers={'api-key':key,'Accept':'application/json'};
  const bible=encodeURIComponent(input.bibleId),book=encodeURIComponent(input.bookId);
  if(input.action==='bibles')return {provider:'api_bible',bibles:normalizeBibles(await upstream(`${base}/bibles?language=por&include-full-details=true`,headers),'api_bible')};
  if(input.action==='books')return {provider:'api_bible',books:normalizeBooks(await upstream(`${base}/bibles/${bible}/books?include-chapters=true`,headers))};
  if(input.action==='chapters')return {provider:'api_bible',chapters:normalizeChapters(await upstream(`${base}/bibles/${bible}/books/${book}/chapters`,headers))};
  if(input.action==='chapter'){
    const raw=await upstream(`${base}/bibles/${bible}/chapters/${encodeURIComponent(input.chapterId)}?content-type=html&include-notes=false&include-titles=true&include-chapter-numbers=false&include-verse-numbers=true&include-verse-spans=true&fums-version=3`,headers);
    const data=raw?.data??raw;
    return {provider:'api_bible',fumsToken:String(raw?.meta?.fumsToken??''),chapter:{id:String(data.id??input.chapterId),bookId:String(data.bookId??input.bookId),number:String(data.number??input.chapterId.split('.').pop()??''),reference:String(data.reference??''),contentType:'html',content:String(data.content??''),copyright:String(data.copyright??''),next:data.next??null,previous:data.previous??null,attribution:'Conteúdo bíblico fornecido por API.Bible.',attributionUrl:'https://api.bible/'}};
  }
  if(input.action==='verses'){
    const raw=await upstream(`${base}/bibles/${bible}/chapters/${encodeURIComponent(input.chapterId)}/verses?fums-version=3`,headers);
    return {provider:'api_bible',fumsToken:String(raw?.meta?.fumsToken??''),verses:list(raw).map((verse:any)=>({id:String(verse.id??''),bookId:String(verse.bookId??''),chapterId:String(verse.chapterId??input.chapterId),reference:String(verse.reference??'')}))};
  }
  if(input.action==='verse'){
    const raw=await upstream(`${base}/bibles/${bible}/verses/${encodeURIComponent(input.verseId)}?content-type=html&include-notes=false&include-titles=true&include-verse-numbers=true&include-verse-spans=true&fums-version=3`,headers);
    const data=raw?.data??raw;
    return {provider:'api_bible',fumsToken:String(raw?.meta?.fumsToken??''),verse:{id:String(data.id??input.verseId),bookId:String(data.bookId??''),chapterId:String(data.chapterId??''),reference:String(data.reference??''),contentType:'html',content:String(data.content??''),copyright:String(data.copyright??''),attribution:'Conteúdo bíblico fornecido por API.Bible.',attributionUrl:'https://api.bible/'}};
  }
  if(input.action==='passage'){
    const raw=await upstream(`${base}/bibles/${bible}/passages/${encodeURIComponent(input.reference)}?content-type=html&include-notes=false&include-titles=true&include-chapter-numbers=false&include-verse-numbers=true&include-verse-spans=true&fums-version=3`,headers);
    const data=raw?.data??raw;
    return {provider:'api_bible',fumsToken:String(raw?.meta?.fumsToken??''),passage:{reference:String(data.reference??input.reference),content:String(data.content??''),copyright:String(data.copyright??''),attribution:'Conteúdo bíblico fornecido por API.Bible.',attributionUrl:'https://api.bible/'}};
  }
  const raw=await upstream(`${base}/bibles/${bible}/search?query=${encodeURIComponent(input.query)}&limit=20&offset=0&fums-version=3`,headers);
  const data=raw?.data??raw;
  const results=[...(Array.isArray(data?.verses)?data.verses:[]),...(Array.isArray(data?.passages)?data.passages:[])].map((item:any)=>({id:String(item.id??''),bookId:String(item.bookId??''),chapterId:String(item.chapterId??item.id?.split('.').slice(0,2).join('.')??''),reference:String(item.reference??''),text:String(item.text??item.content??'')}));
  return {provider:'api_bible',fumsToken:String(raw?.meta?.fumsToken??''),query:input.query,results,copyright:String(data?.copyright??'')};
}

Deno.serve(async(request:Request)=>{
  if(request.method==='OPTIONS')return new Response(null,{status:204,headers:corsHeaders(request)});
  if(!['GET','POST'].includes(request.method))return response(request,{error:{code:'METHOD_NOT_ALLOWED',message:'Método não permitido.'}},405);
  try{
    enforceRateLimit(request);
    const input=request.method==='GET'?Object.fromEntries(new URL(request.url).searchParams):await request.json();
    if(!input||typeof input!=='object'||Array.isArray(input))fail('INVALID_REQUEST','Solicitação inválida.',400);
    const validated=validateInput(input as Record<string,unknown>);
    const key=Deno.env.get('API_BIBLE_KEY');
    if(!key)fail('NOT_CONFIGURED','A chave oficial da Bíblia ainda não foi cadastrada.',503);
    const result=await apiBible(validated,key);
    return response(request,result,200,validated.action==='bibles'||validated.action==='books'||validated.action==='chapters'?'private, max-age=300':'no-store');
  }catch(error){
    const known=error as {code?:string;status?:number;message?:string};
    return response(request,{error:{code:known.code||'INTERNAL_ERROR',message:known.message||'Erro interno.'}},known.status||500);
  }
});
