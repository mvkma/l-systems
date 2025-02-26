let setupFunctions = [];

let teardownFunctions = [];

function assert(cond, msg) {
    if (!cond) {
        throw new Error(msg);
    }
}

function assertEquals(a, b, msg) {
    try {
        assert(a === b, msg);
    } catch (error) {
        throw new Error(`Not equal: ${a} and ${b}`);
    }
}

function assertClose(a, b, msg) {
    const eps = 1e-10;
    if (Math.abs(a - b) > eps) {
        throw new Error(`Not close: ${a} and ${b}`);
    }
}

function assertThrows(fn, name, message) {
    try {
        fn();
    } catch (error) {
        if (name && error.name !== name) {
            throw new Error(`Wrong error: ${name}`);
        }

        if (message && error.message !== message) {
            throw new Error(`Wrong error message: expected '${message}', got '${error.message}'`);
        }
    }
}

function test(fn, msg) {
    setupFunctions.forEach(f => f());

    try {
        fn();
        console.log(`[pass] ${msg}`);
    } catch (error) {
        console.log(`[fail] ${msg}`);
        console.error(error);
    } finally {
        teardownFunctions.forEach(f => f());
    }
}

function init() {
    setupFunctions = [];
    teardownFunctions = [];
}

function before(fn) {
    setupFunctions.push(fn);
}

function after(fn) {
    teardownFunctions.push(fn);
}

export {
    init,
    before,
    after,
    assert,
    assertEquals,
    assertClose,
    assertThrows,
    test,
};
