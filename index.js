
class AutomatonFortress {

    /**
     * @param {String} rawRules
     * @param {String} rawMap
     */
    constructor (rawRules, rawMap) {
        this.isPaused = false;
        this.isMakingNewMap = false;
        this.wall = TileState.WALL;

        this.tileSize = parseInt(getComputedStyle(document.documentElement).getPropertyValue("--tile-size"), 10);

        this.table = document.getElementById("map-table");
        this.prepareTableEvents();

        // toolbar buttons
        this.playButton = document.getElementById("play-button");
        this.playButton.addEventListener("click", () => {
            this.playButton.classList.toggle("hidden");
            this.pauseButton.classList.toggle("hidden");
            this.isPaused = false;
        });
        this.pauseButton = document.getElementById("pause-button");
        this.pauseButton.addEventListener("click", () => {
            this.playButton.classList.toggle("hidden");
            this.pauseButton.classList.toggle("hidden");
            this.isPaused = true;
        });
        this.newMapButton = document.getElementById("new-map-button");
        this.newMapButton.addEventListener("click", this.onNewMapButtonClicked.bind(this));
        this.clearMapButton = document.getElementById("clear-map-button");
        this.clearMapButton.addEventListener("click", this.onClearMapButtonClicked.bind(this));
        this.saveMapButton = document.getElementById("save-map-button");
        this.saveMapButton.addEventListener("click", this.onSaveMapButtonClicked.bind(this));
        this.clearWaterButton = document.getElementById("clear-water-button");
        this.clearWaterButton.addEventListener("click", this.onClearWaterButtonClicked.bind(this));

        // brush palette buttons
        this.selectedBrush = TileState.EMPTY;
        this.brushButtons = document.querySelectorAll("#brush-palette > input");
        this.brushButtons.forEach(button => button.addEventListener("click", () => {
            const brushType = button.getAttribute("id").replace("brush-", "");
            switch (brushType) {
                case "empty": this.selectedBrush = TileState.EMPTY; break;
                case "wall": this.selectedBrush = TileState.WALL; break;
                case "water": this.selectedBrush = TileState.FALLING_WATER; break;
            }
        }));

        document.addEventListener("keypress", this.onHotKeyPressed.bind(this));

        this.rulesTextArea = document.getElementById("rules-script");
        this.rulesTextArea.value = rawRules;
        this.rulesTextArea.addEventListener("input", () => { /* ToDo reload stuff */ });

        this.rules = RulesParser.parse(rawRules);
        console.info(this.rules);

        this.reset(rawMap);

        this.stepFunction = this.step.bind(this);
        setInterval(this.stepFunction, 500);
    }

    onHotKeyPressed(event)  {
        switch (event.key) {
            case "n":
                this.newMapButton.click();
                break;
            case "x":
                this.clearMapButton.click();
                break;
            case "s":
                this.saveMapButton.click();
                break;
            case "p":
                this.isPaused ? this.playButton.click() : this.pauseButton.click();
                break;
            case "e":
                document.getElementById("brush-empty").click();
                break;
            case "b":
                document.getElementById("brush-wall").click();
                break;
            case "w":
                document.getElementById("brush-water").click();
                break;
        }
    }

    onSaveMapButtonClicked() {
        const result = [];
        for (const y of range(this.mapHeight)) {
            let line = "";
            for (const x of range(this.mapWidth)) {
                line += this.map[x][y].symbol;
            }
            result.push(line);
        }
        const mapAsText = result.join("\n");

        // create temporary text area so we can use it to save the map to clipboard
        const tempArea = document.createElement("textarea");
        tempArea.value = mapAsText;
        tempArea.style.position = "absolute";
        tempArea.style.zIndex = "-1";
        document.body.appendChild(tempArea);
        tempArea.select();
        document.execCommand("copy");
        tempArea.remove();
    }

    onNewMapButtonClicked() {
        if (this.isMakingNewMap) {
            return;
        }

        if (!this.isPaused) {
            this.pauseButton.click();
        }
        this.isMakingNewMap = true;

        const mapContainerElement = document.getElementById("map-container");
        const mapSizeHelperElement = document.getElementById("new-map-size-helper");

        mapSizeHelperElement.classList.remove("hidden");
        this.table.classList.add("hidden");

        let newMapWidth = 0;
        let newMapHeight = 0;
        this.newMapOnMouseMove = (event) => {
            const {top, left, width, height} = mapContainerElement.getBoundingClientRect();
            const x = event.pageX - left;
            const y = event.pageY - top;
            const centerX = width / 2;
            const centerY = height / 2;
            const dx = Math.abs(x - centerX);
            const dy = Math.abs(y - centerY);
            newMapWidth = Math.max(4, Math.round((2 * dx) / this.tileSize));
            newMapHeight = Math.max(4, Math.round((2 * dy) / this.tileSize));
            mapSizeHelperElement.innerHTML = `${newMapWidth} x ${newMapHeight}`;

            const helperWidth = this.tileSize * newMapWidth + (newMapWidth * 3);
            const helperHeight = this.tileSize * newMapHeight + (newMapHeight * 3);
            mapSizeHelperElement.style.width = helperWidth + "px";
            mapSizeHelperElement.style.height = helperHeight + "px";
        };
        this.newMapOnMouseUp = () => {
            mapContainerElement.removeEventListener("mousemove", this.newMapOnMouseMove);
            mapContainerElement.removeEventListener("mouseup", this.newMapOnMouseUp);

            this.reset(null, newMapWidth, newMapHeight);
            this.isMakingNewMap = false;
            mapSizeHelperElement.classList.add("hidden");
            this.table.classList.remove("hidden");
        };
        mapContainerElement.addEventListener("mousemove", this.newMapOnMouseMove);
        mapContainerElement.addEventListener("mouseup", this.newMapOnMouseUp);
    }

    onClearMapButtonClicked() {
        if (!this.isPaused) {
            this.pauseButton.click();
        }
        this.reset(null, this.mapWidth, this.mapHeight);
    }

    prepareTableEvents() {
        const onMouse = (event) => {
            const isLeftMousePressed = (event.buttons & 1) !== 0;
            const target = /** @type {HTMLElement} */ event.target;
            if (!isLeftMousePressed || !target) {
                return;
            }
            const x = parseInt(target.getAttribute("data-x"), 10);
            const y = parseInt(target.getAttribute("data-y"), 10);
            if (x && y) {
                this.updateCell(x, y, this.selectedBrush);
            }
        };

        this.table.addEventListener("mousemove", onMouse.bind(this));
        this.table.addEventListener("mousedown", onMouse.bind(this));
    }

    step() {
        if (this.isPaused) {
            return;
        }

        for (const [x, y] of range2d(this.mapWidth, this.mapHeight)) {
            this.backingMap[x][y] = this.map[x][y];
        }

        // iterate and update each cell - IMPORTANT: each cell can only write on its own position during its update
        let dirtyTiles = [];
        for (const [x, y] of range2d(this.mapWidth, this.mapHeight)) {
            const state = this.getState(x, y);

            for (const rule of this.rules) {
                if (rule.matches(state)) {
                    this.backingMap[x][y] = TileState.fromSymbol(rule.result);
                    dirtyTiles.push([x, y]);
                    break;
                }
            }
        }

        this.swapMapBuffers();

        for (const [x, y] of dirtyTiles) {
            this.updateCellDisplay(x, y);
        }
    }

    getState(x, y) {
        return new RuleState(
            this.getTile(x, y),
            this.getTile(x, y - 1),
            this.getTile(x + 1, y),
            this.getTile(x, y + 1),
            this.getTile(x - 1, y)
        );
    }

    getTile(x, y) {
        if (x >= 0 && x < this.mapWidth && y >= 0 && y < this.mapHeight) {
            return this.map[x][y];
        }
        return this.wall;
    }

    swapMapBuffers() {
        const temp = this.map;
        this.map = this.backingMap;
        this.backingMap = temp;
    }

    reset(rawMap, newWidth, newHeight) {
        this.resetMap(rawMap, newWidth, newHeight);
        this.resetTable();
    }

    resetMap(rawMap, newWidth, newHeight) {
        if (rawMap) {
            const rawMapLines = rawMap.split("\n").map(trimRight);
            this.mapHeight = rawMapLines.length;
            this.mapWidth = rawMapLines.reduce((maxWidth, line) => Math.max(maxWidth, line.length), 0);
            /** @type {TileState[][]} */
            this.map = Array.from(Array(this.mapWidth), () => Array(this.mapHeight));
            /** @type {TileState[][]} */
            this.backingMap = Array.from(Array(this.mapWidth), () => Array(this.mapHeight));

            for (const [x, y] of range2d(this.mapWidth, this.mapHeight)) {
                const rawSymbol = rawMapLines[y][x];
                const symbol = (rawSymbol === " " || rawSymbol === undefined) ? TileState.EMPTY.symbol : rawSymbol;
                this.map[x][y] = TileState.fromSymbol(symbol);
            }
        } else {
            this.mapWidth = newWidth;
            this.mapHeight = newHeight;
            /** @type {TileState[][]} */
            this.map = Array.from(Array(this.mapWidth), () => Array(this.mapHeight));
            /** @type {TileState[][]} */
            this.backingMap = Array.from(Array(this.mapWidth), () => Array(this.mapHeight));

            for (const [x, y] of range2d(this.mapWidth, this.mapHeight)) {
                this.map[x][y] = TileState.EMPTY;
            }
        }
    }

    onClearWaterButtonClicked() {
        for (const [x, y] of range2d(this.mapWidth, this.mapHeight)) {
            if (this.map[x][y] === TileState.WATER || this.map[x][y] === TileState.FALLING_WATER) {
                this.map[x][y] = TileState.EMPTY;
            }
        }
        this.resetTable();
    }

    resetTable() {
        this.table.innerHTML = "";
        this.tableCells = Array.from(Array(this.mapWidth), () => Array(this.mapHeight));

        for (const y of range(this.mapHeight)) {
            const row = this.table.insertRow();
            for (const x of range(this.mapWidth)) {
                const cell = row.insertCell();
                cell.setAttribute("id", `cell_${x}_${y}`);
                cell.setAttribute("data-x", x.toString());
                cell.setAttribute("data-y", y.toString());
                this.tableCells[x][y] = cell;
            }
        }

        for (const [x, y] of range2d(this.mapWidth, this.mapHeight)) {
            this.updateCellDisplay(x, y);
        }
    }

    updateCell(x, y, tile) {
        this.map[x][y] = tile;
        this.updateCellDisplay(x, y);
    }

    updateCellDisplay(x, y) {
        const tile = this.map[x][y];
        const cell = this.tableCells[x][y];

        cell.innerText = tile.display;
        for (const name of cell.classList.values()) cell.classList.remove(name);
        cell.classList.add(tile.cssClass);
    }

    static async run() {
        const rawRules = await getFile("rules.txt");
        const rawMap = await getFile("map.txt");
        new AutomatonFortress(rawRules, rawMap);
    }
}

window.addEventListener("load", AutomatonFortress.run);
