const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),esbuild=require('esbuild');
function motor(tipo,data,status='REALIZADA',pago=false){
 let created=[],updates=0;
 const aluno={tipoCobranca:tipo,valorCobranca:150,diaPagamento:10,diaPagamento2:25,diaSemanaCobranca:1,dataInicioContrato:new Date('2026-09-01'),dataFimContrato:new Date('2026-09-30')};
 const prisma={agendaAula:{findFirst:async()=>({id:'aula',alunoId:'aluno',data:new Date(data),status})},aluno:{findUnique:async()=>aluno},pagamentoAula:{findFirst:async()=>pago?{pagamentoId:'p',pagamento:{parcela:1,pago:true,valorCobrado:99}}:null,create:async()=>({})},pagamento:{aggregate:async()=>({_max:{parcela:0}}),create:async({data})=>{created.push(data);return {id:'p',...data}},update:async()=>{updates++;throw Error('Quitado alterado')}}};
 const mod={exports:{}};const code=esbuild.transformSync(fs.readFileSync('src/lib/motorCobranca.ts','utf8'),{loader:'ts',format:'cjs'}).code;
 vm.runInNewContext('(function(require,module,exports){'+code+'})',{Date,Number,console})(()=>({prisma}),mod,mod.exports);
 return {run:()=>mod.exports.gerarPagamentoAula('empresa','aula'),created,updates:()=>updates,aluno};
}
for(const [tipo,data,venc] of [['MENSAL','2026-09-08','2026-09-10'],['QUINZENAL','2026-09-08','2026-09-10'],['QUINZENAL','2026-09-22','2026-09-25'],['SEMANAL','2026-09-30','2026-10-05'],['POR_AULA','2026-09-08','2026-09-10']]){
 test(`${tipo} em ${data}: valor, vínculo e vencimento`,async()=>{const m=motor(tipo,data);const r=await m.run();assert.equal(r.semCobranca,false);assert.equal(m.created.length,1);assert.equal(m.created[0].valorCobrado,150);assert.equal(m.created[0].dataVencimento.toISOString().slice(0,10),venc);});
}
test('contrato inclusivo, antes/depois sem cobrança',async()=>{
 for(const day of ['2026-08-31','2026-10-01']){const m=motor('MENSAL',day);assert.equal((await m.run()).semCobranca,true);assert.equal(m.created.length,0);}
 for(const day of ['2026-09-01','2026-09-30'])assert.equal((await motor('MENSAL',day).run()).semCobranca,false);
});
test('agendada/cancelada/falta professor sem cobrança; falta aluno cobrada',async()=>{
 for(const s of ['AGENDADA','CANCELADA','FALTA_PROFESSOR'])assert.equal((await motor('MENSAL','2026-09-22',s).run()).semCobranca,true);
 assert.equal((await motor('MENSAL','2026-09-22','FALTA_ALUNO').run()).semCobranca,false);
});
test('quitado preserva valor histórico e não grava',async()=>{const m=motor('MENSAL','2026-09-22','REALIZADA',true);const r=await m.run();assert.equal(r.parcela.valorCobrado,99);assert.equal(m.created.length,0);assert.equal(m.updates(),0);});
