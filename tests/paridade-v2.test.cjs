const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const esbuild=require('esbuild'),React=require('react');
const {renderToStaticMarkup}=require('react-dom/server');
const root=path.resolve(__dirname,'..');
function load(file,mocks={}) {
 const exports={};const mod={exports};const code=esbuild.transformSync(fs.readFileSync(path.join(root,file),'utf8'),{loader:file.endsWith('tsx')?'tsx':'ts',format:'cjs',jsx:'automatic'}).code;
 const req=id=>{if(id in mocks)return mocks[id];if(id.endsWith('.module.css'))return {};if(id==='next/link')return {__esModule:true,default:({children,...p})=>React.createElement('a',p,children)};if(id==='next/image')return {__esModule:true,default:({unoptimized,...p})=>React.createElement('img',p)};if(id==='next/navigation')return {redirect:()=>{throw Error('redirect')},notFound:()=>{throw Error('notFound')}};if(id.startsWith('@/'))return load('src/'+id.slice(2)+'.ts',mocks);throw Error('Import não simulado: '+id)};
 vm.runInNewContext('(function(require,module,exports){'+code+'})',{console,Date,Set,Map,URL,Number,process,fetch:()=>{throw Error('Rede proibida no teste')},Buffer})(id=>id==='react/jsx-runtime'?require(id):req(id),mod,exports);
 return mod.exports;
}
const response={NextResponse:{json:(body,opts={})=>({status:opts.status||200,body})}};
const scope={empresaId:'e1',isAdmin:false,professoraId:'p1',userId:'u1',perfil:'PROFESSORA'};
const baseMocks={'next/server':response,'@/lib/tenant':{getSessionScope:async()=>scope}};
test('A01: provas próximas respeitam 7 e 15 dias e empresa do professor',async()=>{
 for(const prazo of [7,15]){let where;const prisma={empresa:{findUnique:async()=>({prazoAlertaProvaDias:prazo})},aluno:{findMany:async q=>{assert.equal(q.where.empresaId,'e1');assert.equal(q.where.professoraId,'p1');return [{unidadeId:'u1',serie:'2º ano'}]}},avaliacao:{findMany:async q=>{where=q.where;return []}}};
 const api=load('src/app/api/provas-proximas/route.ts',{...baseMocks,'@/lib/prisma':{prisma}});assert.equal((await api.GET({url:'http://test/api/provas-proximas?professoraId=outro'})).status,200);const d=new Date(where.data.gte);d.setDate(d.getDate()+prazo);d.setHours(23,59,59,999);assert.equal(where.data.lte.getTime(),d.getTime());assert.equal(where.empresaId,'e1');}
});
test('A01: WhatsApp e e-mail consultam cada empresa com seu prazo sem enviar mensagens',async()=>{
 for(const fn of ['processarNotificacoes','processarNotificacoesEmail']){const queries=[];const prisma={empresa:{findMany:async()=>[{id:'e1',prazoAlertaProvaDias:7},{id:'e2',prazoAlertaProvaDias:15}]},avaliacao:{findMany:async q=>{queries.push(q.where);return []}}};const api=load('src/lib/notificacoes.ts',{'./prisma':{prisma},'./email':{},'./envUtil':{limparEnv:v=>v}});await api[fn]();assert.equal(queries.length,2);for(const [i,q]of queries.entries()){const d=new Date(q.data.gte);d.setDate(d.getDate()+[7,15][i]);d.setHours(23,59,59,999);assert.equal(q.data.lte.getTime(),d.getTime());assert.equal(q.empresaId,'e'+(i+1));}}
});
test('A01: cadastro rejeita prazo inválido antes de acessar o banco',async()=>{
 const api=load('src/app/api/plataforma/empresas/route.ts',{'next/server':response,'bcryptjs':{},'@/lib/prisma':{prisma:{}},'@/lib/slug':{},'@/lib/plataforma':{requirePlataforma:async()=>true},'@/lib/platformCredentials':{}});
 for(const prazo of [0,366,2.5,'7',null])assert.equal((await api.POST({json:async()=>({prazoAlertaProvaDias:prazo})})).status,400);
});
test('D04: conflito de disponibilidade é compartilhado, incluindo aula sem horário',()=>{
 const {disponibilidadeConflita}=load('src/lib/validarDisponibilidade.ts');const faixa={dia:'Segunda',inicio:'08:00',fim:'12:00'};const aula={data:new Date('2026-09-21T00:00:00Z'),horaInicio:'09:00',horaFim:'10:00'};
 assert.equal(disponibilidadeConflita([faixa],[],[aula]),true);assert.equal(disponibilidadeConflita([faixa],[faixa],[aula]),false);assert.equal(disponibilidadeConflita([faixa],[],[{...aula,horaInicio:null,horaFim:null}]),true);assert.equal(disponibilidadeConflita([faixa],[],[{...aula,data:new Date('2026-09-22T00:00:00Z')}]),false);
});
test('D04: edição pela plataforma recusa conflito e formato inválido antes de gravar usuário',async()=>{
 let writes=0;const prisma={usuario:{findUnique:async()=>({id:'u1',perfil:'PROFESSORA',empresaId:'e1',professora:{id:'p1',empresaId:'e1',disponibilidade:[]}}),update:async()=>{writes++}}};
 const api=load('src/app/api/plataforma/usuarios/[id]/route.ts',{'next/server':response,'bcryptjs':{},'@/lib/prisma':{prisma},'@/lib/plataforma':{requirePlataforma:async()=>true},'@/lib/emailIdentity':{},'@/lib/disponibilidadeOcupada':{verificarDisponibilidadeOcupada:async()=>true,ERRO_DISPONIBILIDADE_OCUPADA:'ocupada'}});
 assert.equal((await api.PATCH({json:async()=>({nome:'Novo',disponibilidade:[]})},{params:Promise.resolve({id:'u1'})})).status,409);
 assert.equal((await api.PATCH({json:async()=>({disponibilidade:[{dia:'Segunda',inicio:'12:00',fim:'08:00'}]})},{params:Promise.resolve({id:'u1'})})).status,400);assert.equal(writes,0);
});
const aluno={id:'a1',empresaId:'e1',professoraId:'p1',nome:'Aluno teste',unidade:{nome:'Unidade',escola:{nome:'Escola'}},materias:[],status:'ATIVO',serie:'2º ano',agendaSemanal:[],diaSemana:1,horaAula:'09:00',tipoCobranca:'QUINZENAL',diaPagamento:5,diaPagamento2:20,valorCobranca:100,observacoes:'Observação preservada'};
test('A02–A04: ficha mostra vencimentos, observações, agenda legada e impressão',async()=>{
 const page=load('src/app/v2/alunos/[id]/page.tsx',{'@/lib/prisma':{prisma:{aluno:{findUnique:async()=>aluno}}},'@/lib/tenant':baseMocks['@/lib/tenant'],'lucide-react':new Proxy({},{get:()=>()=>null})});const html=renderToStaticMarkup(await page.default({params:Promise.resolve({id:'a1'})}));for(const text of ['Observação preservada','09:00','2º vencimento','20','/v2/alunos/a1/imprimir'])assert.ok(html.includes(text),text);
});
test('A04: impressão bloqueia aluno de outro professor',async()=>{
 const page=load('src/app/v2/alunos/[id]/imprimir/page.tsx',{'@/lib/prisma':{prisma:{aluno:{findUnique:async()=>({...aluno,professoraId:'p2'})}}},'@/lib/tenant':baseMocks['@/lib/tenant'],'@/app/dashboard/alunos/[id]/imprimir/ImprimirAlunoClient':{default:()=>{throw Error('Não deve renderizar ficha')}}});const html=renderToStaticMarkup(await page.default({params:Promise.resolve({id:'a1'})}));assert.ok(html.includes('Aluno não encontrado'));
});
