const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),esbuild=require('esbuild');
const mod={exports:{}};let consultas=0;
const prisma={agendaAula:{findMany:async()=>{consultas++;return []},findUnique:async()=>{consultas++;return null}}};
const code=esbuild.transformSync(fs.readFileSync('src/lib/conteudoAgenda.ts','utf8'),{loader:'ts',format:'cjs'}).code;
vm.runInNewContext('(function(require,module,exports){'+code+'})',{Date})(()=>({prisma}),mod,mod.exports);
test('planejamento independente permite salvar sem consultar agenda',async()=>{
 const r=await mod.exports.validarAgenda('empresa','aluno',new Date('2026-09-22'),true,null,['geo']);
 assert.equal(r.ok,true);assert.equal(consultas,0);
});
test('vinculo explicito e conteudo ministrado continuam exigindo aula',async()=>{
 assert.equal((await mod.exports.validarAgenda('empresa','aluno',new Date('2026-09-22'),true,'inexistente',['geo'])).ok,false);
 assert.equal((await mod.exports.validarAgenda('empresa','aluno',new Date('2026-09-22'),false,null,['geo'])).ok,false);
});
