const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const esbuild = require('esbuild');

// Executa os handlers e o motor reais com persistência simulada.
// Não substitui a homologação autenticada do Preview nem acessa banco remoto.
test('repor → realizar → repetir realização mantém somente a cobrança da origem', async () => {
  const scope = { empresaId: 'hml', isAdmin: true, professoraId: 'prof' };
  const aluno = { id: 'aluno', tipoCobranca: 'SEMANAL', valorCobranca: 13 };
  const aulas = new Map([['original', {
    id: 'original', empresaId: 'hml', professoraId: 'prof', alunoId: 'aluno',
    data: new Date('2026-09-23T00:00:00Z'), horaInicio: '08:00', horaFim: '09:00',
    status: 'FALTA_PROFESSOR', reposicao: false,
  }]]);
  const pagamentos = [];
  const conteudos = new Map();
  const prisma = {
    agendaAula: {
      findUnique: async ({where}) => aulas.has(where.id) ? {...aulas.get(where.id), aluno} : null,
      findFirst: async ({where}) => {
        const a = aulas.get(where.id);
        return a?.empresaId === where.empresaId ? {...a} : null;
      },
      findMany: async () => [],
      create: async ({data}) => {
        const aula = {id: 'reposicao', status: 'AGENDADA', ...data};
        aulas.set(aula.id, aula);
        return {...aula};
      },
      delete: async ({where}) => aulas.delete(where.id),
      update: async ({where,data}) => {
        const aula = {...aulas.get(where.id), ...data};
        aulas.set(where.id, aula);
        return {...aula};
      },
    },
    aluno: {
      findFirst: async () => ({id: aluno.id}),
      findUnique: async () => ({...aluno, materias: []}),
    },
    professora: {findFirst: async () => ({id: 'prof'})},
    pagamento: {
      aggregate: async () => ({_max: {parcela: 0}}),
      create: async ({data}) => {
        const pagamento = {id: 'pagamento-' + (pagamentos.length + 1), ...data};
        pagamentos.push(pagamento);
        return {...pagamento};
      },
      update: async () => { throw Error('Cobrança existente não pode ser alterada ao realizar reposição'); },
    },
    pagamentoAula: {
      findMany: async () => [],
      findFirst: async () => null,
      create: async () => { throw Error('Reposição não deve gerar novo vínculo financeiro'); },
    },
    conteudo: {
      findUnique: async ({where}) => conteudos.get(where.aulaId) ?? null,
      update: async ({where,data}) => {
        for (const [aulaId,c] of conteudos) {
          if (c.id === where.id) { const updated = {...c,...data}; conteudos.set(aulaId,updated); return updated; }
        }
        throw Error('Conteúdo inexistente');
      },
    },
    $queryRaw: async () => [{count: 0n}],
    $transaction: async callback => callback(prisma),
  };
  const cache = new Map();
  function load(file) {
    if (cache.has(file)) return cache.get(file);
    const module = {exports: {}};
    const code = esbuild.transformSync(fs.readFileSync(file,'utf8'), {loader:'ts',format:'cjs'}).code;
    const loadDependency = id => {
      if (id === '@/lib/prisma') return {prisma};
      if (id === '@/lib/tenant') return {getSessionScope: async () => scope};
      if (id.startsWith('@/')) return load('src/' + id.slice(2) + '.ts');
      return require(id);
    };
    vm.runInNewContext('(function(require,module,exports){' + code + '})', {Date,Number,console,Response})(loadDependency,module,module.exports);
    cache.set(file,module.exports);
    return module.exports;
  }
  const repor = load('src/app/api/agenda/[id]/repor/route.ts');
  const agenda = load('src/app/api/agenda/[id]/route.ts');
  const response = await repor.POST({json: async () => ({
    data:'2026-09-24',horaInicio:'08:00',horaFim:'08:30',observacao:'HML reposição',
  })}, {params:Promise.resolve({id:'original'})});
  assert.equal(response.status,201);
  const created = await response.json();
  assert.equal(created.aula.reposicao,true);
  assert.equal(aulas.has('original'),false);
  assert.equal(pagamentos.length,1);
  assert.equal(pagamentos[0].origemReposicao,true);
  assert.equal(pagamentos[0].valorCobrado,13);
  const before = JSON.stringify(pagamentos);
  conteudos.set('reposicao',{id:'conteudo-hml',aulaId:'reposicao',planejado:true});
  for (let attempt = 0; attempt < 2; attempt++) {
    const result = await agenda.PATCH({json:async()=>({status:'REALIZADA'})}, {params:Promise.resolve({id:'reposicao'})});
    assert.equal(result.status,200);
    const body = await result.json();
    assert.equal(body.status,'REALIZADA');
    assert.equal(body.pagamentoGerado,undefined);
    assert.equal(body.avisoPagamento,undefined);
    assert.equal(JSON.stringify(pagamentos),before);
    assert.equal(conteudos.get('reposicao').planejado,false);
  }
  assert.equal(pagamentos.length,1);
  assert.equal(pagamentos.reduce((total,p)=>total+Number(p.valorCobrado),0),13);
  console.log('Evidência local: antes=1 cobrança/R$13; após realizar=1/R$13; após repetir=1/R$13.');
});
