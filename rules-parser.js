
class Tile {
    constructor (symbol, display, cssClass, flowDirection = Math.trunc(Math.random() * Tile.HORIZONTAL_FLOW_STATE_COUNT)) {
        this.symbol = symbol;
        this.display = display;
        this.cssClass = cssClass;
        this.flowDirection = flowDirection;  // only applies to fluids

        Tile.tileBySymbol.set(symbol, this);
    }

    matches(otherTile) {
        return this === otherTile;
    }

    static fromSymbol(symbol) {
        const result = Tile.tileBySymbol.get(symbol);
        if (!result) {
            throw new Error(`Invalid character "${symbol}"`);
        }
        return result;
    }
}

class AnyTile extends Tile {
    matches(otherTile) {
        return true;
    }
}

Tile.HORIZONTAL_FLOW_LEFT = 0;
Tile.HORIZONTAL_FLOW_RIGHT = 1;
Tile.HORIZONTAL_FLOW_DOWN = 2;
Tile.HORIZONTAL_FLOW_STATE_COUNT = 3;

Tile.tileBySymbol = new Map();
Tile.EMPTY = new Tile(".", " ", "empty", null);
Tile.WATER = new Tile("~", "~", "water");
Tile.FALLING_WATER = new Tile("v", "~", "water", Tile.HORIZONTAL_FLOW_DOWN);
Tile.WALL = new Tile("#", "#", "wall");
Tile.ANY_TILE = new AnyTile("?", "?", "any");

class RuleState {
    constructor (c, n, e, s, w) {
        this.center = c instanceof Tile ? c : Tile.fromSymbol(c);
        this.north = n instanceof Tile ? n : Tile.fromSymbol(n);
        this.east = e instanceof Tile ? e : Tile.fromSymbol(e);
        this.south = s instanceof Tile ? s : Tile.fromSymbol(s);
        this.west = w instanceof Tile ? w : Tile.fromSymbol(w);
    }

    /**
     * @param {RuleState} state
     */
    matches(state) {
        return this.center.matches(state.center) &&
            this.north.matches(state.north) &&
            this.east.matches(state.east) &&
            this.south.matches(state.south) &&
            this.west.matches(state.west);
    }

    /**
     * northwest  north  northeast
     *      west center  east
     * southwest  south  southeast
     *
     * @return {RuleState[]}
     */
    static parseCompoundRule(nw, n, ne, w, c, e, sw, s, se) {
        let result = [];

        if (Array.isArray(c)) {
            const isNegated = c[0][0] === "!";
            const negateChar = isNegated ? "!" : "";
            c.slice(1, c.length - 1).forEach(term => {
                RuleState.parseCompoundRule(nw, n, ne, w, negateChar + term, e, sw, s, se)
                    .forEach(state => result.push(state));
            });
        } else if (Array.isArray(n)) {
            const isNegated = n[0][0] === "!";
            const negateChar = isNegated ? "!" : "";
            n.slice(1, n.length - 1).forEach(term => {
                RuleState.parseCompoundRule(nw, negateChar + term, ne, w, c, e, sw, s, se)
                    .forEach(state => result.push(state));
            });
        } else if (Array.isArray(e)) {
            const isNegated = e[0][0] === "!";
            const negateChar = isNegated ? "!" : "";
            e.slice(1, e.length - 1).forEach(term => {
                RuleState.parseCompoundRule(nw, n, ne, w, c, negateChar + term, sw, s, se)
                    .forEach(state => result.push(state));
            });
        } else if (Array.isArray(s)) {
            const isNegated = s[0][0] === "!";
            const negateChar = isNegated ? "!" : "";
            s.slice(1, s.length - 1).forEach(term => {
                RuleState.parseCompoundRule(nw, n, ne, w, c, e, sw, negateChar + term, se)
                    .forEach(state => result.push(state));
            });
        } else if (Array.isArray(w)) {
            const isNegated = w[0][0] === "!";
            const negateChar = isNegated ? "!" : "";
            w.slice(1, w.length - 1).forEach(term => {
                RuleState.parseCompoundRule(nw, n, ne, negateChar + term, c, e, sw, s, se)
                    .forEach(state => result.push(state));
            });
        } else {
            return [new RuleState(c, n, e, s, w)];
        }

        return result;
    }
}

class RuleExpression {
    /**
     * @param {RuleState} state
     * @param {String} result
     */
    constructor (state, result) {
        this.state = state;
        this.result = result;
    }

    matches(otherState) {
        return this.state.matches(otherState);
    }
}

class RulesParser {

    /**
     * @param {String} rawRules
     * @returns {RuleExpression[]}
     */
    static parse(rawRules) {
        const linesAndLineNumbers = rawRules.split("\n")
            .map((s, i) => [s.trim(), i + 1])
            .filter(([s,]) => s.length > 0)   // get rid of empty lines
            .filter(([s,]) => s[0] !== "#");  // get rid of comments

        if (linesAndLineNumbers.length % 3 !== 0) {
            console.error("Number of effective lines in script must be divisible by 3!");
            return null;
        }

        let rules = [];

        for (let i = 0; i < linesAndLineNumbers.length; i += 3) {
            const lineNumber1 = linesAndLineNumbers[i][1];
            const lineNumber2 = linesAndLineNumbers[i][1];
            const lineNumber3 = linesAndLineNumbers[i][1];
            const line1 = RulesParser.parseLine(linesAndLineNumbers[i][0], i);
            const line2 = RulesParser.parseLine(linesAndLineNumbers[i + 1][0], i + 1);
            const line3 = RulesParser.parseLine(linesAndLineNumbers[i + 2][0], i + 2);

            if (line1.length % 3 !== 0) {
                console.error(`Number of terms at line ${lineNumber1} must be divisible by 3!`);
                return null;
            } else if (line2.length !== line1.length + 1) {
                console.error(`Number of terms at line ${lineNumber2} must match number at line ${lineNumber1} + 1!`);
            } else if (line3.length !== line1.length) {
                console.error(`Number of terms at line ${lineNumber3} must match number at line ${lineNumber1}!`);
            }

            const numberOfStates = Math.trunc(line1.length / 3);
            const states = [];
            for (let j = 0; j < numberOfStates; j++) {
                RuleState.parseCompoundRule(
                    ...line1.slice(j * 3, j * 3 + 3),
                    ...line2.slice(j * 3, j * 3 + 3),
                    ...line3.slice(j * 3, j * 3 + 3),
                ).forEach(state => states.push(state));
            }
            const resultingSymbol = line2[line2.length - 1];

            for (const state of states) {
                rules.push(new RuleExpression(state, resultingSymbol));
            }
        }

        return rules;
    }

    /**
     * Break line into an array of terms. A term can be:
     *
     * term => symbol | compound_symbol
     * symbol => "#" | "." | "~" | "~v" ... (not going to define the whole collection of symbols here)
     * compound_symbol => "!"? + "[" + symbol+ + "]"
     *
     * @param line
     * @param lineIndex
     * @returns {Array}
     */
    static parseLine(line, lineIndex) {
        let rawTokens = line.split(/\s+/);
        let outputTokens = [];
        let compoundToken = [];
        for (const token of rawTokens) {
            if (token.startsWith("[") || token.startsWith("![")) {
                if (compoundToken.length > 0) {
                    throw new Error(`Error at line ${lineIndex}: unexpected term "${token}"`)
                }
                if (token[0] === "!") {
                    compoundToken.push("![");
                    if (token.length > 2) {
                        compoundToken.push(token.substr(2));
                    }
                } else {
                    compoundToken.push("[");
                    if (token.length > 1) {
                        compoundToken.push(token.substr(1));
                    }
                }
            } else if (token.endsWith("]")) {
                if (compoundToken.length === 0) {
                    throw new Error(`Error at line ${lineIndex}: unexpected term "${token}"`)
                }
                if (token.length > 1) {
                    compoundToken.push(token.substr(0, token.length - 1));
                }
                compoundToken.push("]");
                outputTokens.push(compoundToken);
                compoundToken = [];
            } else {
                if (compoundToken.length > 0) {
                    compoundToken.push(token);
                } else {
                    outputTokens.push(token);
                }
            }
        }
        return outputTokens;
    }
}
