
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

/**
 * @param {Object[][]} matrix
 * @returns {IterableIterator<Object>}
 */
function *iterateMatrix(matrix) {
    const height = matrix.length;
    const width = matrix[0].length;
    for (const [x, y] of range2d(width, height)) {
        yield matrix[x][y];
    }
}

function trimRight(str) {
    return str.replace(/\s*$/, "");
}

class Tile {
    constructor (symbol, cssClass) {
        this.symbol = symbol;
        this.cssClass = cssClass;
        this.horizontalFlow = Math.trunc(Math.random() * 2);  // only applies to fluids
    }

    isWater() {
        return this.symbol === Tile.WATER;
    }

    isWall() {
        return this.symbol === Tile.WALL;
    }

    isEmpty() {
        return this.symbol === Tile.EMPTY;
    }

    isNotEmpty() {
        return this.symbol !== Tile.EMPTY;
    }

    static fromSymbol(symbol) {
        switch (symbol) {
            case undefined:
            case Tile.EMPTY: return new Tile(Tile.EMPTY, Tile.EMPTY_CSS);
            case Tile.WALL: return new Tile(symbol, Tile.WALL_CSS);
            case Tile.WATER: return new Tile(symbol, Tile.WATER_CSS);
            default: throw new Error(`Invalid character "${symbol}"`);
        }
    }
}

Tile.EMPTY = " ";
Tile.WATER = "~";
Tile.WALL = "#";
Tile.EMPTY_CSS = "empty";
Tile.WATER_CSS = "water";
Tile.WALL_CSS = "wall";
Tile.HORIZONTAL_FLOW_LEFT = 0;
Tile.HORIZONTAL_FLOW_RIGHT = 1;

class DwarfWater {

    constructor (rawMap) {
        /** @type {String} */
        this.rawMap = rawMap;
        this.resetMap();
        this.resetTable();
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
            const tile = this.getTile(x, y);
            if (tile.isWater()) {
                const tileBelow = this.getTile(x, y + 1);

                if (tileBelow && tileBelow.isEmpty()) {
                    // water disappears if there's an empty space below it
                    this.backingMap[x][y] = Tile.fromSymbol(Tile.EMPTY);
                    dirtyTiles.push([x, y]);
                }
                // else if (tile.horizontalFlow === Tile.HORIZONTAL_FLOW_LEFT) {
                //     // there's no space below it - try to flow horizontally
                //     const tileLeft = this.getTile(x - 1, y);
                //     if (tileLeft.isEmpty()) {
                //         // disappear (will flow left)
                //         this.backingMap[x][y] = Tile.fromSymbol(Tile.EMPTY);
                //         dirtyTiles.push([x, y]);
                //     } else {
                //         // bumped into obstacle; change direction
                //         this.backingMap[x][y].horizontalFlow = Tile.HORIZONTAL_FLOW_RIGHT;
                //     }
                // } else if (tile.horizontalFlow === Tile.HORIZONTAL_FLOW_RIGHT) {
                //     // there's no space below it - try to flow horizontally
                //     const tileRight = this.getTile(x + 1, y);
                //     if (tileRight.isEmpty()) {
                //         this.backingMap[x][y] = Tile.fromSymbol(Tile.EMPTY);
                //         dirtyTiles.push([x, y]);
                //     } else {
                //         // bumped into obstacle; change direction
                //         this.backingMap[x][y].horizontalFlow = Tile.HORIZONTAL_FLOW_LEFT;
                //     }
                // }
            } else if (tile.isEmpty()) {
                const tileAbove = this.getTile(x, y - 1);
                if (tileAbove && tileAbove.isWater()) {
                    // empty space becomes water if there's water above it
                    this.backingMap[x][y] = Tile.fromSymbol(Tile.WATER);
                    dirtyTiles.push([x, y]);
                }
            }
        }

        this.swapMapBuffers();

        for (const [x, y] of dirtyTiles) {
            DwarfWater.updateCell(this.tableCells[x][y], this.map[x][y]);
        }
    }

    getTile(x, y) {
        if (x >= 0 && x < this.mapWidth && y >= 0 && y < this.mapHeight) {
            return this.map[x][y];
        }
        return undefined;
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
            DwarfWater.updateCell(cell, tile);
        }

        if (!this.table.parentElement) {
            document.body.appendChild(this.table);
        }
    }

    static updateCell(cell, tile) {
        cell.innerText = tile.symbol;
        for (const name of cell.classList.values()) cell.classList.remove(name);
        cell.classList.add(tile.cssClass);
    }


    static async run() {
        const rawMap = await getFile("map.txt");
        new DwarfWater(rawMap);
    }
}

window.addEventListener("load", DwarfWater.run);
