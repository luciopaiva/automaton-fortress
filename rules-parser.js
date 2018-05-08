
class TileState {
    constructor (symbol, display, cssClass) {
        this.symbol = symbol;
        this.display = display;
        this.cssClass = cssClass;

        TileState.tileBySymbol.set(symbol, this);
    }

    matches(otherTile) {
        return this === otherTile;
    }

    static fromSymbol(symbol) {
        const result = TileState.tileBySymbol.get(symbol);
        if (!result) {
            throw new Error(`Invalid character "${symbol}"`);
        }
        return result;
    }
}

class AnyTile extends TileState {
    matches(otherTile) {
        return true;
    }
}

TileState.tileBySymbol = new Map();
TileState.EMPTY = new TileState(".", " ", "empty");
TileState.WATER = new TileState("~", "~", "water");
TileState.FALLING_WATER = new TileState("v", "~", "water");
TileState.WALL = new TileState("#", "#", "wall");
TileState.ANY_TILE = new AnyTile("?", "?", "any");

class RuleState {
    constructor (c, nw, n, ne, e, se, s, sw, w) {
        this.center = c instanceof TileState ? c : TileState.fromSymbol(c);
        this.nortWest = nw instanceof TileState ? nw : TileState.fromSymbol(nw);
        this.north = n instanceof TileState ? n : TileState.fromSymbol(n);
        this.nortEast = ne instanceof TileState ? ne : TileState.fromSymbol(ne);
        this.east = e instanceof TileState ? e : TileState.fromSymbol(e);
        this.southEast = se instanceof TileState ? se : TileState.fromSymbol(se);
        this.south = s instanceof TileState ? s : TileState.fromSymbol(s);
        this.southWest = sw instanceof TileState ? sw : TileState.fromSymbol(sw);
        this.west = w instanceof TileState ? w : TileState.fromSymbol(w);
    }

    /**
     * @param {RuleState} state
     */
    matches(state) {
        return this.center.matches(state.center) &&
            this.nortWest.matches(state.nortWest) &&
            this.north.matches(state.north) &&
            this.nortEast.matches(state.nortEast) &&
            this.east.matches(state.east) &&
            this.southEast.matches(state.southEast) &&
            this.south.matches(state.south) &&
            this.southWest.matches(state.southWest) &&
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

        const argArray = Array.from(arguments);

        const hadExpansion = argArray.some((expression, index) => {

            // if any of the arguments is an array of terms, recursively expand it (e.g.: "[# ~]")
            if (Array.isArray(expression)) {
                // first position in the array is always either "[" or "!["
                const isNegated = expression[0][0] === "!";
                const modifier = isNegated ? "!" : "";

                // for each term found in the array (e.g.: "#", "!~")
                expression.slice(1, expression.length - 1)  // exclude leading /!?\[/ and trailing "]"
                    .forEach(term => {
                        const recursionArgs = Array.from(argArray);
                        // replace compound with single term
                        recursionArgs[index] = modifier + term;
                        RuleState.parseCompoundRule(...recursionArgs).forEach(state => result.push(state));
                    });
                // break immediately if had expansion
                return true;
            }
            return false;
        });

        return hadExpansion ? result : [new RuleState(c, nw, n, ne, e, se, s, sw, w)];
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
     * @returns {RuleExpression[]|String} rules if successful, string with message if parsing failed
     */
    static parse(rawRules) {
        const linesAndLineNumbers = rawRules.split("\n")
            .map((s, i) => [s.trim(), i + 1])
            .filter(([s,]) => s.length > 0)   // get rid of empty lines
            .filter(([s,]) => !s.startsWith("//"));  // get rid of comments

        if (linesAndLineNumbers.length % 3 !== 0) {
            return `number of effective lines in script must be divisible by 3! ` +
                `(line count is ${linesAndLineNumbers.length})`;
        }

        let rules = [];

        try {
            for (let i = 0; i < linesAndLineNumbers.length; i += 3) {
                const lineNumber1 = linesAndLineNumbers[i][1];
                const lineNumber2 = linesAndLineNumbers[i + 1][1];
                const lineNumber3 = linesAndLineNumbers[i + 2][1];
                const line1 = RulesParser.parseLine(linesAndLineNumbers[i][0], i);
                const line2 = RulesParser.parseLine(linesAndLineNumbers[i + 1][0], i + 1);
                const line3 = RulesParser.parseLine(linesAndLineNumbers[i + 2][0], i + 2);

                if (line1.length % 3 !== 0) {
                    return `number of terms at line ${lineNumber1} must be divisible by 3!`;
                } else if (line2.length !== line1.length + 1) {
                    return `number of terms at line ${lineNumber2} must match number at line ${lineNumber1} plus one!`;
                } else if (line3.length !== line1.length) {
                    return `number of terms at line ${lineNumber3} must match number at line ${lineNumber1}!`;
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
        } catch (e) {
            return e.message;
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
