// js/alunos-crud.js

let academiaId = null;
let alunos = [];

const modalAluno = new bootstrap.Modal(document.getElementById('modalAluno'));

async function getAcademiaId() {
  const { data: { user } } = await supabase.auth.getUser();
  academiaId = user?.id;
  if (!academiaId) window.location.href = 'login-academia.html';
}

async function carregarAlunos() {
  const busca = document.getElementById('buscaAluno').value.trim().toLowerCase();
  let query = supabase
    .from('alunos')
    .select('*')
    .eq('academia_id', academiaId)
    .order('nome', { ascending: true });

  const { data, error } = await query;

  alunos = data || [];
  let filtrados = alunos;
  if (busca) {
    filtrados = alunos.filter(a =>
      a.nome.toLowerCase().includes(busca) ||
      (a.email && a.email.toLowerCase().includes(busca)) ||
      (a.telefone && a.telefone.toLowerCase().includes(busca))
    );
  }

  mostrarAlunos(filtrados);
  document.getElementById('alunosError').textContent = error?.message || '';
}

function mostrarAlunos(lista) {
  const tbody = document.getElementById('listaAlunos');
  tbody.innerHTML = '';
  lista.forEach(a => {
    tbody.innerHTML += `
      <tr>
        <td>${a.nome}</td>
        <td>${a.email}</td>
        <td>
          ${a.telefone ? `<a href="https://wa.me/${a.telefone.replace(/\D/g,'')}" target="_blank" class="btn btn-sm btn-success">WhatsApp</a>` : ''}
          ${a.telefone}
        </td>
        <td>
          <button class="btn btn-sm btn-info" onclick="abrirEditarAluno('${a.id}')">Editar</button>
          <button class="btn btn-sm btn-danger" onclick="excluirAluno('${a.id}')">Excluir</button>
          <button class="btn btn-sm btn-secondary" onclick="abrirVerAluno('${a.id}')">Visualizar</button>
        </td>
      </tr>
    `;
  });
}

window.abrirCadastroAluno = function() {
    document.getElementById('formAluno').reset();
    document.getElementById('alunoId').value = "";
    modalAluno.show();
    document.getElementById('tituloModalAluno').textContent = "Cadastrar Aluno";
  };  

window.abrirEditarAluno = function(id) {
  const aluno = alunos.find(a => a.id === id);
  if (!aluno) return;
  document.getElementById('alunoId').value = aluno.id;
  document.getElementById('nome').value = aluno.nome || "";
  document.getElementById('email').value = aluno.email || "";
  document.getElementById('telefone').value = aluno.telefone || "";
  document.getElementById('peso').value = aluno.peso || "";
  document.getElementById('altura').value = aluno.altura || "";
  document.getElementById('problemas_saude').value = aluno.problemas_saude || "";
  document.getElementById('observacoes').value = aluno.observacoes || "";
  modalAluno.show();
  document.getElementById('tituloModalAluno').textContent = "Editar Aluno";
};

window.abrirVerAluno = function(id) {
  window.location.href = `aluno-detalhes.html?id=${id}`;
};

// Salva novo/edita aluno
document.getElementById('formAluno').addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('alunoId').value;
    const obj = {
      nome: document.getElementById('nome').value.trim(),
      email: document.getElementById('email').value.trim(),
      telefone: document.getElementById('telefone').value.trim(),
      peso: Number(document.getElementById('peso').value),
      altura: Number(document.getElementById('altura').value),
      problemas_saude: document.getElementById('problemas_saude').value.trim(),
      observacoes: document.getElementById('observacoes').value.trim(),
      academia_id: academiaId,
      ativo: true
    };
  
    let resp;
    if (id) {
      resp = await supabase.from('alunos').update(obj).eq('id', id);
    } else {
      resp = await supabase.from('alunos').insert([obj]);
    }
  
    if (resp.error) {
      document.getElementById('alunosError').textContent = resp.error.message;
      return;
    }
  
    modalAluno.hide();
    carregarAlunos();
  });  

window.excluirAluno = async function(id) {
  if (!confirm("Deseja excluir este aluno?")) return;
  await supabase.from('alunos').delete().eq('id', id);
  carregarAlunos();
};

document.getElementById('buscaAluno').addEventListener('input', carregarAlunos);

window.addEventListener('DOMContentLoaded', async () => {
  await getAcademiaId();
  carregarAlunos();
});

// --- BUSCA E ATUALIZA O NOME DA ACADEMIA NO SIDEBAR ---
async function atualizarSidebarNomeAcademia() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.id) return;
    // Se tabela for 'academias', ajuste aqui
    const { data } = await supabase
      .from('academias')
      .select('nome')
      .eq('id', user.id)
      .single();
    if (data?.nome) {
      document.getElementById('nomeAcademiaSidebar').textContent = data.nome;
    }
  }
  
  window.addEventListener('DOMContentLoaded', atualizarSidebarNomeAcademia);
  