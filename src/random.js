/** @type {Uint16Array} */
let random = null;

/** @type {number} */
let ix = null;

/**
 * Linear feedback shift register
 *
 * @param {number} seed
 *
 * @returns {() => number}
 */
function lfsr(seed) {
    const start = seed;
    let lfsr = start;
    return () => {
        lfsr = (lfsr >> 1) | (((lfsr ^ (lfsr >> 1) ^ (lfsr >> 3) ^ (lfsr >> 12)) & 1) << 15)
        return lfsr;
    };
};

/**
 * Initialize array of pseudorandom numbers
 *
 * @param {number} period
 * @param {number} seed
 */
function init(seed) {
    const period = (1 << 16) - 1;
    random = new Uint16Array(period);
    ix = 0;
    seed = seed || Math.floor(Math.random() * period);
    const gen = lfsr(seed);
    for (let i = 0; i < period; i++) {
        random[i] = gen();
    }
}

/**
 * Get next pseudorandom number
 *
 * @returns {number}
 */
function randint() {
    ix += 1;
    ix %= random.length;
    return random[ix];
}

export {
    init,
    randint,
}
