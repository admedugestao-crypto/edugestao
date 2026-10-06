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
test('H03: notas recusam negativos, máximo excedido e referências incompatíveis antes de gravar',async()=>{
 let writes=0;let aluno={id:'a',unidadeId:'u',serie:'2',materias:[{materiaId:'m'}]};const prisma={aluno:{findFirst:async()=>aluno},avaliacao:{findFirst:async()=>({id:'v',unidadeId:'u',serie:'2',materiaId:'m',notaMax:10})},materia:{findFirst:async()=>({id:'m'})},nota:{upsert:async()=>{writes++;return {}}}};
 const api=load('src/app/api/notas/route.ts',{...baseMocks,'@/lib/prisma':{prisma}});
 const run=valor=>api.POST({json:async()=>({alunoId:'a',avaliacaoId:'v',materiaId:'m',valor})});
 for(const v of [-5,11,'5',null])assert.equal((await run(v)).status,400);
 aluno={...aluno,unidadeId:'outra'};assert.equal((await run(5)).status,400);assert.equal(writes,0);
 aluno.unidadeId='u';assert.equal((await run(5)).status,201);assert.equal(writes,1);
});
test('H05: referências do aluno exigem mesma empresa, com JSON validado',async()=>{
 let total=1;const where=[];const api=load('src/lib/referenciasAluno.ts',{'@/lib/prisma':{prisma:{unidade:{findFirst:async q=>{where.push(q.where);return {id:'u'}}},professora:{findFirst:async q=>{where.push(q.where);return {id:'p'}}},materia:{count:async q=>{where.push(q.where);return total}}}}});
 assert.equal(api.lerMateriasAluno('{'),null);assert.equal(api.lerMateriasAluno('[1]'),null);
 assert.equal(await api.referenciasAlunoValidas('e','u','p',['m']),true);total=0;assert.equal(await api.referenciasAlunoValidas('e','u','p',['outra']),false);assert.ok(where.every(w=>w.empresaId==='e'));
});
test('H02: pagamentos rejeitam valores e datas impossíveis',()=>{
 const {erroPagamento}=load('src/lib/validarPagamento.ts');for(const body of [{valorCobrado:-140},{dataVencimento:'2026-02-31'},{dataPagamento:'invalida'},{quantidadeAulas:-1},{pago:'true'}])assert.ok(erroPagamento(body));assert.equal(erroPagamento({valorCobrado:0,dataVencimento:'2026-02-28'}),null);
});
test('H02: POST não permite baixar aula agendada por rota alternativa',async()=>{
 let writes=0;const prisma={aluno:{findFirst:async()=>({id:'a'})},pagamento:{findUnique:async()=>({id:'p'}),upsert:async()=>{writes++;return {}}},pagamentoAula:{count:async()=>1}};
 const api=load('src/app/api/pagamentos/route.ts',{'next/server':response,'@/lib/tenant':{getSessionScope:async()=>({...scope,isAdmin:true})},'@/lib/prisma':{prisma}});
 assert.equal((await api.POST({json:async()=>({alunoId:'a',mes:9,ano:2026,pago:true,valorCobrado:140,dataVencimento:'2026-09-30'})})).status,422);assert.equal(writes,0);
});
test('H02: contrato é aplicado por dia e pagamentos quitados permanecem intactos',async()=>{
 let writes=0;const aluno={tipoCobranca:'MENSAL',valorCobranca:140,diaPagamento:20,diaPagamento2:null,diaSemanaCobranca:null,dataInicioContrato:new Date('2026-09-20'),dataFimContrato:null};const prisma={aluno:{findUnique:async()=>aluno},agendaAula:{findFirst:async()=>({id:'aula',alunoId:'a',data:new Date('2026-09-15'),status:'REALIZADA'})},pagamentoAula:{findFirst:async()=>({pagamentoId:'p',pagamento:{parcela:1,pago:true,valorCobrado:140}})},pagamento:{update:async()=>{writes++},create:async()=>{writes++}}};
 const api=load('src/lib/motorCobranca.ts',{'@/lib/prisma':{prisma}});
 assert.equal((await api.gerarPagamentoAula('e','aula')).semCobranca,true);aluno.dataInicioContrato=new Date('2026-09-01');aluno.dataFimContrato=new Date('2026-09-10');assert.equal((await api.gerarPagamentoAula('e','aula')).semCobranca,true);aluno.dataFimContrato=new Date('2026-09-15');assert.equal((await api.gerarPagamentoAula('e','aula')).semCobranca,false);assert.equal(writes,0);
});
test('H02: vencimentos limitam o dia ao mês e semanal avança sem retroceder',()=>{
 const api=load('src/lib/motorCobranca.ts',{'@/lib/prisma':{prisma:{}}});const info={tipoCobranca:'MENSAL',diaPagamento:31,diaPagamento2:null,diaSemanaCobranca:null};assert.equal(api.calcularVencimentoAula(info,new Date('2026-02-20'),2,2026).toISOString().slice(0,10),'2026-02-28');assert.equal(api.calcularVencimentoAula({...info,tipoCobranca:'SEMANAL',diaSemanaCobranca:1},new Date('2026-09-30'),9,2026).toISOString().slice(0,10),'2026-10-05');
});
test('H06: DDD 55 recebe código de país sem duplicar número internacional',()=>{const api=load('src/lib/notificacoes.ts',{'./prisma':{prisma:{}},'./email':{},'./envUtil':{limparEnv:v=>v}});assert.equal(api.formatarWhatsapp('(55) 99999-9999'),'5555999999999');assert.equal(api.formatarWhatsapp('+55 55 99999-9999'),'5555999999999');});
test('H06: pausa impede email; ausência de telefone permite fallback e seleção usa data UTC',async()=>{
 let sent=0,where;const empresa={nome:'Empresa',emailPausado:true,whatsappPausado:false,fonnteToken:'simulado'};const prisma={agendaAula:{findMany:async q=>{where=q.where;return [{id:'aula',alunoId:'a',empresaId:'e',data:new Date('2026-09-22'),horaInicio:'09:00',horaFim:'10:00',notificacao:null,empresa,aluno:{nome:'Aluno',telefoneResponsavel:null,emailResponsavel:'teste@example.invalid'},professora:{usuario:{nome:'Professor'}},materia:{nome:'Matemática'}}]}},notificacaoAula:{upsert:async()=>({})}};
 const api=load('src/lib/notificacoes.ts',{'./prisma':{prisma},'./email':{enviarEmailAula:async()=>{sent++;return {ok:true}}},'./envUtil':{limparEnv:v=>v}});
 await api.processarNotificacoesAula();assert.equal(sent,0);assert.equal(where.data.gte.getUTCHours(),0);empresa.emailPausado=false;await api.processarNotificacoesAula();assert.equal(sent,1);
});
test('H01: gerador não grava fora da disponibilidade nem em feriado',async()=>{
 let writes=0;let holiday=false;const dia=new Date();dia.setDate(dia.getDate()+7);const iso=dia.toISOString().slice(0,10);let slots=[{dia:'Dia inexistente',inicio:'08:00',fim:'18:00'}];const prisma={empresa:{findUnique:async()=>({})},calendarioEscolar:{findMany:async()=>[]},aluno:{findMany:async()=>[{id:'a',nome:'Aluno',professoraId:'p',agendaSemanal:[{diaSemana:dia.getUTCDay(),horaAula:'09:00'}],dataInicioContrato:new Date(iso),dataFimContrato:new Date(iso),materias:[],unidade:null}]},professora:{findMany:async()=>[{id:'p1',disponibilidade:slots}]},agendaAula:{findMany:async()=>[],create:async()=>{writes++}}};const api=load('src/app/api/agenda/gerar/route.ts',{...baseMocks,'@/lib/prisma':{prisma},'@/lib/feriados':{obterFeriadosBrasil:async()=>({feriados:holiday?[{data:iso}]:[]})}});
 const run=()=>api.POST({json:async()=>({semanaInicio:iso})});assert.equal((await run()).body.criadas,0);slots=[];holiday=true;assert.equal((await run()).body.criadas,0);assert.equal(writes,0);holiday=false;assert.equal((await run()).body.criadas,1);
});
test('H05: edição recusa referência externa antes de foto ou atualização',async()=>{
 let writes=0;const prisma={aluno:{findUnique:async()=>({empresaId:'e1',professoraId:'p1'}),update:async()=>{writes++}},unidade:{findFirst:async()=>null},professora:{findFirst:async()=>({id:'p1'})},materia:{count:async()=>0}};const api=load('src/app/api/alunos/[id]/route.ts',{...baseMocks,'@/lib/prisma':{prisma},'@/lib/foto-aluno':{salvarFotoAluno:async()=>{writes++},FotoAlunoInvalida:class extends Error{}},'@/lib/data':{}});const form={get:k=>({materias:'[]',unidadeId:'outra'})[k]??null};assert.equal((await api.PUT({formData:async()=>form},{params:Promise.resolve({id:'a'})})).status,404);assert.equal(writes,0);
});
test('H04: escola e primeira unidade são gravadas na mesma operação',async()=>{
 let created;const api=load('src/app/api/escolas/route.ts',{...baseMocks,'@/lib/data':{validarPeriodoLetivo:()=>null},'@/lib/prisma':{prisma:{escola:{create:async q=>{created=q;return {id:'s'}}}}}});assert.equal((await api.POST({json:async()=>({nome:'Escola',primeiraUnidade:{nome:'Unidade'}})})).status,201);assert.equal(created.data.unidades.create.empresaId,'e1');assert.equal(created.data.unidades.create.nome,'Unidade');
});
