// js/login-aluno.js

document.getElementById('formLoginAluno').addEventListener('submit', async function(e){
    e.preventDefault();
    const email = document.getElementById('emailAluno').value.trim();
  
    const { data, error } = await supabase
      .from('alunos')
      .select('*')
      .eq('email', email)
      .maybeSingle();
  
    if (!data || error) {
      document.getElementById('msgErro').textContent = "Usuário não localizado ou não cadastrado pela academia.";
      return;
    }
    localStorage.setItem('aluno', JSON.stringify(data));
    window.location.href = "app-aluno.html?id=" + data.id;
  });
  