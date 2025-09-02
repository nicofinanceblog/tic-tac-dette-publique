const DebtApp = (() => {
  // --- Constants ---
  const CONFIG = {
    DEBT_DATE: "2025-03-31",
    DEBT_VALUE: 3_345_400_000_000,
    DEBT_INCREASE_PER_MONTH: 13_000_000_000,
    POPULATION: 68_520_000,
    TAX_HOUSEHOLDS: 18_200_000,
    DEFAULT_LANG: "fr",
    AVERAGE_BORROWING_RATE: 1.95,
  };

  // --- State ---
  let baseDebt = 0;
  let perSecondDebtIncrease = 0;
  let lang = CONFIG.DEFAULT_LANG;
  let interestRate = CONFIG.AVERAGE_BORROWING_RATE;
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
      table: {
        period: "Par période",
        total: "Total",
        perCapita: "Par habitant",
        perHousehold: "Par foyer fiscal",
      },
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
      table: {
        period: "Per period",
        total: "Total",
        perCapita: "Per capita",
        perHousehold: "Per taxpayer",
      },
      rows: ["Year", "Month", "Day"],
      langBtn: "Français",
    },
  };

  const modalContent = {
    fr: {
      title: "Information sur la dette publique française",
      body: `
      <div>
        <p>Ce site suit la dette publique française en temps réel et son coût pour les citoyens.</p>
        <p>Les chiffres sont basés sur des données gouvernementales officielles publiées par l'<a href="https://www.aft.gouv.fr/fr" target="_blank" rel="noopener noreferrer" class="text-blue-500 hover:underline">Agence France Trésor</a> et actualisées lorsque de nouvelles données sont disponibles.</p>
        <h3 class="text-lg font-semibold mb-2 mt-4">Comment se forme la dette publique ?</h3>
        <p>
          Chaque année, le déficit annuel est emprunté sur les marchés financiers et vient s’ajouter à la dette déjà accumulée lors des années antérieures.
          La dette publique française est donc la somme de tous les déficits passés. La France n'a pas enregistré de surplus budgétaire depuis 1974 et augmente donc sa dette totale chaque année, depuis ${
            new Date(CONFIG.DEBT_DATE).getFullYear() - 1974
          } ans.<br>Tit-tac, tic-tac... 💣
        </p>
        <h3 class="text-lg font-semibold mb-2 mt-4">Dernières données disponibles sur la dette</h3>
        <p>Montant total de la dette publique : ${new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(
          CONFIG.DEBT_VALUE
        )} en date du ${new Date(CONFIG.DEBT_DATE).toLocaleDateString("fr-FR")}</p>
        <p>Taux d'emprunt global moyen : ${new Intl.NumberFormat("fr-FR", { style: "percent", maximumFractionDigits: 2 }).format(
          CONFIG.AVERAGE_BORROWING_RATE / 100
        )}</p>
        <p>Augmentation mensuelle moyenne de la dette : ${new Intl.NumberFormat("fr-FR", {
          style: "currency",
          currency: "EUR",
          maximumFractionDigits: 0,
        }).format(CONFIG.DEBT_INCREASE_PER_MONTH)} par mois 🚀</p>
        <p>Population française: ${new Intl.NumberFormat("fr-FR", { style: "decimal", maximumFractionDigits: 0 }).format(CONFIG.POPULATION)}</p>
        <p>Foyers fiscaux imposables : ${new Intl.NumberFormat("fr-FR", { style: "decimal", maximumFractionDigits: 0 }).format(CONFIG.TAX_HOUSEHOLDS)}</p>
        <h3 class="text-lg font-semibold mb-2 mt-4">Taux d'emprunt global moyen</h3>
        <p>Quand on parle du taux d’intérêt moyen de la dette publique, il ne s’agit pas du taux qu’on verrait aujourd’hui si l’État empruntait à 10 ans. En réalité, l’État français a des milliers d’emprunts en cours, contractés à différents moments, pour des durées variées (2 ans, 10 ans... 30 ans). Chaque emprunt garde le taux qui était en vigueur au moment où il a été signé, jusqu'à son échéance. Par exemple, une obligation émise en 2016 peut encore coûter 0.5% par an alors qu'une obligation plus récente émise en 2025 va coûter 3.5% par an. Le taux moyen apparent mélange donc tous ces emprunts, anciens et récents. Il est calculé en divisant la somme des intérêts payés par l’État par le montant total de la dette.</p>
      </div>
    `,
    },
    en: {
      title: "Information about French Public Debt",
      body: `
      <div>
        <p>This site tracks French public debt in real time and its cost to citizens.</p>
        <p>The figures are based on official government data published by the 
        <a href="https://www.aft.gouv.fr/en" target="_blank" rel="noopener noreferrer" class="text-blue-500 hover:underline">
        Agence France Trésor</a> and updated when new data becomes available.</p>
        <h3 class="text-lg font-semibold mb-2 mt-4">How is public debt formed?</h3>
        <p>
          Each year, the annual deficit is borrowed from financial markets and added to the debt already accumulated in previous years.
          French public debt is therefore the sum of all past deficits. France has not recorded a budget surplus since 1974 and has therefore been increasing its total debt every year since ${
            new Date(CONFIG.DEBT_DATE).getFullYear() - 1974
          } years.<br>Tick-tock, tick-tock... 💣
        </p>
        <h3 class="text-lg font-semibold mb-2 mt-4">Latest available debt data</h3>
        <p>Total public debt amount: ${new Intl.NumberFormat("en-US", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(
          CONFIG.DEBT_VALUE
        )} at the date of ${new Date(CONFIG.DEBT_DATE).toLocaleDateString("en-US")}</p>
        <p>Average overall borrowing rate: ${new Intl.NumberFormat("en-US", { style: "percent", maximumFractionDigits: 2 }).format(
          CONFIG.AVERAGE_BORROWING_RATE / 100
        )}</p>
        <p>Average monthly debt increase: ${new Intl.NumberFormat("en-US", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(
          CONFIG.DEBT_INCREASE_PER_MONTH
        )} per month 🚀</p>
        <p>French population: ${new Intl.NumberFormat("en-US", { style: "decimal", maximumFractionDigits: 0 }).format(CONFIG.POPULATION)}</p>
        <p>Taxpaying households: ${new Intl.NumberFormat("en-US", { style: "decimal", maximumFractionDigits: 0 }).format(CONFIG.TAX_HOUSEHOLDS)}</p>
        <h3 class="text-lg font-semibold mb-2 mt-4">Average interest rate on debt</h3>
        <p>When talking about the average interest rate of public debt, it is not the rate you would see today if the government borrowed at 10 years. In reality, the French government has thousands of ongoing loans, contracted at different times, for various durations (2 years, 10 years... 30 years). Each loan retains the rate that was in effect when it was signed until its maturity. For example, a bond issued in 2016 might still cost 0.5% per year, while a more recent bond issued in 2025 will cost 3.5% per year. The apparent average rate thus mixes all these loans, old and new. It is calculated by dividing the total interest paid by the government by the total amount of debt.</p>
      </div>
    `,
    },
  };

  // --- Utils ---
  const formatCurrency = (value) => {
    const rounded = Math.round(value);
    const opts = { style: "currency", maximumFractionDigits: 0 };
    return new Intl.NumberFormat(lang === "fr" ? "fr-FR" : "en-US", {
      ...opts,
      currency: "EUR",
    }).format(rounded);
  };

  const calculateInitialDebt = () => {
    const diffMonths = (Date.now() - new Date(CONFIG.DEBT_DATE)) / (1000 * 60 * 60 * 24 * 30.44);
    return CONFIG.DEBT_VALUE + diffMonths * CONFIG.DEBT_INCREASE_PER_MONTH;
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

    const displayDebt = baseDebt;
    const perCapita = displayDebt / CONFIG.POPULATION;
    const perHousehold = displayDebt / CONFIG.TAX_HOUSEHOLDS;
    const perSecond = perSecondDebtIncrease;
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

    setTimeout(() => requestAnimationFrame(tick), 100);
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
      btnMinus.addEventListener("click", () => updateInterestRate(interestRate - 0.05));
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
