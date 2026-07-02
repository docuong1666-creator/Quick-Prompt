
const mainScreen = document.getElementById("main-screen");
const formScreen = document.getElementById("form-screen");
const promptList = document.getElementById("prompt-list");
const formTitle = document.getElementById("form-title");
const inputTitle = document.getElementById("input-title");
const inputContent = document.getElementById("input-content");
const settingsScreen = document.getElementById("settings-screen");
const inputApiKey = document.getElementById("input-apikey");
const inputModel = document.getElementById("input-model");

let editingId = null;



function loadPrompts() {
  chrome.storage.local.get("prompts", (data) => {
    const prompts = data.prompts || [];
    promptList.innerHTML = "";

    prompts.forEach((prompt) => {
      const item = document.createElement("div");
      item.className = "prompt-item";

      item.addEventListener("click", () => {
        runPrompt(prompt);
      });

      const name = document.createElement("span");
      name.className = "prompt-name";
      name.textContent = prompt.title;

      const editBtn = document.createElement("button");
      editBtn.textContent = "✎";
      editBtn.title = "Edit";
      editBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        openEditForm(prompt);
      });

      const deleteBtn = document.createElement("button");
      deleteBtn.textContent = "✕";
      deleteBtn.title = "Delete";
      deleteBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        deletePrompt(prompt.id);
      });

      item.appendChild(name);
      item.appendChild(editBtn);
      item.appendChild(deleteBtn);
      promptList.appendChild(item);
    });
  });
}

function showMain() {
  mainScreen.style.display = "block";
  formScreen.style.display = "none";
  settingsScreen.style.display = "none";
  loadPrompts();
}

function showForm() {
  mainScreen.style.display = "none";
  formScreen.style.display = "block";
}

function showSettings() {
  mainScreen.style.display = "none";
  formScreen.style.display = "none";
  settingsScreen.style.display = "block";

  chrome.storage.local.get(["apiKey", "model"], (data) => {
  if (data.apiKey) inputApiKey.value = data.apiKey;
  if (data.model) inputModel.value = data.model;
});
}

function openEditForm(prompt) {
  editingId = prompt.id;
  formTitle.textContent = "Edit Prompt";
  inputTitle.value = prompt.title;
  inputContent.value = prompt.content;
  showForm();
}

function deletePrompt(id) {
  chrome.storage.local.get("prompts", (data) => {
    const prompts = data.prompts || [];
    const updated = prompts.filter((p) => p.id !== id);
    chrome.storage.local.set({ prompts: updated }, () => {
      loadPrompts();
    });
  });
}

async function runPrompt(prompt) {
  const output = document.getElementById("output") || createOutputDiv();
  output.textContent = "Running...";

  const oldCopyBtn = document.getElementById("copy-btn");
  if (oldCopyBtn) oldCopyBtn.remove();

  try {
    const data = await chrome.storage.local.get(["apiKey", "model"]);
    if (!data.apiKey) {
      output.textContent = "No API key found. Please go to Settings ⚙️ and enter your Groq API key.";
      return;
    }

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const response = await chrome.tabs.sendMessage(tab.id, { action: "getContent" });
    const pageText = response.content.slice(0, 3000);

    const aiResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${data.apiKey}`
      },
      body: JSON.stringify({
        model: data.model || "openai/gpt-oss-120b",
        max_tokens: 1024,
        messages: [
          {
            role: "user",
            content: `${prompt.content}\n\n${pageText}`
          }
        ]
      })
    });

    const aiData = await aiResponse.json();

    if (aiData.error) {
      output.textContent = "API Error: " + aiData.error.message;
      return;
    }

    output.textContent = aiData.choices[0].message.content;


    const copyBtn = document.createElement("button");
    copyBtn.id = "copy-btn";
    copyBtn.textContent = "Copy";
    copyBtn.addEventListener("click", () => {
      navigator.clipboard.writeText(output.textContent);
      copyBtn.textContent = "Copied!";
      setTimeout(() => {
        copyBtn.textContent = "Copy";
      }, 2000);
    });

    document.querySelector(".content").appendChild(copyBtn);

  } catch (error) {
    output.textContent = "Error: " + error.message;
  }
}

function createOutputDiv() {
  const div = document.createElement("div");
  div.id = "output";
  document.querySelector(".content").appendChild(div);
  return div;
}



document.getElementById("settings-btn").addEventListener("click", () => {
  showSettings();
});

document.getElementById("settings-cancel-btn").addEventListener("click", () => {
  showMain();
});

document.getElementById("settings-save-btn").addEventListener("click", () => {
  const apiKey = inputApiKey.value.trim();
  const model = inputModel.value.trim();

  if (!apiKey) {
    alert("Please enter your API key.");
    return;
  }

  chrome.storage.local.set({ apiKey, model }, () => {
    alert("Settings saved!");
    showMain();
  });
});

document.getElementById("add-btn").addEventListener("click", () => {
  editingId = null;
  formTitle.textContent = "New Prompt";
  inputTitle.value = "";
  inputContent.value = "";
  showForm();
});

document.getElementById("save-btn").addEventListener("click", () => {
  const title = inputTitle.value.trim();
  const content = inputContent.value.trim();

  if (!title || !content) {
    alert("Please fill in both fields.");
    return;
  }

  chrome.storage.local.get("prompts", (data) => {
    const prompts = data.prompts || [];

    if (editingId === null) {
      prompts.push({
        id: Date.now(),
        title,
        content
      });
    } else {
      const index = prompts.findIndex((p) => p.id === editingId);
      prompts[index].title = title;
      prompts[index].content = content;
    }

    chrome.storage.local.set({ prompts }, () => {
      showMain();
    });
  });
});

document.getElementById("cancel-btn").addEventListener("click", () => {
  showMain();
});

loadPrompts();
