const state = {
    count: 3,
    sides: 6,
    isRolling: false,
    values: [5, 6, 2],
    history: [],
    rollNumber: 0,
};

const STORAGE_KEY = "dimedice-state";

const sideLabels = {
    6: "HEXAHEDRON · D6",
    8: "OCTAHEDRON · D8",
    10: "PENTAGONAL TRAPEZOHEDRON · D10",
    12: "DODECAHEDRON · D12",
    20: "ICOSAHEDRON · D20"
};

const diceStage = document.getElementById("dice-stage");
const diceTypeLabel = document.getElementById("dice-type-label");

const diceCountValue = document.getElementById("dice-count-value");
const diceCountDisplay = document.getElementById("dice-count-display");

const decreaseDice = document.getElementById("decrease-dice");
const increaseDice = document.getElementById("increase-dice");

const rollButton = document.getElementById("roll-button");
const rollLabel = document.getElementById("roll-label");

const resultFormula = document.getElementById("result-formula");
const resultTotal = document.getElementById("result-total");

const historyList = document.getElementById("history-list");
const clearHistoryButton = document.getElementById("clear-history");

/* --------------------------------
   Helpers
-------------------------------- */

function randomValue(sides) {
    return Math.floor(Math.random() * sides) + 1;
}

function calculateTotal(values) {
    return values.reduce((sum, value) => sum + value, 0);
}

function saveState() {
    const data = {
        count: state.count,
        sides: state.sides,
        values: state.values,
        history: state.history,
        rollNumber: state.rollNumber,
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function loadState() {
    const savedState = localStorage.getItem(STORAGE_KEY);

    if (!savedState) return;

    try {
        const data = JSON.parse(savedState);

        if (Number.isInteger(data.count) && data.count >= 1 && data.count <= 6) {
            state.count = data.count;
        }

        if ([6, 8, 10, 12, 20].includes(data.sides)) {
            state.sides = data.sides;
        }

        if (
            Array.isArray(data.values) &&
            data.values.length === state.count &&
            data.values.every(
                value => Number.isInteger(value) && value >= 1 && value <= state.sides
            )
        ) {
            state.values = data.values;
        } else {
            state.values = Array.from(
                { length: state.count },
                () => randomValue(state.sides)
            );
        }

        if (Array.isArray(data.history)) {
            state.history = data.history.slice(0, 10);
        }

        if (Number.isInteger(data.rollNumber) && data.rollNumber >= 0) {
            state.rollNumber = data.rollNumber;
        }

    } catch (error) {
        console.warn("Could not load saved DimeDice state.");
    }
}

function resetSavedData() {
    localStorage.removeItem(STORAGE_KEY);

    state.count = 3;
    state.sides = 6;
    state.values = Array.from(
        { length: state.count },
        () => randomValue(state.sides)
    );
    state.history = [];
    state.rollNumber = 0;
    state.isRolling = false;

    updateDiceCount();

    document.querySelectorAll("[data-sides]").forEach(button => {
        button.classList.toggle(
            "selected",
            Number(button.dataset.sides) === state.sides
        );
    });

    renderDice();
    updateResult();
    renderHistory();
}

/* --------------------------------
   Dice Rendering
-------------------------------- */

function createDie(value, index) {
    const die = document.createElement("div");

    if (state.sides === 6) {
        die.className = "die d6-die";
        die.dataset.index = index;

        die.innerHTML = `
            <div class="cube-face cube-front">
                ${createPips(value)}
            </div>

            <div class="cube-face cube-back">
                ${createPips(7 - value)}
            </div>

            <div class="cube-face cube-right">
                ${createPips(2)}
            </div>

            <div class="cube-face cube-left">
                ${createPips(5)}
            </div>

            <div class="cube-face cube-top">
                ${createPips(3)}
            </div>

            <div class="cube-face cube-bottom">
                ${createPips(4)}
            </div>
        `;

        return die;
    }

    die.className = "die poly-die";
    die.dataset.index = index;

    die.innerHTML = `
        <div class="poly-die-face">
            <span class="die-number">${value}</span>
            <span class="die-sides">D${state.sides}</span>
        </div>
    `;

    return die;
}

function createPips(value) {
    const positions = {
        1: ["mc"],
        2: ["tl", "br"],
        3: ["tl", "mc", "br"],
        4: ["tl", "tr", "bl", "br"],
        5: ["tl", "tr", "mc", "bl", "br"],
        6: ["tl", "ml", "bl", "tr", "mr", "br"]
    };

    return `
        <div class="pips">
            ${positions[value]
                .map(position => `<span class="pip ${position}"></span>`)
                .join("")}
        </div>
    `;
}

function renderDice() {
    diceStage.innerHTML = "";

    state.values.forEach((value, index) => {
        diceStage.appendChild(createDie(value, index));
    });

    updateDiceType();
}

function updateDiceType() {
    diceTypeLabel.textContent = sideLabels[state.sides];
}


/* --------------------------------
   Result
-------------------------------- */

function updateResult() {
    const total = calculateTotal(state.values);

    resultFormula.textContent = state.values.join(" + ");
    resultTotal.textContent = total;
}


/* --------------------------------
   Controls
-------------------------------- */

function updateDiceCount() {
    diceCountValue.textContent = state.count;
    diceCountDisplay.textContent = state.count;
}

function setDiceCount(count) {
    if (state.isRolling) return;

    state.count = Math.max(1, Math.min(6, count));

    state.values = Array.from(
        { length: state.count },
        () => randomValue(state.sides)
    );

    updateDiceCount();
    renderDice();
    updateResult();
    saveState();
}

function setSides(sides) {
    if (state.isRolling) return;

    state.sides = sides;

    state.values = Array.from(
        { length: state.count },
        () => randomValue(state.sides)
    );

    document.querySelectorAll("[data-sides]").forEach(button => {
        button.classList.toggle(
            "selected",
            Number(button.dataset.sides) === sides
        );
    });

    renderDice();
    updateResult();
    saveState();
}


/* --------------------------------
   Roll
-------------------------------- */

function performRoll() {
    if (state.isRolling) return;

    state.isRolling = true;

    rollButton.disabled = true;
    rollLabel.textContent = "ROLLING...";

    const dice = [...document.querySelectorAll(".die")];

    dice.forEach((die, index) => {
        die.style.animationDelay = `${index * 35}ms`;
        die.classList.add("rolling");
    });

    setTimeout(() => {

        state.values = Array.from(
            { length: state.count },
            () => randomValue(state.sides)
        );

        state.rollNumber++;

        addHistory();

        saveState();

        renderDice();
        updateResult();

        rollButton.disabled = false;
        rollLabel.textContent = "ROLL";
        state.isRolling = false;

    }, 420);
}


/* --------------------------------
   History
-------------------------------- */

function addHistory() {
    state.history.unshift({
        id: state.rollNumber,
        count: state.count,
        sides: state.sides,
        values: [...state.values],
        total: calculateTotal(state.values)
    });

    state.history = state.history.slice(0, 10);

    renderHistory();
}

function renderHistory() {
    historyList.innerHTML = "";

    if (state.history.length === 0) {
        historyList.innerHTML = `
            <div class="history-empty">
                No rolls yet.<br>
                Your rolls will appear here.
            </div>
        `;

        return;
    }

    state.history.forEach(roll => {

        const item = document.createElement("div");

        item.className = "history-item";

        item.innerHTML = `
            <span class="history-number">
                #${String(roll.id).padStart(2, "0")}
            </span>

            <div class="history-main">
                <div class="history-config">
                    ${roll.count} × D${roll.sides}
                </div>

                <div class="history-values">
                    ${roll.values.join(" + ")}
                </div>
            </div>

            <span class="history-total">
                ${roll.total}
            </span>
        `;

        historyList.appendChild(item);
    });
}

function clearHistory() {
    state.history = [];

    renderHistory();
    saveState();
}

/* --------------------------------
   Keyboard
-------------------------------- */

document.addEventListener("keydown", event => {
    if (event.code !== "Space") return;

    const activeElement = document.activeElement;

    if (
        activeElement &&
        (
            activeElement.tagName === "INPUT" ||
            activeElement.tagName === "TEXTAREA" ||
            activeElement.tagName === "SELECT"
        )
    ) {
        return;
    }

    event.preventDefault();

    performRoll();
});


/* --------------------------------
   Event Listeners
-------------------------------- */

decreaseDice.addEventListener("click", () => {
    if (state.count <= 1 || state.isRolling) return;

    setDiceCount(state.count - 1);
});

increaseDice.addEventListener("click", () => {
    if (state.count >= 6 || state.isRolling) return;

    setDiceCount(state.count + 1);
});

document.querySelectorAll("[data-sides]").forEach(button => {
    button.addEventListener("click", () => {
        setSides(Number(button.dataset.sides));
    });
});

rollButton.addEventListener("click", performRoll);

clearHistoryButton.addEventListener("click", clearHistory);

/* --------------------------------
   Initial State
-------------------------------- */

state.values = [6, 6, 6];

loadState();

updateDiceCount();

renderDice();
updateResult();
renderHistory();