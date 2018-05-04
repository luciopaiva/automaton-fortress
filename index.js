
async function getFile(url) {
    return new Promise((resolve, reject) => {
        const request = new XMLHttpRequest();
        request.addEventListener("load", function () {
            try {
                resolve(this.responseText);
            } catch (error) {
                reject(error);
            }
        });
        request.open("GET", url);
        request.send();
        request.addEventListener("error", reject)
    });
}

/**
 * Iterates from begin to end. If just one value is provided, it is considered to be `end` and `begin` is set to zero.
 * @param {Number} begin
 * @param {Number} [end]
 * @returns {IterableIterator<Number>}
 */
function *range(begin, end) {
    if (arguments.length === 1) {
        end = begin;
        begin = 0;
    }
    let increment = begin < end ? 1 : -1;
    for (let i = begin; increment > 0 ? i < end : i > end; i += increment) {
        yield i;
    }
}

/**
 * Basically two nested range()s for looping through two variables at once.
 *
 * @param {Number} x0
 * @param {Number} y0
 * @param {Number} [x1]
 * @param {Number} [y1]
 * @returns {IterableIterator<[Number, Number]>}
 */
function *range2d(x0, y0, x1, y1) {
    if (arguments.length === 2) {
        x1 = x0;
        y1 = y0;
        x0 = y0 = 0;
    }
    for (const y of range(y0, y1)) {
        for (const x of range(x0, x1)) {
            yield [x, y];
        }
    }
}

function trimRight(str) {
    return str.replace(/\s*$/, "");
}

class Tile {
    constructor (symbol = "?") {
        this.symbol = symbol;
    }

    static fromSymbol(symbol) {
        switch (symbol) {
            case undefined:
            case " ": return new EmptyTile();
            case "#": return new WallTile();
            case "~": return new WaterTile();
            default: throw new Error(`Invalid character "${symbol}"`);
        }
    }
}

class WallTile extends Tile {
    constructor () {
        super("#");
        this.cssClass = "wall";
    }
}

class WaterTile extends Tile {
    constructor () {
        super("~");
        this.cssClass = "water";
    }
}

class EmptyTile extends Tile {
    constructor () {
        super(" ");
        this.cssClass = "empty";
    }
}

class DwarfWater {

    constructor (rawMap) {
        /** @type {String} */
        this.rawMap = rawMap;
        this.resetMap();
        this.resetTable();
        this.step();
        this.stepFunction = this.step.bind(this);
        setInterval(this.stepFunction, 1000);
    }

    step() {
        for (const [x, y] of range2d(this.mapWidth, this.mapHeight)) {
            // ToDo step cellular automaton
        }
    }

    resetMap() {
        const rawMapLines = this.rawMap.split("\n").map(trimRight);
        this.mapHeight = rawMapLines.length;
        this.mapWidth = rawMapLines.reduce((maxWidth, line) => Math.max(maxWidth, line.length), 0);
        /** @type {Tile[][]} */
        this.map = Array.from(Array(this.mapWidth), () => Array(this.mapHeight));

        for (const [x, y] of range2d(this.mapWidth, this.mapHeight)) {
            this.map[x][y] = Tile.fromSymbol(rawMapLines[y][x]);
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
            cell.innerText = tile.symbol;
            for (const name of cell.classList.values()) cell.classList.remove(name);
            cell.classList.add(tile.cssClass);
        }

        if (!this.table.parentElement) {
            document.body.appendChild(this.table);
        }
    }

    static async run() {
        const rawMap = await getFile("map.txt");
        new DwarfWater(rawMap);
    }
}

window.addEventListener("load", DwarfWater.run);
