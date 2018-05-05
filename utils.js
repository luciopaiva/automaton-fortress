
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
