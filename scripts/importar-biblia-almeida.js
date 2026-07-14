#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const projectRoot = path.resolve(__dirname, '..');
const outputRoot = path.join(projectRoot, 'data', 'biblia', 'almeida-historica');
const sourceArg = process.argv.find(argument => argument.startsWith('--source='));
const sourcePath = sourceArg ? path.resolve(sourceArg.slice('--source='.length)) : process.env.ALMEIDA_SOURCE_FILE;

if (!sourcePath || !fs.existsSync(sourcePath)) {
  console.error('Informe o HTML original com --source=C:\\caminho\\62383-h.htm ou ALMEIDA_SOURCE_FILE.');
  process.exit(1);
}

const books = [
  ['GEN','Gênesis','Gen','GEN',50,'Gn','antigo-testamento'],['EXO','Êxodo','Exo','EXO',40,'Êx','antigo-testamento'],['LEV','Levítico','Lev','LEV',27,'Lv','antigo-testamento'],['NUM','Números','Num','NUM',36,'Nm','antigo-testamento'],['DEU','Deuteronômio','Deu','DEU',34,'Dt','antigo-testamento'],['JOS','Josué','Jos','JOS',24,'Js','antigo-testamento'],['JDG','Juízes','Jui','JUI',21,'Jz','antigo-testamento'],['RUT','Rute','Ruth','RUTH',4,'Rt','antigo-testamento'],['1SA','1 Samuel','ISam','ISAM',31,'1Sm','antigo-testamento'],['2SA','2 Samuel','IISam','IISAM',24,'2Sm','antigo-testamento'],['1KI','1 Reis','IReis','IREIS',22,'1Rs','antigo-testamento'],['2KI','2 Reis','IIReis','IIREIS',25,'2Rs','antigo-testamento'],['1CH','1 Crônicas','IChr','ICHR',29,'1Cr','antigo-testamento'],['2CH','2 Crônicas','IIChr','IICHR',36,'2Cr','antigo-testamento'],['EZR','Esdras','Esd','ESD',10,'Ed','antigo-testamento'],['NEH','Neemias','Neh','NEH',13,'Ne','antigo-testamento'],['EST','Ester','Est','EST',10,'Et','antigo-testamento'],['JOB','Jó','Job','JOB',42,'Jó','antigo-testamento'],['PSA','Salmos','Psa','PSA',150,'Sl','antigo-testamento'],['PRO','Provérbios','Pro','PRO',31,'Pv','antigo-testamento'],['ECC','Eclesiastes','Ecc','ECC',12,'Ec','antigo-testamento'],['SNG','Cânticos','Can','CAN',8,'Ct','antigo-testamento'],['ISA','Isaías','Isa','ISA',66,'Is','antigo-testamento'],['JER','Jeremias','Jer','JER',52,'Jr','antigo-testamento'],['LAM','Lamentações','Lam','LAM',5,'Lm','antigo-testamento'],['EZK','Ezequiel','Eze','EZE',48,'Ez','antigo-testamento'],['DAN','Daniel','Dan','DAN',12,'Dn','antigo-testamento'],['HOS','Oséias','Ose','OSE',14,'Os','antigo-testamento'],['JOL','Joel','Joel','JOEL',3,'Jl','antigo-testamento'],['AMO','Amós','Amos','AMOS',9,'Am','antigo-testamento'],['OBA','Obadias','Oba','OBA',1,'Ob','antigo-testamento'],['JON','Jonas','Jon','JON',4,'Jn','antigo-testamento'],['MIC','Miqueias','Miq','MIQ',7,'Mq','antigo-testamento'],['NAM','Naum','Nah','NAH',3,'Na','antigo-testamento'],['HAB','Habacuque','Hab','HAB',3,'Hc','antigo-testamento'],['ZEP','Sofonias','Sof','SOF',3,'Sf','antigo-testamento'],['HAG','Ageu','Agg','AGG',2,'Ag','antigo-testamento'],['ZEC','Zacarias','Zac','ZAC',14,'Zc','antigo-testamento'],['MAL','Malaquias','Mal','MAL',4,'Ml','antigo-testamento'],
  ['MAT','Mateus','Mat','MAT',28,'Mt','novo-testamento'],['MRK','Marcos','Mar','MAR',16,'Mc','novo-testamento'],['LUK','Lucas','Luc','LUC',24,'Lc','novo-testamento'],['JHN','João','Joao','JOAO',21,'Jo','novo-testamento'],['ACT','Atos','Act','ACT',28,'At','novo-testamento'],['ROM','Romanos','Rom','ROM',16,'Rm','novo-testamento'],['1CO','1 Coríntios','ICor','ICOR',16,'1Co','novo-testamento'],['2CO','2 Coríntios','IICor','IICOR',13,'2Co','novo-testamento'],['GAL','Gálatas','Gal','GAL',6,'Gl','novo-testamento'],['EPH','Efésios','Eph','EPH',6,'Ef','novo-testamento'],['PHP','Filipenses','IPhi','IPHI',4,'Fp','novo-testamento'],['COL','Colossenses','Col','COL',4,'Cl','novo-testamento'],['1TH','1 Tessalonicenses','IThe','ITHE',5,'1Ts','novo-testamento'],['2TH','2 Tessalonicenses','IIThe','IITHE',3,'2Ts','novo-testamento'],['1TI','1 Timóteo','ITim','ITIM',6,'1Tm','novo-testamento'],['2TI','2 Timóteo','IITim','IITIM',4,'2Tm','novo-testamento'],['TIT','Tito','Tito','TITO',3,'Tt','novo-testamento'],['PHM','Filemom','IIPhi','IIPHI',1,'Fm','novo-testamento'],['HEB','Hebreus','Heb','HEB',13,'Hb','novo-testamento'],['JAS','Tiago','Thi','THI',5,'Tg','novo-testamento'],['1PE','1 Pedro','IPed','IPED',5,'1Pe','novo-testamento'],['2PE','2 Pedro','IIPed','IIPED',3,'2Pe','novo-testamento'],['1JN','1 João','IJoao','IJOAO',5,'1Jo','novo-testamento'],['2JN','2 João','IIJoao','IIJOAO',1,'2Jo','novo-testamento'],['3JN','3 João','IIIJoao','IIIJOAO',1,'3Jo','novo-testamento'],['JUD','Judas','Jud','JUD',1,'Jd','novo-testamento'],['REV','Apocalipse','Apo','APO',22,'Ap','novo-testamento']
].map(([id,nome,prefixo,sourceId,capitulos,abreviacao,pasta],index) => ({id,nome,prefixo,sourceId,capitulos,abreviacao,pasta,ordem:index+1,testamento:index<39?'Antigo Testamento':'Novo Testamento'}));

const html = fs.readFileSync(sourcePath, 'utf8').replace(/^\uFEFF/, '');
const checksum = crypto.createHash('sha256').update(html).digest('hex');

function decodeEntities(value) {
  const named = {amp:'&',lt:'<',gt:'>',quot:'"',apos:"'",nbsp:' ',mdash:'—',ndash:'–',hellip:'…',ldquo:'“',rdquo:'”',lsquo:'‘',rsquo:'’'};
  return value.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (match, entity) => {
    if (entity[0] === '#') {
      const hex = entity[1].toLowerCase() === 'x';
      const code = parseInt(entity.slice(hex ? 2 : 1), hex ? 16 : 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : match;
    }
    return named[entity.toLowerCase()] ?? match;
  });
}

function cleanVerse(fragment, verseNumber) {
  let value = fragment
    .replace(/<span\b[^>]*class="first"[^>]*>[\s\S]*?<\/span>/gi, '')
    .replace(/<a\b[^>]*class="fnanchor"[^>]*>[\s\S]*?<\/a>/gi, '')
    .replace(/<a\b[^>]*(?:name|id)="(?:FNanchor|ENanchor)[^"]*"[^>]*><\/a>/gi, '')
    .replace(/<span\b[^>]*class="pagenum"[^>]*>[\s\S]*?<\/span>/gi, '')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]+>/g, ' ');
  value = decodeEntities(value).replace(/\s+/g, ' ').trim();
  value = value.replace(new RegExp(`^${verseNumber}\\s+`), '').trim();
  return value;
}

const outputBooks = [];
const searchEntries = [];
const errors = [];
let totalChapters = 0;
let totalVerses = 0;

for (const book of books) {
  const chapterMap = {};
  const expression = new RegExp(`<p\\s+id="${book.prefixo}(\\d+)-(\\d+)"[^>]*>([\\s\\S]*?)<\\/p>`, 'g');
  let match;
  while ((match = expression.exec(html))) {
    const chapter = Number(match[1]);
    const verse = Number(match[2]);
    const text = cleanVerse(match[3], verse);
    chapterMap[chapter] ||= [];
    if (chapterMap[chapter].some(item => item.versiculo === verse)) errors.push(`${book.nome} ${chapter}:${verse} duplicado`);
    if (!text) errors.push(`${book.nome} ${chapter}:${verse} vazio`);
    if (text.includes('\uFFFD')) errors.push(`${book.nome} ${chapter}:${verse} contém caractere inválido`);
    if (/<[^>]+>|&(?:#\d+|#x[0-9a-f]+|[a-z]+);/i.test(text)) errors.push(`${book.nome} ${chapter}:${verse} contém marcação não convertida`);
    chapterMap[chapter].push({versiculo:verse,texto:text});
  }

  // A transcrição HTML original possui um único erro estrutural conhecido:
  // Oséias 11:5 está dentro do parágrafo marcado como 11:4. A regra abaixo
  // também detecta qualquer caso equivalente sem alterar ou modernizar o texto.
  Object.values(chapterMap).forEach(verses => {
    verses.sort((a,b)=>a.versiculo-b.versiculo);
    const highest = verses.at(-1)?.versiculo || 0;
    for (let number = 2; number <= highest; number += 1) {
      if (verses.some(item => item.versiculo === number)) continue;
      const previous = verses.find(item => item.versiculo === number - 1);
      if (!previous) continue;
      const marker = new RegExp(`\\s${number}\\s+`);
      const splitAt = previous.texto.search(marker);
      if (splitAt < 0) continue;
      const markerMatch = previous.texto.slice(splitAt).match(marker)[0];
      const recovered = previous.texto.slice(splitAt + markerMatch.length).trim();
      previous.texto = previous.texto.slice(0,splitAt).trim();
      verses.push({versiculo:number,texto:recovered});
      verses.sort((a,b)=>a.versiculo-b.versiculo);
    }
  });

  const chapterNumbers = Object.keys(chapterMap).map(Number).sort((a,b)=>a-b);
  if (chapterNumbers.length !== book.capitulos) errors.push(`${book.nome}: esperados ${book.capitulos} capítulos, encontrados ${chapterNumbers.length}`);
  for (let chapter = 1; chapter <= book.capitulos; chapter += 1) {
    const verses = chapterMap[chapter];
    if (!verses?.length) { errors.push(`${book.nome} ${chapter} ausente ou vazio`); continue; }
    verses.sort((a,b)=>a.versiculo-b.versiculo);
    verses.forEach((item,index) => {
      if (item.versiculo !== index + 1) errors.push(`${book.nome} ${chapter}: sequência interrompida em ${item.versiculo}`);
      searchEntries.push([book.id,chapter,item.versiculo,item.texto.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase(),item.texto.slice(0,180)]);
    });
    totalVerses += verses.length;
  }
  totalChapters += chapterNumbers.length;

  const payload = {
    id:book.id,nome:book.nome,testamento:book.testamento,abreviacao:book.abreviacao,ordem:book.ordem,
    capitulos:Object.fromEntries(chapterNumbers.map(number => [String(number),chapterMap[number]]))
  };
  outputBooks.push({id:book.id,nome:book.nome,abreviacao:book.abreviacao,testamento:book.testamento,pasta:book.pasta,capitulos:chapterNumbers.length,arquivo:`${book.pasta}/${book.id}.json`});
  fs.mkdirSync(path.join(outputRoot,book.pasta),{recursive:true});
  fs.writeFileSync(path.join(outputRoot,book.pasta,`${book.id}.json`),JSON.stringify(payload), 'utf8');
}

if (outputBooks.length !== 66) errors.push(`Esperados 66 livros, encontrados ${outputBooks.length}`);
if (outputBooks.filter(book=>book.testamento==='Antigo Testamento').length !== 39) errors.push('Quantidade inválida de livros no Antigo Testamento');
if (outputBooks.filter(book=>book.testamento==='Novo Testamento').length !== 27) errors.push('Quantidade inválida de livros no Novo Testamento');
if (totalChapters !== 1189) errors.push(`Esperados 1.189 capítulos, encontrados ${totalChapters}`);

const manifest = {
  traducao:'Almeida Histórica',abreviacao:'AH',tituloOriginal:'A Biblia Sagrada, Contendo o Velho e o Novo Testamento',
  tradutor:'João Ferreira d’Almeida (1628–1691)',edicao:'Edição Revista e Corrigida, Lisboa, 1911; primeira edição, 1900',idioma:'Português histórico',
  fonte:'Project Gutenberg, eBook nº 62383',urlFonte:'https://www.gutenberg.org/ebooks/62383',
  licenca:'Domínio público nos EUA conforme o Project Gutenberg; no Brasil, prazo patrimonial expirado conforme arts. 41 e 45 da Lei 9.610/1998.',
  atribuicao:'A atribuição ao Project Gutenberg não é exigida para uso não comercial, mas é mantida por transparência e rastreabilidade.',
  dataImportacao:'2026-07-14',arquivoFonteSha256:checksum,quantidadeLivros:outputBooks.length,quantidadeCapitulos:totalChapters,quantidadeVersiculos:totalVerses,
  livrosAntigoTestamento:39,livrosNovoTestamento:27,livros:outputBooks
};

fs.mkdirSync(outputRoot,{recursive:true});
fs.writeFileSync(path.join(outputRoot,'manifest.json'),JSON.stringify(manifest,null,2),'utf8');
fs.writeFileSync(path.join(outputRoot,'search-index.json'),JSON.stringify({traducao:'Almeida Histórica',campos:['livro','capitulo','versiculo','textoNormalizado','trecho'],entradas:searchEntries}),'utf8');

const report = `# Relatório de importação — Almeida Histórica\n\n`+
`- Fonte: Project Gutenberg, eBook nº 62383\n- URL: https://www.gutenberg.org/ebooks/62383\n- Obra: *A Biblia Sagrada, Contendo o Velho e o Novo Testamento*\n- Tradutor: João Ferreira d’Almeida (1628–1691)\n- Edição: Edição Revista e Corrigida, Lisboa, 1911; primeira edição, 1900\n- Situação: domínio público nos EUA segundo o Project Gutenberg; prazo patrimonial expirado no Brasil conforme arts. 41 e 45 da Lei 9.610/1998.\n- SHA-256 do HTML original: \`${checksum}\`\n\n`+
`## Validação\n\n- Livros encontrados: ${outputBooks.length}/66\n- Livros ausentes: ${outputBooks.length===66?'nenhum':'ver erros abaixo'}\n- Antigo Testamento: ${outputBooks.filter(book=>book.testamento==='Antigo Testamento').length}/39\n- Novo Testamento: ${outputBooks.filter(book=>book.testamento==='Novo Testamento').length}/27\n- Capítulos encontrados: ${totalChapters}/1.189\n- Versículos encontrados: ${totalVerses}\n- Erros encontrados: ${errors.length}\n- Resultado final: **${errors.length?'REPROVADO':'APROVADO'}**\n\n`+
`## Erros\n\n${errors.length?errors.map(error=>`- ${error}`).join('\n'):'Nenhum erro estrutural encontrado.'}\n`;
fs.writeFileSync(path.join(projectRoot,'BIBLE-IMPORT-REPORT.md'),report,'utf8');

console.log(JSON.stringify({livros:outputBooks.length,capitulos:totalChapters,versiculos:totalVerses,erros:errors.length,sha256:checksum},null,2));
if (errors.length) process.exit(2);
