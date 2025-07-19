// Este script é executado no contexto da página (main world)

function runAutomation(promptText) {
  try {
    console.log(`[PAGE SCRIPT] Executando automação para: "${promptText}"`);

    const tagAreaComponent = document.querySelector('rv-app')
      ?.shadowRoot?.querySelector('create-page')
      ?.shadowRoot?.querySelector('#prompt-area')
      ?.shadowRoot?.querySelector('#prompt-content');

    if (!tagAreaComponent) {
      throw new Error("[PAGE SCRIPT] Não foi possível encontrar o componente de prompt.");
    }

    // Define o valor e dispara os eventos no contexto correto
    tagAreaComponent.value = promptText;
    tagAreaComponent.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
    tagAreaComponent.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));
    
    console.log('[PAGE SCRIPT] Prompt inserido e eventos disparados.');

    // Pequena pausa para o framework da página reagir à mudança de estado
    setTimeout(() => {
      const generateButtonContainer = document.querySelector('rv-app')
        ?.shadowRoot?.querySelector('create-page')
        ?.shadowRoot?.querySelector('#prompt-area')
        ?.shadowRoot?.querySelector('rv-gradient-button.generate');
      
      if (!generateButtonContainer) {
        throw new Error("[PAGE SCRIPT] Não foi possível encontrar o container do botão 'Generate'.");
      }

      if (generateButtonContainer.hasAttribute('disabled')) {
        console.error("[PAGE SCRIPT] ERRO: O botão 'Generate' continua desabilitado. A automação falhou.");
        // Opcional: Enviar uma mensagem de volta para o content script com o erro
        return;
      }
      
      const actualButton = generateButtonContainer.shadowRoot?.querySelector('button[part="base"]');
      
      if (!actualButton) {
        throw new Error("[PAGE SCRIPT] Não foi possível encontrar o botão clicável (actualButton) dentro do shadow DOM.");
      }

      actualButton.click();
      console.log("[PAGE SCRIPT] SUCESSO! O botão 'Generate' foi clicado.");

    }, 500); // 500ms é geralmente suficiente para a UI reativa atualizar

  } catch (error) {
    console.error("Erro no script da página:", error);
  }
}

// Escuta por mensagens vindas do content_script
window.addEventListener("message", (event) => {
  // Apenas aceita mensagens de nós mesmos e com o tipo correto
  if (event.source === window && event.data.type && event.data.type === "EXECUTE_PROMPT_FROM_EXTENSION") {
    runAutomation(event.data.prompt);
  }
}, false);