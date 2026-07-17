const STORAGE_KEY = "seoControlClients";

const workflowSteps = [
    "Cliente recebido / round iniciado",
    "Código e escopo confirmados",
    "Planilha 1A recebida",
    "Planilhas 1B e 1C geradas no Claude",
    "Sugestões de SEO preenchidas na planilha 1C",
    "Revisão com o time",
    "Aprovação do time",
    "Versão final da planilha gerada",
    "E-mail enviado ao cliente",
    "Aprovação do cliente",
    "Upload realizado no portal"
];

const state = {
  clients: loadClients(),
  currentView: "dashboard"
};

const views = {
  dashboard: document.querySelector("#dashboard-view"),
  clients: document.querySelector("#clients-view"),
  "new-client": document.querySelector("#new-client-view")
};

const pageTitle = document.querySelector("#page-title");
const pageSubtitle = document.querySelector("#page-subtitle");
const form = document.querySelector("#client-form");
const asinList = document.querySelector("#asin-list");
const roundList = document.querySelector("#round-list");
const sheetList = document.querySelector("#sheet-list");
const workflowList = document.querySelector("#workflow-list");
const deleteClientButton = document.querySelector("#delete-client-button");

document.querySelectorAll(".menu-item").forEach((button) => {
  button.addEventListener("click", () => navigate(button.dataset.view));
});

document.querySelector("#new-client-button").addEventListener("click", () => {
  prepareNewClient();
  navigate("new-client");
});

document.querySelector("#cancel-button").addEventListener("click", () => {
  resetForm();
  navigate("clients");
});

document.querySelector("#add-asin-button").addEventListener("click", () => addAsinRow());
document
    .querySelector("#add-round-button")
    .addEventListener("click", () => {
        addRoundRow({
            number: getNextRoundNumber()
        });
    });
document.querySelector("#add-sheet-button").addEventListener("click", () => addSheetRow());

document.querySelector("#client-search").addEventListener("input", (event) => {
  renderClientList(event.target.value);
});

deleteClientButton.addEventListener("click", () => {
  const id = document.querySelector("#client-id").value;

  if (!id) return;

  const client = state.clients.find((item) => item.id === id);
  const confirmed = window.confirm(`Excluir o cliente "${client?.name || ""}"?`);

  if (!confirmed) return;

  state.clients = state.clients.filter((item) => item.id !== id);
  saveClients();
  resetForm();
  navigate("clients");
});

form.addEventListener("submit", (event) => {
  event.preventDefault();

  const client = collectFormData();
  const existingIndex = state.clients.findIndex((item) => item.id === client.id);

  if (existingIndex >= 0) {
    state.clients[existingIndex] = client;
  } else {
    state.clients.unshift(client);
  }

  saveClients();
  resetForm();
  navigate("clients");
});

function navigate(viewName) {
  state.currentView = viewName;

  Object.entries(views).forEach(([name, view]) => {
    view.classList.toggle("active", name === viewName);
  });

  document.querySelectorAll(".menu-item").forEach((button) => {
    button.classList.toggle("active", button.dataset.view === viewName);
  });

  const titles = {
    dashboard: ["Dashboard", "Acompanhe o andamento de cada cliente."],
    clients: ["Clientes", "Consulte e atualize todos os controles."],
    "new-client": [
      document.querySelector("#client-id").value ? "Editar cliente" : "Novo cliente",
      "Preencha as informações e acompanhe o fluxo de otimização."
    ]
  };

  [pageTitle.textContent, pageSubtitle.textContent] = titles[viewName];

  if (viewName === "dashboard") renderDashboard();
  if (viewName === "clients") renderClientList();
}

function prepareNewClient() {
  resetForm();
  addAsinRow();
  addRoundRow({
    number: 1
});
  addSheetRow();
  renderWorkflow();
}

function resetForm() {
  form.reset();
  document.querySelector("#client-id").value = "";
  asinList.innerHTML = "";
  roundList.innerHTML = "";
  sheetList.innerHTML = "";
  
  deleteClientButton.classList.add("hidden");
}

function addAsinRow(data = {}) {
  const row = document.querySelector("#asin-template").content.firstElementChild.cloneNode(true);
  fillRepeatRow(row, data);
  attachRemove(row);
  asinList.appendChild(row);
}
function addRoundRow(data = {}) {
    const template = document.querySelector("#round-template");

    const row =
        template.content.firstElementChild.cloneNode(true);

    fillRepeatRow(row, data);

    const workflowValues = normalizeWorkflow(
        data.workflow
    );
function renderRoundWorkflow(
    roundRow,
    values = []
) {
    const container =
        roundRow.querySelector(
            ".round-workflow-list"
        );

    container.innerHTML = "";

    workflowSteps.forEach((step, index) => {
        const item =
            document.createElement("label");

        item.className = "workflow-item";

        const checked =
            Boolean(values[index]?.completed);

        item.innerHTML = `
            <input
                type="checkbox"
                data-step-index="${index}"
                ${checked ? "checked" : ""}
            >

            <div>
                <strong>
                    ${index + 1}. ${step}
                </strong>

                <small>
                    Marque quando esta etapa do round
                    estiver concluída.
                </small>
            </div>

            <input
                type="date"
                data-step-date="${index}"
                value="${values[index]?.date || ""}"
                aria-label="Data da etapa"
            >
        `;

        const checkbox =
            item.querySelector(
                'input[type="checkbox"]'
            );

        checkbox.addEventListener(
            "change",
            () => {
                item.classList.toggle(
                    "completed",
                    checkbox.checked
                );

                updateRoundProgress(roundRow);
            }
        );

        item.classList.toggle(
            "completed",
            checked
        );

        container.appendChild(item);
    });
}
    renderRoundWorkflow(
        row,
        workflowValues
    );

    const numberInput =
        row.querySelector('[data-field="number"]');

    numberInput.addEventListener("input", () => {
        updateRoundTitle(row);
    });

    updateRoundTitle(row);
    updateRoundProgress(row);

    const removeButton =
        row.querySelector(".remove-round");

    removeButton.addEventListener("click", () => {
        const totalRounds =
            roundList.querySelectorAll(".round-card").length;

        if (totalRounds <= 1) {
            alert(
                "O cliente precisa ter pelo menos um round."
            );

            return;
        }

        row.remove();
    });

    roundList.appendChild(row);
}

function addSheetRow(data = {}) {
  const row = document.querySelector("#sheet-template").content.firstElementChild.cloneNode(true);
  fillRepeatRow(row, data);
  attachRemove(row);
  sheetList.appendChild(row);
}

function fillRepeatRow(row, data) {
  row.querySelectorAll("[data-field]").forEach((field) => {
    const key = field.dataset.field;
    field.value = data[key] ?? "";
  });
}

function attachRemove(row) {
  row.querySelector(".remove-row").addEventListener("click", () => row.remove());
}

function collectFormData() {
  const id = document.querySelector("#client-id").value || crypto.randomUUID();

  return {
    id,
    code: valueOf("#client-code"),
    name: valueOf("#client-name"),
    product: valueOf("#client-product"),
    folderNumber: valueOf("#folder-number"),
    surveyLink: valueOf("#survey-link"),
    automaticDate: valueOf("#automatic-date"),
    gongLink: valueOf("#gong-link"),
    frequency: valueOf("#optimization-frequency"),
    status: valueOf("#general-status"),
    asins: collectRepeatRows(asinList),
    rounds: collectRepeatRows(roundList),
    sheets: collectRepeatRows(sheetList),
    workflow: workflowSteps.map((step, index) => ({
      step,
      completed: document.querySelector(`[data-workflow-index="${index}"]`).checked,
      date: document.querySelector(`[data-workflow-date="${index}"]`).value
    })),
    updatedAt: new Date().toISOString()
  };
}

function collectRepeatRows(container) {
  return [...container.querySelectorAll(".repeat-card")]
    .map((row) => {
      const result = {};

      row.querySelectorAll("[data-field]").forEach((field) => {
        result[field.dataset.field] = field.value;
      });

      return result;
    })
    .filter((item) => Object.values(item).some(Boolean));
}

function editClient(id) {
  const client = state.clients.find((item) => item.id === id);

  if (!client) return;

  resetForm();

  document.querySelector("#client-id").value = client.id;
  setValue("#client-code", client.code);
  setValue("#client-name", client.name);
  setValue("#client-product", client.product);
  setValue("#folder-number", client.folderNumber);
  setValue("#survey-link", client.surveyLink);
  setValue("#automatic-date", client.automaticDate);
  setValue("#gong-link", client.gongLink);
  setValue("#optimization-frequency", client.frequency);
  setValue("#general-status", client.status);

  (client.asins?.length ? client.asins : [{}]).forEach(addAsinRow);
  (client.rounds?.length ? client.rounds : [{}]).forEach(addRoundRow);
  (client.sheets?.length ? client.sheets : [{}]).forEach(addSheetRow);
  renderWorkflow(client.workflow || []);

  deleteClientButton.classList.remove("hidden");
  navigate("new-client");
}

function renderDashboard() {
  const total = state.clients.length;
  const inProgress = state.clients.filter((client) =>
    ["Em andamento", "Aguardando time", "Aprovado"].includes(client.status)
  ).length;
  const waiting = state.clients.filter((client) => client.status === "Aguardando cliente").length;
  const done = state.clients.filter((client) => client.status === "Concluído").length;

  document.querySelector("#stat-total").textContent = total;
  document.querySelector("#stat-progress").textContent = inProgress;
  document.querySelector("#stat-waiting").textContent = waiting;
  document.querySelector("#stat-done").textContent = done;

  renderCards(
    document.querySelector("#dashboard-client-list"),
    state.clients.slice(0, 5)
  );
}

function renderClientList(searchTerm = "") {
  const normalized = searchTerm.trim().toLowerCase();

  const clients = state.clients.filter((client) => {
    const searchable = `${client.code} ${client.name} ${client.product}`.toLowerCase();
    return searchable.includes(normalized);
  });

  renderCards(document.querySelector("#client-list"), clients);
}

function renderCards(container, clients) {
  container.innerHTML = "";
  container.classList.toggle("empty-state", clients.length === 0);

  if (!clients.length) {
    container.textContent = "Nenhum cliente encontrado.";
    return;
  }

  clients.forEach((client) => {
    const completed = client.workflow?.filter((step) => step.completed).length || 0;
    const progress = Math.round((completed / workflowSteps.length) * 100);

    const card = document.createElement("article");
    card.className = "client-card";

    card.innerHTML = `
      <div>
        <h3>${escapeHtml(client.name || "Cliente sem nome")}</h3>
        <p>${escapeHtml(client.code || "Sem código")} · ${escapeHtml(client.product || "Produto não informado")}</p>
      </div>

      <div>
        <span class="status-badge">${escapeHtml(client.status || "Em andamento")}</span>
        <small>${escapeHtml(client.frequency || "Frequência não informada")}</small>
      </div>

      <div class="progress-wrapper">
        <div class="progress-bar">
          <div class="progress-fill" style="width: ${progress}%"></div>
        </div>
        <small>${progress}% do fluxo concluído</small>
      </div>

      <button class="secondary-button" type="button">Abrir controle</button>
    `;

    card.querySelector("button").addEventListener("click", () => editClient(client.id));
    container.appendChild(card);
  });
}

function valueOf(selector) {
  return document.querySelector(selector).value.trim();
}

function setValue(selector, value = "") {
  document.querySelector(selector).value = value;
}

function loadClients() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

function saveClients() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.clients));
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

prepareNewClient();
renderDashboard();
