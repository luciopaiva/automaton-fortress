
class DwarfWater {

    constructor (rawRules, rawMap) {
        /** @type {String} */
        this.rawRules = rawRules;
        /** @type {String} */
        this.rawMap = rawMap;
        this.rules = RulesParser.parse(this.rawRules);
        console.info(this.rules);

        this.resetMap();
        this.resetTable();

        this.wall = Tile.WALL;

        this.stepFunction = this.step.bind(this);
        setInterval(this.stepFunction, 500);
    }

    step() {
        for (const [x, y] of range2d(this.mapWidth, this.mapHeight)) {
            this.backingMap[x][y] = this.map[x][y];
        }

        // iterate and update each cell - IMPORTANT: each cell can only write on its own position during its update
        let dirtyTiles = [];
        for (const [x, y] of range2d(this.mapWidth, this.mapHeight)) {
            const state = this.getState(x, y);

            for (const rule of this.rules) {
                if (rule.matches(state)) {
                    this.backingMap[x][y] = Tile.fromSymbol(rule.result);
                    dirtyTiles.push([x, y]);
                    break;
                }
            }
        }

        this.swapMapBuffers();

        for (const [x, y] of dirtyTiles) {
            DwarfWater.updateCell(this.tableCells[x][y], this.map[x][y]);
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

    resetMap() {
        const rawMapLines = this.rawMap.split("\n").map(trimRight);
        this.mapHeight = rawMapLines.length;
        this.mapWidth = rawMapLines.reduce((maxWidth, line) => Math.max(maxWidth, line.length), 0);
        /** @type {Tile[][]} */
        this.map = Array.from(Array(this.mapWidth), () => Array(this.mapHeight));
        /** @type {Tile[][]} */
        this.backingMap = Array.from(Array(this.mapWidth), () => Array(this.mapHeight));

        for (const [x, y] of range2d(this.mapWidth, this.mapHeight)) {
            const rawSymbol = rawMapLines[y][x];
            const symbol = (rawSymbol === " " || rawSymbol === undefined) ? Tile.EMPTY.symbol : rawSymbol;
            this.map[x][y] = Tile.fromSymbol(symbol);
        }
    }

    resetTable() {
        if (!this.table) {
            this.table = document.createElement("table");
            this.tableCells = Array.from(Array(this.mapWidth), () => Array(this.mapHeight));

            for (const y of range(this.mapHeight)) {
                const row = this.table.insertRow();
                for (const x of range(this.mapWidth)) {
                    const cell = row.insertCell();
                    cell.setAttribute("id", `cell_${x}_${y}`);
                    this.tableCells[x][y] = cell;
                }
            }
        }

        for (const [x, y] of range2d(this.mapWidth, this.mapHeight)) {
            const tile = this.map[x][y];
            const cell = this.tableCells[x][y];
            DwarfWater.updateCell(cell, tile);
        }

        if (!this.table.parentElement) {
            document.body.appendChild(this.table);
        }
    }

    static updateCell(cell, tile) {
        cell.innerText = tile.display;
        for (const name of cell.classList.values()) cell.classList.remove(name);
        cell.classList.add(tile.cssClass);
    }

    static async run() {
        const rawRules = await getFile("rules.txt");
        const rawMap = await getFile("map.txt");
        new DwarfWater(rawRules, rawMap);
    }
}

window.addEventListener("load", DwarfWater.run);
