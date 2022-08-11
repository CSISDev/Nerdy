type TypeOf = "string" | "number" | "bigint" | "boolean" | "symbol" | "undefined" | "object" | "function"
export function hasMethod(base: Function) {
    if (typeof base === 'function') return true;
    return false;
}
