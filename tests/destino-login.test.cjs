const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),esbuild=require('esbuild');
const mod={exports:{}};
const code=esbuild.transformSync(fs.readFileSync('src/lib/destinoLogin.ts','utf8'),{loader:'ts',format:'cjs'}).code;
vm.runInNewContext('(function(module,exports){'+code+'})',{URL})(mod,mod.exports);
const destino=mod.exports.destinoV2AposLogin;
test('login preserva rota e consulta V2',()=>{
 assert.equal(destino('/v2/conteudos?aluno=a'),'/v2/conteudos?aluno=a');
 assert.equal(destino('/v2'),'/v2');
});
test('login rejeita destinos externos e fora da V2',()=>{
 for(const value of [null,'https://evil.invalid','//evil.invalid','/\\evil.invalid','/v2/../../login','/dashboard','javascript:alert(1)',' /v2'])assert.equal(destino(value),null);
});
