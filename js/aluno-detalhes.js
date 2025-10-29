let academiaId = null;
let alunoId = null;
let aluno = null;
let modalEditar = null;

// Pega academia logada
async function getAcademiaId() {
  const { data: { user } } = await supabase.auth.getUser();
  academiaId = user?.id;
  if (!academiaId) window.location.href = 'login-academia.html';
}

function getAlunoIdFromUrl() {
  const p = new URLSearchParams(location.search);
  alunoId = p.get('id');
}

async function carregarDadosAluno() {
  const { data, error } = await supabase
    .from('alunos')
    .select('*')
    .eq('academia_id', academiaId)
    .eq('id', alunoId)
    .single();

  if (error || !data) {
    document.getElementById('alunoError').textContent = error?.message || 'Aluno não encontrado';
    return;
  }

  aluno = data;
  renderizaDetalhesAluno(aluno);
  await carregarTreinosDoAluno(aluno.id);
}

function renderizaDetalhesAluno(a) {
  document.getElementById('detalhesAluno').innerHTML = `
    <div class="card mb-3">
      <div class="card-body">
        <h5 class="card-title">${a.nome}</h5>
        <p><strong>E-mail:</strong> ${a.email}</p>
        <p><strong>Telefone:</strong> ${a.telefone ? `<a href="https://wa.me/${a.telefone.replace(/\D/g,'')}" target="_blank">WhatsApp</a> ${a.telefone}` : '-'}</p>
        <p><strong>Peso:</strong> ${a.peso || '-'} kg</p>
        <p><strong>Altura:</strong> ${a.altura || '-'} m</p>
        <p><strong>Problemas de saúde:</strong> ${a.problemas_saude || '-'}</p>
        <p><strong>Observações:</strong> ${a.observacoes || '-'}</p>
        <p><strong>Status:</strong> ${a.ativo ? 'Ativo' : 'Inativo'}</p>
      </div>
    </div>
  `;
}

// Carrega todos os treinos do aluno
async function carregarTreinosDoAluno(alunoId) {
  const { data: treinos } = await supabase
    .from('alunos_treinos')
    .select('*')
    .eq('aluno_id', alunoId)
    .order('created_at', { ascending: false });

  const area = document.getElementById('areaTreinoAluno');
  if (!treinos || treinos.length === 0) {
    area.innerHTML = '<div class="alert alert-warning">Nenhum treino cadastrado para este aluno.</div>';
    return;
  }
  area.innerHTML = treinos.map(renderTreinoCard).join('');
}

// Renderiza um bloco/card de treino individual
function renderTreinoCard(treino) {
  const validade = treino.data_expiracao ? new Date(treino.data_expiracao).toLocaleDateString() : 'Não definida';
  const btns = `
    <button class="btn btn-warning btn-sm" onclick="editarTreino('${treino.id}')">Editar</button>
    <button class="btn btn-info btn-sm" onclick="duplicarTreino('${treino.id}', '${treino.nome_personalizado || treino.nome_pronto}')">Duplicar</button>
    <button class="btn btn-danger btn-sm" onclick="excluirTreino('${treino.id}')">Excluir</button>
  `;

  setTimeout(() => carregarExerciciosDoTreinoCard(treino.id), 0);

  return `
    <div class="card mb-3">
      <div class="card-body">
        <h5>Treino</h5>
        <div><strong>Nome:</strong> ${treino.nome_personalizado || treino.nome_pronto} ${btns}</div>
        <div><strong>Validade até:</strong> ${validade}</div>
        <div id="areaTreinoExercicios_${treino.id}" class="mt-2"></div>
      </div>
    </div>
  `;
}

async function carregarExerciciosDoTreinoCard(alunoTreinoId) {
  const areaEx = document.getElementById(`areaTreinoExercicios_${alunoTreinoId}`);
  if (!areaEx) return;
  const { data: exercs } = await supabase.from('alunos_treinos_exercicios').select('*').eq('aluno_treino_id', alunoTreinoId);
  if (!exercs || exercs.length === 0) {
    areaEx.innerHTML = "<div class='text-muted'>Sem exercícios cadastrados.</div>";
    return;
  }
  let bloco = '';
  for (const e of exercs) {
    let nomeExercicio = '-';
    let grupoMuscular = '-';
    if (e.exercicio_tipo === 'geral') {
      const { data } = await supabase.from('exercicios_geral').select('nome,grupo_muscular').eq('id', e.exercicio_id).single();
      nomeExercicio = data?.nome || '-';
      grupoMuscular = data?.grupo_muscular || '-';
    } else if (e.exercicio_tipo === 'academia') {
      const { data } = await supabase.from('exercicios_academia').select('nome,grupo_muscular').eq('id', e.exercicio_id).single();
      nomeExercicio = data?.nome || '-';
      grupoMuscular = data?.grupo_muscular || '-';
    }
    // Repetições: array vira string, tira aspas
    let repeticoesLimpa = Array.isArray(e.repeticoes)
      ? e.repeticoes.map(v => String(v)).join(', ')
      : String(e.repeticoes).replace(/"/g,"").replace(/[\[\]]/g,"");
    bloco += `
      <li>
        <strong>${nomeExercicio}</strong> | ${grupoMuscular} | Séries: ${e.series} | Repetições: ${repeticoesLimpa}
      </li>
    `;
  }
  areaEx.innerHTML = `<h6>Exercícios:</h6><ul>${bloco}</ul>`;
}

// Remover treino
window.excluirTreino = async function(treinoId) {
  if (!confirm('Confirma excluir este treino?')) return;
  await supabase.from('alunos_treinos').delete().eq('id', treinoId);
  window.location.reload();
};

// Duplicar treino
window.duplicarTreino = async function(treinoId, nomeOriginal) {
  const { data: treino } = await supabase.from('alunos_treinos').select('*').eq('id', treinoId).single();
  const { data: exercs } = await supabase.from('alunos_treinos_exercicios').select('*').eq('aluno_treino_id', treinoId);

  let n = 1;
  const { data: todos } = await supabase.from('alunos_treinos')
    .select('nome_personalizado')
    .eq('aluno_id', treino.aluno_id);
  while (todos.some(t => t.nome_personalizado === `${nomeOriginal} (${n})`)) n++;
  const nomeDuplicado = `${nomeOriginal} (${n})`;

  const { data: novoTreino } = await supabase.from('alunos_treinos').insert([{
    aluno_id: treino.aluno_id,
    academia_id: treino.academia_id,
    tipo_treino: treino.tipo_treino,
    nome_personalizado: nomeDuplicado,
    ativo: true,
    data_expiracao: treino.data_expiracao
  }]).select().single();

  for (const ex of exercs) {
    let clone = { ...ex, aluno_treino_id: novoTreino.id };
    delete clone.id;
    await supabase.from('alunos_treinos_exercicios').insert([clone]);
  }
  window.location.reload();
};

// Modal simples para edição do treino
// ...DEFESA DO CONTEXTO E FUNÇÕES JÁ EXISTENTES MANTIDAS...

window.editarTreino = async function(treinoId) {
    // Busca os dados do treino e seus exercícios
    const { data: treino } = await supabase.from('alunos_treinos').select('*').eq('id', treinoId).single();
    const { data: exercs } = await supabase.from('alunos_treinos_exercicios').select('*').eq('aluno_treino_id', treinoId);
  
    // Carrega listas de exercícios para selects
    const { data: geral } = await supabase.from('exercicios_geral').select('*');
    const { data: academia } = await supabase.from('exercicios_academia').select('*').eq('academia_id', academiaId);
  
    // Organiza os exercícios por letra
    const letras = {};
    for (const e of exercs) {
      if (!letras[e.treino_letra]) letras[e.treino_letra] = [];
      letras[e.treino_letra].push(e);
    }
  
    // Gera campos de cada grupo de treino/letra, preenchidos
    let blocoLetras = '';
    Object.entries(letras).forEach(([letra, lista]) => {
      blocoLetras += `
        <div class="card mb-2">
          <div class="card-body">
            <h6>Treino ${letra}</h6>
            <div id="editarListaExercicios${letra}">
              ${lista.map((e,i) => {
                // Nome para select
                const isGeral = e.exercicio_tipo === 'geral';
                const optsGeral = geral.map(x =>
                  `<option value="${x.id},geral" ${isGeral && e.exercicio_id===x.id ? 'selected' : ''}>${x.nome} [${x.grupo_muscular}]</option>`)
                .join('');
                const optsAcad = academia.map(x =>
                  `<option value="${x.id},academia" ${!isGeral && e.exercicio_id===x.id ? 'selected' : ''}>${x.nome} [${x.grupo_muscular}]</option>`)
                .join('');
                // Repetições como array
                const repsArr = Array.isArray(e.repeticoes)
                  ? e.repeticoes
                  : String(e.repeticoes).replace(/"/g,"").replace(/[\[\]]/g,"").split(',').map(item=>item.trim()).filter(Boolean);
                return `
                <div class="row align-items-end mb-2 editarExercicioLinha" data-letra="${letra}">
                  <div class="col-md-5">
                    <label class="form-label mb-0">Exercício:</label>
                    <select class="form-select editarExercicioNome">${optsGeral+optsAcad}</select>
                  </div>
                  <div class="col-md-2">
                    <label class="form-label mb-0">Séries:</label>
                    <input type="number" class="form-control editarExercicioSeries" value="${e.series}">
                  </div>
                  <div class="col-md-4">
                    <label class="form-label mb-0">Repetições:</label>
                    <input type="text" class="form-control editarExercicioRepeticoes" value="${repsArr.join(',')}">
                  </div>
                  <div class="col-md-1">
                    <button type="button" class="btn btn-outline-danger btn-sm editarExercicioRemover">X</button>
                  </div>
                </div>
                `;
              }).join('')}
            </div>
            <button class="btn btn-outline-success btn-sm mt-2" onclick="adicionarLinhaExercicioEditar('${letra}')">Adicionar Exercício</button>
          </div>
        </div>
      `;
    });
  
    // Modal de edição
    let htmlModal = `
    <div id="editarTreinoModal" class="modal d-block" tabindex="-1" style="background:rgba(0,0,0,0.3);">
      <div class="modal-dialog modal-lg"><div class="modal-content">
        <div class="modal-header"><h5 class="modal-title">Editar Treino</h5></div>
        <div class="modal-body pb-1">
          <label class="form-label">Nome:</label>
          <input type="text" id="editNomeTreino" class="form-control mb-2" value="${treino.nome_personalizado||''}">
          <label class="form-label">Validade:</label>
          <input type="date" id="editValidadeTreino" class="form-control mb-2" 
            value="${treino.data_expiracao ? treino.data_expiracao.substr(0,10) : ''}">
          <div id="editarBlocoLetras">
            ${blocoLetras}
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" id="closeEditarModal">Cancelar</button>
          <button class="btn btn-primary" id="confirmEditarModal">Salvar</button>
        </div>
      </div></div>
    </div>
    `;
    document.querySelectorAll('#editarTreinoModal').forEach(e=>e.remove());
    document.body.insertAdjacentHTML('beforeend', htmlModal);
  
    // Evento para remover linha exercício
    document.querySelectorAll('.editarExercicioRemover').forEach(btn=>{
      btn.onclick = function() {
        this.closest('.editarExercicioLinha').remove();
      };
    });
  
    // Função para adicionar linha de exercício em edição (reaproveita selects montados acima)
    window.adicionarLinhaExercicioEditar = function(letra) {
      const selectGeral = geral.map(x=> `<option value="${x.id},geral">${x.nome} [${x.grupo_muscular}]</option>`).join('');
      const selectAcad = academia.map(x=> `<option value="${x.id},academia">${x.nome} [${x.grupo_muscular}]</option>`).join('');
      const html = `
        <div class="row align-items-end mb-2 editarExercicioLinha" data-letra="${letra}">
          <div class="col-md-5">
            <label class="form-label mb-0">Exercício:</label>
            <select class="form-select editarExercicioNome">${selectGeral+selectAcad}</select>
          </div>
          <div class="col-md-2">
            <label class="form-label mb-0">Séries:</label>
            <input type="number" class="form-control editarExercicioSeries" value="1">
          </div>
          <div class="col-md-4">
            <label class="form-label mb-0">Repetições:</label>
            <input type="text" class="form-control editarExercicioRepeticoes" value="">
          </div>
          <div class="col-md-1">
            <button type="button" class="btn btn-outline-danger btn-sm editarExercicioRemover">X</button>
          </div>
        </div>
      `;
      document.querySelector(`#editarListaExercicios${letra}`).insertAdjacentHTML('beforeend', html);
      document.querySelectorAll('.editarExercicioRemover').forEach(btn=>{
        btn.onclick = function() { this.closest('.editarExercicioLinha').remove(); };
      });
    };
  
    document.getElementById('closeEditarModal').onclick = () => {
      document.getElementById('editarTreinoModal').remove();
    };
  
    document.getElementById('confirmEditarModal').onclick = async () => {
      const novoNome = document.getElementById('editNomeTreino').value.trim();
      const novaValidade = document.getElementById('editValidadeTreino').value || null;
  
      // 1. Atualiza treino
      await supabase.from('alunos_treinos').update({
        nome_personalizado: novoNome,
        data_expiracao: novaValidade
      }).eq('id', treinoId);
  
      // 2. Remove todos exercícios antigos
      await supabase.from('alunos_treinos_exercicios').delete().eq('aluno_treino_id', treinoId);
  
      // 3. Insere exercícios novos (conforme campos)
      const blocos = document.querySelectorAll('.card-body > #editarListaExercicios' + ' div.editarExercicioLinha');
      let blocosPorLetra = {};
      document.querySelectorAll('.card-body').forEach(card=> {
        let letra = card.querySelector('h6')?.innerText.replace('Treino ','').trim() || 'A';
        blocosPorLetra[letra] = card.querySelectorAll('.editarExercicioLinha');
      });
      for (let letra in blocosPorLetra) {
        let linhas = blocosPorLetra[letra];
        let ordem = 1;
        for (const linha of linhas) {
          const [exercicio_id, exercicio_tipo] = linha.querySelector('.editarExercicioNome').value.split(',');
          const series = Number(linha.querySelector('.editarExercicioSeries').value);
          const repeticoes = linha.querySelector('.editarExercicioRepeticoes').value.split(',').map(x => x.trim()).filter(Boolean);
          await supabase.from('alunos_treinos_exercicios').insert([{
            aluno_treino_id: treinoId,
            treino_letra: letra,
            exercicio_id, exercicio_tipo,
            ordem: ordem++,
            series, repeticoes
          }]);
        }
      }
      document.getElementById('editarTreinoModal').remove();
      window.location.reload();
    };
  };
  
  window.abrirCadastroTreino = function() {
    window.location.href = `aluno-treino.html?id=${aluno.id}`;
  };
  
  window.addEventListener('DOMContentLoaded', async () => {
    modalEditar = new bootstrap.Modal(document.getElementById('modalEditar'));
    await getAcademiaId();
    getAlunoIdFromUrl();
    await carregarDadosAluno();
  });
  
