// js/utils.js

// Função para formatar datas DD/MM/YYYY
function formatDate(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('pt-BR');
  }
  
  // Função para mostrar loading em botões (opcional)
  function setBtnLoading(btn, loading = true, msg = 'Aguarde...') {
    if (loading) {
      btn.dataset.oldText = btn.innerHTML;
      btn.innerHTML = `<span class='spinner-border spinner-border-sm'></span> ${msg}`;
      btn.disabled = true;
    } else {
      btn.innerHTML = btn.dataset.oldText;
      btn.disabled = false;
    }
  }
  
  // Utilitário para pegar param da URL
  function getParamFromUrl(name) {
    const params = new URLSearchParams(window.location.search);
    return params.get(name);
  }
  