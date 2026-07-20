import assert from 'node:assert/strict';
import {readFile,readdir,stat} from 'node:fs/promises';
import path from 'node:path';

const root=path.resolve(import.meta.dirname,'..');
const read=name=>readFile(path.join(root,name),'utf8');
const [html,app,css,migration,worker,env]=await Promise.all([
  read('index.html'),read('management-app.js'),read('management-app.css'),
  read('supabase/migrations/2026_07_20_sistema_gestao_igreja.sql'),read('service-worker.js'),read('.env.example')
]);

for(const required of ['Pedidos de Oração','Agendar Visita Pastoral','Dízimos e Ofertas','Construção do Nosso Prédio','Onde Estamos','Relatório da Célula'])assert.ok(app.includes(required),`Área ausente: ${required}`);
for(const role of ['superadmin','admin','pastor','leader','member'])assert.ok(migration.includes(`'${role}'`),`Perfil ausente: ${role}`);
for(const table of ['profiles','user_roles','cells','leader_cells','cell_reports','prayer_requests','pastoral_visits','notifications','testimonies','audit_logs'])assert.match(migration,new RegExp(`create table if not exists public\\.${table}`),`Tabela ausente: ${table}`);
assert.ok(migration.includes('enable row level security'),'RLS não configurado');
assert.ok(app.includes('encodeURIComponent(full)'),'Endereço do mapa não codificado');
assert.ok(app.includes('target="_blank"')||app.includes('open.target = "_blank"'),'Links externos não preparados');
assert.ok(app.includes('contact_consent'),'Consentimento de visita ausente');
assert.ok(worker.includes("authorization"),'Service worker não protege requisições autenticadas');
assert.ok(css.includes('@media')&&css.includes('800px'),'Layout móvel ausente');
assert.ok(env.includes('WHATSAPP_ACCESS_TOKEN=')&&!env.match(/WHATSAPP_ACCESS_TOKEN=\S+/),'Exemplo contém secret');
assert.ok(!migration.match(/service_role|sb_secret_/i),'Secret encontrado na migração');
assert.ok(html.includes('bible-local.js'),'Bíblia local não preservada');
assert.ok(html.includes('agenda2026.js')&&html.includes('jejum-grupos.js'),'Funcionalidades existentes não preservadas');

const assetMatches=[...html.matchAll(/(?:src|href)="([^"#]+)"/g)].map(match=>match[1]).filter(value=>!value.startsWith('http')&&!value.startsWith('mailto:'));
for(const asset of new Set(assetMatches)){const clean=asset.split('?')[0];if(!clean||clean==='./')continue;await stat(path.join(root,clean)).catch(()=>{throw new Error(`Arquivo referenciado não existe: ${clean}`)})}

const bibleFiles=await readdir(path.join(root,'data','biblia','almeida-historica','novo-testamento'));
assert.ok(bibleFiles.includes('JHN.json'),'Bíblia local perdeu João');
console.log('OK — estrutura, segurança, áreas públicas/privadas, responsividade, PWA e arquivos existentes validados.');
