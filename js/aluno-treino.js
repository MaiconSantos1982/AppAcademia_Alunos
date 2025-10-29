let academiaId = null;
let alunoId = null;
let aluno = null;
let treinosProntos = [];
let exerciciosAcademia = [];
let exerciciosGeral = [];
let letrasPersonalizadas = [];

// Pega academia e aluno logado
async function getAcademiaId() {
  const { data: { user } } = await supabase.auth.getUser();
  academiaId = user?.id;
  if (!academiaId) window.location.href = 'login-academia.html';
}

function getAlunoIdFromUrl() {
  const p = new URLSearchParams(location.search);
  alunoId = p.get('id');
  document.getElementById('voltarAluno').href = `aluno-detalhes.html?id=${alunoId}`;
}

async function carregarAluno() {
  const { data } = await supabase
    .from('alunos')
    .select('*')
    .eq('academia_id', academiaId)
    .eq('id', alunoId)
    .single();
  aluno = data;
  document.getElementById('alunoInfo').innerHTML = `<strong>Aluno:</strong> ${aluno.nome} (${aluno.email})`;
}

async function carregarTreinosProntos() {
  const { data } = await supabase
    .from('treinos_prontos')
    .select('*')
    .eq('academia_id', academiaId);
  treinosProntos = data || [];
  const select = document.getElementById('selectTreinoPronto');
  select.innerHTML = treinosProntos.map(t =>
    `<option value="${t.id}">${t.nome} [${t.categoria}]</option>`
  ).join('');
}

async function carregarExercicios() {
  const { data: geral } = await supabase
    .from('exercicios_geral')
    .select('*');
  exerciciosGeral = geral || [];
  const { data: academia } = await supabase
    .from('exercicios_academia')
    .select('*')
    .eq('academia_id', academiaId);
  exerciciosAcademia = academia || [];
}

// Alternância tipo de treino
document.getElementById('formTipoTreino').addEventListener('change', () => {
  const tipo = document.querySelector('input[name="tipoTreino"]:checked').value;
  document.getElementById('areaTreinoPronto').style.display = tipo === 'pronto' ? 'block' : 'none';
  document.getElementById('areaPersonalizado').style.display = tipo === 'personalizado' ? 'block' : 'none';
});

// Adicionar letra (A, B, ...)
document.getElementById('btnAdicionarLetra').addEventListener('click', () => {
  const letra = String.fromCharCode(65 + letrasPersonalizadas.length); // A, B, C...
  letrasPersonalizadas.push({ letra, exercicios: [] });
  renderLetrasPersonalizadas();
});

// Renderizar letras e exercícios
function renderLetrasPersonalizadas() {
  const div = document.getElementById('listarTreinosLetras');
  div.innerHTML = letrasPersonalizadas.map((t, idx) => {
    return `
      <div class="card mb-2">
        <div class="card-body">
          <h6>Treino ${t.letra}</h6>
          <div id="listaExercicios${idx}">
            ${t.exercicios.map((e, i) =>
              `<div>
                ${e.nome} - Séries: ${e.series} - Rep: ${Array.isArray(e.repeticoes) ? e.repeticoes.join(',') : e.repeticoes}
                <button type="button" class="btn btn-sm btn-outline-danger ms-2" onclick="removerExercicio(${idx},${i})">Remover</button>
              </div>`
            ).join('')}
          </div>
          <button type="button" class="btn btn-sm btn-outline-success mt-2" onclick="abrirAdicionarExercicio(${idx})">Adicionar Exercício</button>
        </div>
      </div>
    `;
  }).join('');
}

// Remover exercício do treino/letra
window.removerExercicio = function(tIndex, eIndex) {
  letrasPersonalizadas[tIndex].exercicios.splice(eIndex, 1);
  renderLetrasPersonalizadas();
};

// Adicionar exercício (modal dinâmico dentro da letra)
window.abrirAdicionarExercicio = function(tIndex) {
  const lista = [...exerciciosGeral.map(e => ({ ...e, tipo: 'geral' })), ...exerciciosAcademia.map(e => ({ ...e, tipo: 'academia' }))];
  const opts = lista.map(e => `<option value="${e.id},${e.tipo}">${e.nome} [${e.grupo_muscular}]</option>`).join('');
  const idUnico = Math.random().toString(36).substr(2, 6); // para identificar os campos dinamicamente
  const html = `
    <form id="formAddExercicio${idUnico}">
      <div class="mb-2">
        <label>Exercício:</label>
        <select id="exercicioAdd${idUnico}" class="form-select" required>${opts}</select>
      </div>
      <div class="mb-2">
        <label>Séries:</label>
        <select id="seriesAdd${idUnico}" class="form-select" required>
          <option value="">Séries</option>
          ${[...Array(15)].map((_, i) => `<option value="${i+1}">${i+1}</option>`).join('')}
        </select>
      </div>
      <div class="mb-2" id="repeticoesAddContainer${idUnico}"></div>
      <button type="submit" class="btn btn-primary mt-2">Adicionar</button>
    </form>
  `;
  const d = document.createElement('div');
  d.innerHTML = html;
  d.className = "p-3 bg-light border mb-3";
  const card = document.getElementById('listarTreinosLetras').children[tIndex].children[0];
  card.appendChild(d);

  // Quando mudar séries, cria os campos de repetições
  d.querySelector(`#seriesAdd${idUnico}`).addEventListener('change', function() {
    const n = Number(this.value);
    const repsCont = d.querySelector(`#repeticoesAddContainer${idUnico}`);
    repsCont.innerHTML = '';
    for (let i = 1; i <= n; i++) {
      repsCont.innerHTML += `<input type="number" class="form-control mb-1" name="repeticao_${i}" placeholder="Repetições da série ${i}" min="1" max="99" required>`;
    }
  });

  // Ao enviar, coleta todas as repetições individualmente
  d.querySelector(`#formAddExercicio${idUnico}`).onsubmit = function(e) {
    e.preventDefault();
    const [id, tipo] = d.querySelector(`#exercicioAdd${idUnico}`).value.split(',');
    const nome = lista.find(e => e.id === id).nome;
    const series = Number(d.querySelector(`#seriesAdd${idUnico}`).value);
    const repeticoes = [];
    for (let i = 1; i <= series; i++) {
      repeticoes.push(d.querySelector(`input[name="repeticao_${i}"]`).value);
    }
    letrasPersonalizadas[tIndex].exercicios.push({ id, nome, tipo, series, repeticoes });
    renderLetrasPersonalizadas();
  };
};

// Salvar treino para aluno
document.getElementById('btnSalvarTreino').addEventListener('click', async () => {
  const tipo = document.querySelector('input[name="tipoTreino"]:checked').value;
  const dataExpiracao = document.getElementById('dataValidadeTreino') ? document.getElementById('dataValidadeTreino').value : null;

  if (tipo === 'pronto') {
    const treinoProntoId = document.getElementById('selectTreinoPronto').value;
    // Vincula treino pronto ao aluno
    const { error } = await supabase.from('alunos_treinos').insert([{
      aluno_id: alunoId,
      academia_id: academiaId,
      tipo_treino: 'pronto',
      treino_pronto_id: treinoProntoId,
      ativo: true,
      data_expiracao: dataExpiracao
    }]);
    if (error) {
      document.getElementById('cadastroTreinoError').textContent = error.message;
      return;
    }
    window.location.href = `aluno-detalhes.html?id=${alunoId}`;
    return;
  }

  // Personalizado
  if (letrasPersonalizadas.length === 0) {
    document.getElementById('cadastroTreinoError').textContent = 'Adicione pelo menos um treino/letra e exercício.';
    return;
  }

  // 1. Cadastro treino personalizado
  const { data, error } = await supabase.from('alunos_treinos').insert([{
    aluno_id: alunoId,
    academia_id: academiaId,
    tipo_treino: 'personalizado',
    nome_personalizado: `Treino personalizado - ${aluno.nome}`,
    ativo: true,
    data_expiracao: dataExpiracao
  }]).select().single();

  if (error) {
    document.getElementById('cadastroTreinoError').textContent = error.message;
    return;
  }
  const alunoTreinoId = data.id;

  // 2. Cadastro dos exercícios do personalizado
  for (let tInd = 0; tInd < letrasPersonalizadas.length; tInd++) {
    const letraObj = letrasPersonalizadas[tInd];
    for (let eInd = 0; eInd < letraObj.exercicios.length; eInd++) {
      const ex = letraObj.exercicios[eInd];
      await supabase.from('alunos_treinos_exercicios').insert([{
        aluno_treino_id: alunoTreinoId,
        treino_letra: letraObj.letra,
        exercicio_id: ex.id,
        exercicio_tipo: ex.tipo,
        ordem: eInd + 1,
        series: Number(ex.series),
        repeticoes: ex.repeticoes
      }]);
    }
  }

  window.location.href = `aluno-detalhes.html?id=${alunoId}`;
});

// Inicialização
window.addEventListener('DOMContentLoaded', async () => {
  await getAcademiaId();
  getAlunoIdFromUrl();
  await carregarAluno();
  await carregarTreinosProntos();
  await carregarExercicios();
});

// Alternância visibilidade áreas (segurança extra)
document.querySelectorAll('input[name="tipoTreino"]').forEach(el => {
  el.addEventListener('change', function() {
    document.getElementById('areaTreinoPronto').style.display = this.value === 'pronto' ? 'block' : 'none';
    document.getElementById('areaPersonalizado').style.display = this.value === 'personalizado' ? 'block' : 'none';
  });
});
