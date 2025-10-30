let aluno = null;
let treinoAtivo = null;
let treinoExercicios = [];
let alunoId = null;
let estadoCheckboxes = {};
let treinoExpandido = {};
let exercicioExpandido = {};

function getAlunoIdFromUrl() {
  const p = new URLSearchParams(location.search);
  alunoId = p.get('id');
}

async function carregarAluno() {
  const { data } = await supabase
    .from('alunos')
    .select('*')
    .eq('id', alunoId)
    .single();
  aluno = data;
  document.getElementById('nomeAluno').textContent = aluno.nome;
}

async function carregarTreinoAtivo() {
  const { data, error } = await supabase
    .from('alunos_treinos')
    .select('*')
    .eq('aluno_id', alunoId)
    .eq('ativo', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  console.log('Treino:', data, 'Erro:', error);

  if (error) {
    document.getElementById('areaTreino').innerHTML = `<div class="alert alert-danger">Erro: ${error.message}</div>`;
    return;
  }
  if (!data) {
    document.getElementById('areaTreino').innerHTML = `<div class="alert alert-warning">Nenhum treino encontrado.</div>`;
    return;
  }
  let titulo = '';
  if (data.tipo_treino === 'personalizado') titulo = data.nome_personalizado;
  else titulo = 'Treino pronto';
  document.getElementById('tituloTreino').textContent = titulo;
  treinoAtivo = data;
  await carregarTreinoExercicios();
}

async function carregarTreinoExercicios() {
  const { data, error } = await supabase
    .from('alunos_treinos_exercicios')
    .select('*')
    .eq('aluno_treino_id', treinoAtivo.id)
    .order('treino_letra')
    .order('ordem');
  console.log('Exercícios:', data, 'Erro:', error);

  treinoExercicios = data || [];
  carregarEstadoCheckboxes();
  await renderizarExercicios();
}

function carregarEstadoCheckboxes() {
  const key = 'concluido_' + treinoAtivo.id;
  estadoCheckboxes = JSON.parse(localStorage.getItem(key) || '{}');
}

function salvarEstadoCheckboxes() {
  const key = 'concluido_' + treinoAtivo.id;
  localStorage.setItem(key, JSON.stringify(estadoCheckboxes));
}

async function renderizarExercicios() {
  try {
    console.log("TreinoExercicios para renderizar:", treinoExercicios);

    const valoresCarga = {};
    document.querySelectorAll('input[id^="input_carga_"]').forEach(input => {
      valoresCarga[input.id] = input.value;
    });

    const grupos = {};
    for (const t of treinoExercicios) {
      if (!t.treino_letra) console.warn("Exercício sem treino_letra:", t);
      if (!grupos[t.treino_letra]) grupos[t.treino_letra] = [];
      grupos[t.treino_letra].push(t);
    }
    console.log("Grupos encontrados:", grupos);

    const area = document.getElementById('areaTreino');
    let html = `<button type="button" class="btn btn-warning w-100 mb-4 fw-bold rounded-3 shadow-sm" style="font-size:1.12rem;" onclick="desmarcarTodos()">Desmarcar todos</button>`;
    html += await Promise.all(Object.entries(grupos).map(async ([letra, lista]) => {
      const treinoOpen = treinoExpandido[letra] ?? true;
      return `
      <div class="mb-4">
        <div onclick="toggleTreino('${letra}')" style="cursor:pointer;background:#f8f9fa;border-radius:12px;padding:.85rem 1.1rem;display:flex;align-items:center;gap:.6em;">
          <h5 class="fw-semibold m-0" style="font-size:1.2rem;">Treino ${letra}</h5>
          <span class="ms-auto"><i class="bi ${treinoOpen ? 'bi-chevron-down' : 'bi-chevron-right'}"></i></span>
        </div>
        <div class="${treinoOpen ? '' : 'd-none'}">
        ${await Promise.all(lista.map(async (ex) => {
          const [nome, grupo, video_url] = await getNomeGrupoTipoExercicio(ex);
          let repsArr = Array.isArray(ex.repeticoes)
            ? ex.repeticoes
            : String(ex.repeticoes).replace(/"/g,"").replace(/[\[\]]/g,"").split(',').map(a=>a.trim()).filter(Boolean);
          const checkIds = repsArr.map((_,i) => `${ex.id}_rep${i}`);
          const checks = checkIds.map(id => estadoCheckboxes[id] ? true : false);

          const exercOpen = exercicioExpandido[ex.id] ?? false;

          return `
            <div class="card shadow-sm mb-2 border-0" style="border-radius:20px;">
              <div onclick="toggleExercicio('${ex.id}')" style="cursor:pointer;padding:18px 18px 7px 18px;border-radius:18px;background:#FFF;display:flex;align-items:center;gap:.6em;">
                <span class="fw-bold" style="font-size:1.1rem;">${nome}</span>
                <span class="ms-2" style="color:#888;font-weight:400;">
                  | ${grupo} | Séries: ${repsArr.length}
                </span>
                ${video_url ? `
                  <button class="btn btn-link p-0 ms-2" onclick="event.stopPropagation(); toggleVideo('${ex.id}', '${video_url}');" style="text-decoration:none;">
                    <svg width="24" height="24" fill="#FF6B6B" viewBox="0 0 24 24">
                      <circle cx="12" cy="12" r="10" fill="#FF6B6B"/>
                      <path d="M10 8l6 4-6 4V8z" fill="#FFF"/>
                    </svg>
                  </button>
                ` : ''}
                <span style="font-weight:300;font-size:1.2em;margin-left:auto;">
                  <i class="bi ${exercOpen ? 'bi-chevron-down' : 'bi-chevron-right'}"></i>
                </span>
              </div>
              
              ${video_url ? `
                <div id="videoBox_${ex.id}" class="video-container" style="max-height:0;overflow:hidden;transition:max-height 0.4s ease;">
                  <div class="ratio ratio-16x9 my-2 mx-3" style="border-radius:12px;overflow:hidden;">
                    <iframe id="iframe_${ex.id}" src="" allowfullscreen frameborder="0" allow="autoplay"></iframe>
                  </div>
                </div>
              ` : ''}
              
              <div class="${exercOpen ? '' : 'd-none'} px-3 pb-1 pt-2">
                <div class="table-responsive">
                  <table class="table table-borderless align-middle mb-0">
                    <thead>
                      <tr>
                        <th class="text-start" style="font-weight:600;font-size:1rem;">Repetições</th>
                        <th class="text-center" style="font-weight:600;font-size:1rem;">Carga</th>
                        <th class="text-end" style="font-weight:600;font-size:1rem;">Concluído</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${repsArr.map((rep, i) => {
                        let checked = checks[i];
                        const inputCargaId = `input_carga_${ex.id}_${i}`;
                        const cargaValor = valoresCarga[inputCargaId] || (ex.cargas && ex.cargas[i]) || '';
                        return `
                          <tr class="linha-rep${checked ? ' linha-concluida' : ''}">
                            <td class="text-start align-middle" style="vertical-align:middle;">
                              <div class="rep-wrapper align-middle" style="justify-content:flex-start">
                                <span class="fw-bold rep-tachado-content" style="font-size:1.13rem">${rep}</span>
                                ${checked ? '<span class="linha-tachado-overlay"></span>' : ''}
                              </div>
                            </td>
                            <td class="text-center align-middle" style="vertical-align:middle;">
                              <input type="text" inputmode="numeric" pattern="[0-9]*" class="form-control form-control-sm ios-input text-center"
                                style="width:5em;border-radius:14px;display:inline-block;" 
                                id="${inputCargaId}" value="${cargaValor}" placeholder="Kg">
                            </td>
                            <td class="text-end align-middle" style="vertical-align:middle;">
                              <button class="btn btn-concluir ${checked ? 'concluido' : ''}" style="margin-left:auto;" onclick="marcarRep('${ex.id}',${i})" tabindex="0" type="button">
                                ${checked
                                  ? '<svg width="21" height="21"><circle cx="10" cy="10" r="10" fill="#54D972"/><path d="M6 11.2l3.5 3.3M9.5 14.5L15 8" stroke="#fff" stroke-width="2" stroke-linecap="round"/></svg>'
                                  : '<svg width="21" height="21"><circle cx="10" cy="10" r="10" fill="#FFD85E"/></svg>'}
                              </button>
                            </td>
                          </tr>
                        `;
                      }).join('')}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          `;
        })).then(arr=>arr.join(''))}
        </div>
      </div>
      `;
    })).then(arr=>arr.join(''));
    area.innerHTML = html;
    console.log("HTML gerado do treino:", html);

  } catch (e) {
    console.error("Erro ao renderizar:", e);
    document.getElementById('areaTreino').innerHTML = `<div class="alert alert-danger">Erro visual JS: ${e.message}</div>`;
  }
}

async function getNomeGrupoTipoExercicio(e) {
  if (e.exercicio_tipo?.toLowerCase() === 'geral') {
    const { data, error } = await supabase
      .from('exercicios_geral')
      .select('nome,grupo_muscular,video_url')
      .eq('id', e.exercicio_id)
      .single();
    
    if (error) console.error('Erro ao buscar exercício geral:', error);
    return [data?.nome || '-', data?.grupo_muscular || '-', data?.video_url || null];
    
  } else if (e.exercicio_tipo?.toLowerCase() === 'academia') {
    const { data, error } = await supabase
      .from('exercicios_academia')
      .select('nome,grupo_muscular,video_url')
      .eq('id', e.exercicio_id)
      .single();
    
    if (error) console.error('Erro ao buscar exercício academia:', error);
    return [data?.nome || '-', data?.grupo_muscular || '-', data?.video_url || null];
  }
  
  return ['-', '-', null];
}

// Inicialização
window.addEventListener('DOMContentLoaded', async () => {
  getAlunoIdFromUrl();
  await carregarAluno();
  await carregarTreinoAtivo();
});

let timerInterval = null;
let timerSeconds = 0;

window.startTimer = function() {
  if (timerInterval) return;
  timerInterval = setInterval(() => {
    timerSeconds += 1;
    atualizarCronometro();
  }, 1000);
};

window.resetTimer = function() {
  clearInterval(timerInterval);
  timerInterval = null;
  timerSeconds = 0;
  atualizarCronometro();
};

function atualizarCronometro() {
  const min = String(Math.floor(timerSeconds / 60)).padStart(2, '0');
  const seg = String(timerSeconds % 60).padStart(2, '0');
  document.getElementById('cronometro').textContent = `${min}:${seg}`;
}

document.getElementById('btnCheckin').addEventListener('click', async function() {
  if (!alunoId || !treinoAtivo?.academia_id) {
    document.getElementById('mensagemCheckin').textContent = "Erro: dados insuficientes!";
    return;
  }
  
  // Verifica se já fez check-in hoje
  const inicioHoje = new Date();
  inicioHoje.setHours(0,0,0,0);
  const fimHoje = new Date();
  fimHoje.setHours(23,59,59,999);

  const { data: checkinsHoje } = await supabase
    .from('checkins')
    .select('*')
    .eq('aluno_id', alunoId)
    .eq('academia_id', treinoAtivo.academia_id)
    .gte('data_checkin', inicioHoje.toISOString())
    .lte('data_checkin', fimHoje.toISOString());

  if (checkinsHoje && checkinsHoje.length > 0) {
    document.getElementById('mensagemCheckin').textContent = "Você já fez check-in hoje!";
    return;
  }

  document.getElementById('btnCheckin').disabled = true;
  const { error } = await supabase.from('checkins').insert([{
    aluno_id: alunoId,
    academia_id: treinoAtivo.academia_id,
    data_checkin: new Date().toISOString()
  }]);
  
  if (!error) {
    document.getElementById('mensagemCheckin').textContent = "✅ Check-in registrado!";
  } else {
    document.getElementById('mensagemCheckin').textContent = "Erro no check-in!";
    document.getElementById('btnCheckin').disabled = false;
  }
});

window.toggleVideo = function(exId, videoUrl) {
  const videoBox = document.getElementById(`videoBox_${exId}`);
  const iframe = document.getElementById(`iframe_${exId}`);
  
  if (videoBox.style.maxHeight === '0px' || !videoBox.style.maxHeight) {
    // Abre o vídeo
    iframe.src = videoUrl;
    videoBox.style.maxHeight = '400px';
  } else {
    // Fecha o vídeo
    iframe.src = '';
    videoBox.style.maxHeight = '0px';
  }
};

window.toggleTreino = function(letra) {
  treinoExpandido[letra] = !treinoExpandido[letra];
  renderizarExercicios();
};

window.toggleExercicio = function(id) {
  exercicioExpandido[id] = !exercicioExpandido[id];
  renderizarExercicios();
};

window.marcarRep = function(exId, i) {
  const cbId = `${exId}_rep${i}`;
  estadoCheckboxes[cbId] = !estadoCheckboxes[cbId];
  salvarEstadoCheckboxes();
  renderizarExercicios();
};

window.desmarcarTodos = function() {
  Object.keys(estadoCheckboxes).forEach(k => estadoCheckboxes[k]=false);
  salvarEstadoCheckboxes();
  renderizarExercicios();
};

setTimeout(() => {
  const btn = document.querySelector('.btn-warning[onclick*="desmarcarTodos"]');
  if (btn) {
    btn.addEventListener('touchstart', function(e) {
      e.preventDefault();
      window.desmarcarTodos();
    });
    btn.addEventListener('click', function(e) {
      window.desmarcarTodos();
    });
  }
}, 150);
