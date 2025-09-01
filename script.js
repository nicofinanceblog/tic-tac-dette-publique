const DebtApp = (() => {
  // --- Constants ---
  const CONFIG = {
    CURRENT_DEBT_DATE: "2025-03-31",
    POPULATION: 68_520_000,
    TAX_HOUSEHOLDS: 18_200_000,
    CURRENT_DEBT_VALUE: 3_345_400_000_000,
    DEBT_INCREASE_PER_MONTH: 13_000_000_000,
    EXCHANGE_RATE: 1.1676,
    DEFAULT_LANG: "fr",
    DEFAULT_RATE: 2.95,
  };

  // --- State ---
  let baseDebt = 0;
  let perSecondDebtIncrease = 0;
  let lang = CONFIG.DEFAULT_LANG;
  let interestRate = CONFIG.DEFAULT_RATE;
  let lastUpdate = 0;

  // --- DOM Elements ---
  const elements = Object.fromEntries(
    [
      "debt",
      "perCapita",
      "perTaxpayingHousehold",
      "perSecond",
      "perDay",
      "langBtn",
      "langBtnText",
      "flagIcon",
      "title",
      "interestRate",
      "interestValue",
      "interestTableBody",
      "interestTitle",
      "interestLabel",
      "labelPerCapita",
      "labelPerHousehold",
      "labelPerSecond",
      "labelPerDay",
    ].map((id) => [id, document.getElementById(id)])
  );

  const modal = {
    container: document.getElementById("helpModal"),
    close: document.getElementById("closeModal"),
    title: document.getElementById("modalTitle"),
    body: document.getElementById("modalBody"),
    triggers: document.querySelectorAll(".help-trigger"),
  };

  // --- Translations ---
  const translations = {
    fr: {
      title: "Dette publique française en temps réel",
      interestTitle: () => "Coût de la charge de la dette (intérêts payés)",
      interestLabel: "Taux d'intérêt moyen sur la dette française",
      perCapita: "Dette par habitant",
      perTaxpayingHousehold: "Dette par foyer fiscal imposable",
      perSecond: "Augmentation par seconde",
      perDay: "Augmentation par jour",
      table: { period: "Par période", total: "Total", perCapita: "Par habitant", perHousehold: "Par foyer fiscal" },
      rows: ["Année", "Mois", "Jour"],
      langBtn: "English",
    },
    en: {
      title: "French Public Debt in Real Time",
      interestTitle: () => "Cost of the debt (interest paid)",
      interestLabel: "Average interest rate on French debt",
      perCapita: "Debt per capita",
      perTaxpayingHousehold: "Debt per taxpayer",
      perSecond: "Increase per second",
      perDay: "Increase per day",
      table: { period: "Per period", total: "Total", perCapita: "Per capita", perHousehold: "Per taxpayer" },
      rows: ["Year", "Month", "Day"],
      langBtn: "Français",
    },
  };

  const modalContent = {
    fr: {
      title: "Information sur la dette publique française",
      body: `
      <div>
        <!-- <h3 class="text-lg font-semibold mb-2">À propos de ce site</h3> -->
        <p>Ce site suit la dette publique française en temps réel et son coût pour les citoyens.</p>
        <p>Les chiffres sont basés sur des données gouvernementales officielles publiées par l'<a href="https://www.aft.gouv.fr/fr" target="_blank" class="text-blue-500 hover:underline">Agence France Trésor</a> et actualisées lorsque de nouvelles données sont disponibles.</p>
        <h3 class="text-lg font-semibold mb-2 mt-4">Dernières données disponibles sur la dette</h3>
        <p>Montant totale de la dette publique : ${new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(
          CONFIG.CURRENT_DEBT_VALUE
        )} en date du ${new Date(CONFIG.CURRENT_DEBT_DATE).toLocaleDateString("fr-FR")}</p>
        <p>Augmentation mensuelle moyenne de la dette : ${new Intl.NumberFormat("fr-FR", {
          style: "currency",
          currency: "EUR",
          maximumFractionDigits: 0,
        }).format(CONFIG.DEBT_INCREASE_PER_MONTH)} par mois 🚀</p>
        <p>Population française: ${new Intl.NumberFormat("fr-FR", { style: "decimal", maximumFractionDigits: 0 }).format(CONFIG.POPULATION)}</p>
        <p>Foyers fiscaux imposables : ${new Intl.NumberFormat("fr-FR", { style: "decimal", maximumFractionDigits: 0 }).format(CONFIG.TAX_HOUSEHOLDS)}</p>
      </div>
    `,
    },
    en: {
      title: "Information about French Public Debt",
      body: `
      <div>
        <!-- <h3 class="text-lg font-semibold mb-2">About this site</h3> -->
        <p>This site tracks French public debt in real time and its cost to citizens.</p>
        <p>The figures are based on official government data published by the <a href="https://www.aft.gouv.fr/en" target="_blank" class="text-blue-500 hover:underline">Agence France Trésor</a> and updated when new data becomes available.</p>
        <h3 class="text-lg font-semibold mb-2 mt-4">Latest available debt data</h3>
        <p>Total public debt amount: ${new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(
          CONFIG.CURRENT_DEBT_VALUE * CONFIG.EXCHANGE_RATE
        )} at the date of ${new Date(CONFIG.CURRENT_DEBT_DATE).toLocaleDateString("en-US")}</p>
        <p>EUR/USD exchange rate: ${new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 4 }).format(
          CONFIG.EXCHANGE_RATE
        )}</p>
        <p>Average monthly debt increase: ${new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(
          CONFIG.DEBT_INCREASE_PER_MONTH * CONFIG.EXCHANGE_RATE
        )} per month 🚀</p>
        <p>French population: ${new Intl.NumberFormat("en-US", { style: "decimal", maximumFractionDigits: 0 }).format(CONFIG.POPULATION)}</p>
        <p>Taxpaying households: ${new Intl.NumberFormat("en-US", { style: "decimal", maximumFractionDigits: 0 }).format(CONFIG.TAX_HOUSEHOLDS)}</p>
      </div>
    `,
    },
  };

  // --- Utils ---
  const formatCurrency = (value) => {
    const rounded = Math.round(value);
    const opts = { style: "currency", maximumFractionDigits: 0 };
    return new Intl.NumberFormat(lang === "fr" ? "fr-FR" : "en-US", { ...opts, currency: lang === "fr" ? "EUR" : "USD" }).format(
      lang === "fr" ? rounded : rounded * CONFIG.EXCHANGE_RATE
    );
  };

  const calculateInitialDebt = () => {
    const diffMonths = (Date.now() - new Date(CONFIG.CURRENT_DEBT_DATE)) / (1000 * 60 * 60 * 24 * 30.44);
    return CONFIG.CURRENT_DEBT_VALUE + diffMonths * CONFIG.DEBT_INCREASE_PER_MONTH;
  };

  const calculatePerSecondDebtIncrease = () => CONFIG.DEBT_INCREASE_PER_MONTH / (30.44 * 24 * 3600);

  const debounce = (fn, wait) => {
    let timeout;
    return (...args) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => fn(...args), wait);
    };
  };

  // --- Modal logic ---
  const loadModalContent = () => {
    const content = modalContent[lang];
    modal.title.textContent = content.title;
    modal.body.innerHTML = content.body;
  };

  const openModal = () => {
    loadModalContent();
    modal.container.classList.replace("hidden", "flex");
  };

  const closeModal = () => modal.container.classList.add("hidden");

  // --- Main update ---
  const tick = (timestamp) => {
    if (!lastUpdate) lastUpdate = timestamp;
    const delta = (timestamp - lastUpdate) / 1000;
    lastUpdate = timestamp;

    baseDebt += perSecondDebtIncrease * delta;

    const displayDebt = lang === "fr" ? baseDebt : baseDebt * CONFIG.EXCHANGE_RATE;
    const perCapita = displayDebt / CONFIG.POPULATION;
    const perHousehold = displayDebt / CONFIG.TAX_HOUSEHOLDS;
    const perSecond = lang === "fr" ? perSecondDebtIncrease : perSecondDebtIncrease * CONFIG.EXCHANGE_RATE;
    const perDay = perSecond * 86400;

    // Update cards
    elements.debt.textContent = formatCurrency(displayDebt);
    elements.perCapita.textContent = formatCurrency(perCapita);
    elements.perTaxpayingHousehold.textContent = formatCurrency(perHousehold);
    elements.perSecond.textContent = formatCurrency(perSecond);
    elements.perDay.textContent = formatCurrency(perDay);

    // Interest table
    const annual = displayDebt * (interestRate / 100);
    const rows = [annual, annual / 12, annual / 365];
    const rowLabels = translations[lang].rows;

    elements.interestTitle.textContent = translations[lang].interestTitle(interestRate);
    elements.interestTableBody.innerHTML = rows
      .map(
        (val, i) => `
      <tr>
        <td class="border border-gray-600 px-2 py-1">${rowLabels[i]}</td>
        <td class="border border-gray-600 px-2 py-1 number">${formatCurrency(val)}</td>
        <td class="border border-gray-600 px-2 py-1 number">${formatCurrency(val / CONFIG.POPULATION)}</td>
        <td class="border border-gray-600 px-2 py-1 number">${formatCurrency(val / CONFIG.TAX_HOUSEHOLDS)}</td>
      </tr>`
      )
      .join("");

    // Update headers
    const [h1, h2, h3, h4] = elements.interestTableBody.closest("table").querySelectorAll("th");
    const { period, total, perCapita: pc, perHousehold: ph } = translations[lang].table;
    [h1.textContent, h2.textContent, h3.textContent, h4.textContent] = [period, total, pc, ph];

    requestAnimationFrame(tick);
  };

  // --- Language toggle ---
  const toggleLanguage = () => {
    lang = lang === "fr" ? "en" : "fr";
    const t = translations[lang];

    elements.title.textContent = t.title;
    elements.interestLabel.textContent = t.interestLabel;
    elements.interestTitle.textContent = t.interestTitle(interestRate);
    elements.labelPerCapita.textContent = t.perCapita;
    elements.labelPerHousehold.textContent = t.perTaxpayingHousehold;
    elements.labelPerSecond.textContent = t.perSecond;
    elements.labelPerDay.textContent = t.perDay;
    elements.langBtnText.textContent = t.langBtn;
    elements.flagIcon.src = lang === "fr" ? "images/flag-us.svg" : "images/flag-fr.svg";
    elements.flagIcon.alt = lang.toUpperCase();

    lastUpdate = 0;
    requestAnimationFrame(tick);
  };

  // --- Initialization ---
  const init = () => {
    if (!Object.values(elements).every(Boolean)) {
      console.error("Failed to initialize: Missing DOM elements");
      return;
    }

    baseDebt = calculateInitialDebt();
    perSecondDebtIncrease = calculatePerSecondDebtIncrease();

    // Interest slider
    elements.interestRate.value = interestRate;
    elements.interestValue.textContent = `${interestRate.toFixed(2)}%`;

    const updateInterestRate = (val) => {
      interestRate = Math.max(0, val); // prevent negatives
      elements.interestValue.textContent = `${interestRate.toFixed(2)}%`;
      elements.interestRate.value = interestRate;
      elements.interestRate.setAttribute("aria-valuenow", interestRate.toFixed(2));
      lastUpdate = 0;
    };

    elements.interestRate.addEventListener(
      "input",
      debounce((e) => updateInterestRate(parseFloat(e.target.value) || 0), 100)
    );

    // NEW: Button controls for slider
    const btnMinus = document.getElementById("decreaseRate");
    const btnPlus = document.getElementById("increaseRate");

    if (btnMinus && btnPlus) {
      btnMinus.addEventListener("click", () => updateInterestRate(interestRate - 0.5));
      btnPlus.addEventListener("click", () => updateInterestRate(interestRate + 0.05));
    }

    // Language toggle
    elements.langBtn.addEventListener("click", toggleLanguage);

    // Modal events
    modal.triggers.forEach((tr) => tr.addEventListener("click", openModal));
    modal.close.addEventListener("click", closeModal);
    modal.container.addEventListener("click", (e) => e.target === modal.container && closeModal());

    requestAnimationFrame(tick);
  };

  return { init };
})();

DebtApp.init();
