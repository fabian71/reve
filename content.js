// content.js - O Controlador

/**
 * Injeta o script que será executado no contexto da página.
 */
function injectScript() {
  const script = document.createElement('script');
  script.src = chrome.runtime.getURL('page_script.js');
  script.onload = function() {
    console.log("Script da página injetado e pronto para receber comandos.");
    this.remove(); // Limpa o script do DOM após o carregamento
  };
  (document.head || document.documentElement).appendChild(script);
}

/**
 * Função ATUALIZADA para enviar o prompt para o script injetado.
 * Ela não interage mais diretamente com os elementos da página.
 */
function setPromptAndClick(promptText) {
  console.log(`[CONTENT SCRIPT] Enviando comando para executar prompt: "${promptText}"`);
  // Envia uma mensagem para o window, que será capturada pelo page_script.js
  window.postMessage({ type: "EXECUTE_PROMPT_FROM_EXTENSION", prompt: promptText }, "*");
}


// O resto do seu código de UI continua aqui, sem alterações na lógica de criação.
// A única alteração foi na chamada dentro dos botões para usar a nova `setPromptAndClick`.

// Function to show notification
function showNotification(message, type = "success") {
  const notification = document.createElement("div");
  notification.style.cssText = `
    position: fixed; top: 20px; right: 20px; background: ${type === "error" ? "#f44336" : "#4CAF50"};
    color: white; padding: 15px 20px; border-radius: 5px; font-family: Arial, sans-serif;
    font-size: 14px; z-index: 10000; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    transition: opacity 0.3s ease;
  `;
  notification.textContent = message;
  document.body.appendChild(notification);
  setTimeout(() => {
    notification.style.opacity = "0";
    setTimeout(() => { if (document.body.contains(notification)) document.body.removeChild(notification); }, 300);
  }, 3000);
}

let isAutomationRunning = false;
let automationTimeoutId = null;
let progressDisplay = null;

function createProgressDisplay() {
  progressDisplay = document.createElement("div");
  progressDisplay.id = "reve-art-progress-display";
  progressDisplay.style.cssText = `
    display: none;
    position: fixed;
    bottom: 100px;
    right: 20px;
    background-color: rgba(0, 0, 0, 0.7);
    color: white;
    padding: 10px 15px;
    border-radius: 5px;
    z-index: 9998;
    font-size: 14px;
    font-family: Arial, sans-serif;
  `;
  document.body.appendChild(progressDisplay);
}

function updateProgressDisplay(text) {
  if (progressDisplay) {
    progressDisplay.textContent = text;
    progressDisplay.style.display = text ? "block" : "none";
  }
}

// Create floating button and modal for multiple prompts
function createFloatingButtonAndModal() {
  const button = document.createElement("div");
  button.id = "reve-art-automator-btn";
 button.innerHTML = `
    <div style="
      position: fixed;
      bottom: 20px;
      right: 20px;
      z-index: 9999;
      display: flex;
      align-items: center;
      gap: 12px;
      cursor: pointer;
    ">
        <span style="color: #fff; font-size: 16px; font-weight: bold; text-shadow: 0 0 1px white;">Stock Brothers</span>

        <div style="
          width: 60px;
          height: 60px;
          background: linear-gradient(45deg, #667eea 0%, #764ba2 100%);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          color: white;
          font-weight: bold;
          font-size: 24px;
        ">
          ✨
        </div>
    </div>
  `;
  button.onclick = () => { showPromptModal(); };
  document.body.appendChild(button);

  const modal = document.createElement("div");
  modal.id = "reve-art-automator-modal";
  modal.style.cssText = `display: none; position: fixed; z-index: 10001; left: 0; top: 0; width: 100%; height: 100%; overflow: auto; background-color: rgba(0,0,0,0.4); justify-content: center; align-items: center;`;
  modal.innerHTML = `
    <div style="background-color: #fefefe; margin: auto; padding: 20px; border: 1px solid #888; width: 80%; max-width: 600px; border-radius: 10px; box-shadow: 0 5px 15px rgba(0,0,0,0.3); position: relative;">
      <span style="color: #aaa; float: right; font-size: 28px; font-weight: bold; cursor: pointer;">&times;</span>
      <h2 style="color: #000;">Automatizador de Prompts Reve.art</h2>
      <p style="color: #000;">Digite um prompt por linha:</p>
      <textarea id="prompt-textarea" placeholder="Exemplo:
candid portrait of a smiling elderly woman
futuristic city at sunset, cyberpunk style
beautiful landscape with mountains and lakes" style="width: 100%; height: 150px; margin-bottom: 10px; padding: 10px; border: 1px solid #ddd; border-radius: 5px; font-family: monospace;"></textarea>
      <p style="color: #000;">Atraso entre prompts (segundos):</p>
      <input type="number" id="delay-input" value="45" min="5" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 5px; margin-bottom: 20px;">
      <div style="display: flex; gap: 10px;">
        <button id="start-automation-btn" style="background-color: #4CAF50; color: white; padding: 10px 20px; border: none; border-radius: 5px; cursor: pointer; font-size: 16px; flex: 1;">Iniciar Automação</button>
        <button id="stop-automation-btn" style="background-color: #f44336; color: white; padding: 10px 20px; border: none; border-radius: 5px; cursor: pointer; font-size: 16px; flex: 1;">Parar Automação</button>
      </div>
      <p style="text-align: center; margin-top: 20px; font-size: 12px;"><a href="https://ko-fi.com/dentparanoide" target="_blank" style="color: #000; text-decoration: none;">Se esta ferramenta te ajuda, considere apoiar com um café ❤️</a></p>
    </div>
  `;
  document.body.appendChild(modal);

  const promptTextarea = modal.querySelector("#prompt-textarea");
  const delayInput = modal.querySelector("#delay-input");

  // Load saved prompts and delay
  promptTextarea.value = localStorage.getItem("reveArtPrompts") || "";
  delayInput.value = localStorage.getItem("reveArtDelay") || 45;

  // Save prompts and delay on change
  promptTextarea.addEventListener("input", () => {
    localStorage.setItem("reveArtPrompts", promptTextarea.value);
  });

  delayInput.addEventListener("input", () => {
    localStorage.setItem("reveArtDelay", delayInput.value);
  });

  modal.querySelector("span").onclick = () => { modal.style.display = "none"; };
  window.onclick = (event) => { if (event.target == modal) { modal.style.display = "none"; } };

  modal.querySelector("#stop-automation-btn").onclick = () => {
    if (isAutomationRunning) {
      clearTimeout(automationTimeoutId);
      isAutomationRunning = false;
      updateProgressDisplay("");
      showNotification("Automação parada pelo usuário.", "error");
      modal.style.display = "none";
    }
  };

  modal.querySelector("#start-automation-btn").onclick = async () => {
    const prompts = modal.querySelector("#prompt-textarea").value.split("\n").map(p => p.trim()).filter(p => p.length > 0);
    const delay = parseInt(modal.querySelector("#delay-input").value) * 1000;
    
    if (prompts.length === 0) { showNotification("Digite pelo menos um prompt!", "error"); return; }
    if (delay < 5000) { showNotification("Atraso mínimo é de 5 segundos!", "error"); return; }

    modal.style.display = "none";
    isAutomationRunning = true;

    for (let i = 0; i < prompts.length; i++) {
      if (!isAutomationRunning) break;

      const progressText = `Executando prompt ${i + 1}/${prompts.length}: ${prompts[i]}`;
      updateProgressDisplay(progressText);
      showNotification(progressText);
      setPromptAndClick(prompts[i]);
      
      if (i < prompts.length - 1) {
        const waitingText = `Aguardando ${delay/1000} segundos para o próximo prompt...`;
        updateProgressDisplay(waitingText);
        showNotification(waitingText);
        await new Promise(resolve => { automationTimeoutId = setTimeout(resolve, delay); });
      }
    }
    
    if (isAutomationRunning) {
        showNotification("Automação concluída!");
    }
    updateProgressDisplay("");
    isAutomationRunning = false;
  };

}

function showPromptModal() {
  document.getElementById("reve-art-automator-modal").style.display = "flex";
}

function init() {
  injectScript(); // Injeta o script executor
  createFloatingButtonAndModal(); // Cria a UI
  createProgressDisplay();
  console.log("Reve.art Prompt Automator (Controlador) carregado com sucesso!");
}

// Mesma lógica de inicialização
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}

// Mesma lógica de atalho
document.addEventListener("keydown", (e) => {
  if (e.ctrlKey && e.shiftKey && e.key === "P") {
    e.preventDefault();
    showPromptModal();
  }
});