export default function filenameReservedRegex() {
    return /[<>:"/\\|?*\u0000-\u001F]/g;
}

export function windowsReservedNameRegex() {
    return /^(con|prn|aux|nul|com\d|lpt\d)$/i;
}

export function isValidFilename(string) {
    if (!string || string.length > 255) {
        return false;
    }

    if (filenameReservedRegex().test(string) || windowsReservedNameRegex().test(string)) {
        return false;
    }

    if (string === '.' || string === '..') {
        return false;
    }

    return true;
}


export function insertIf<T>(condition: boolean, ...elements: (T | (() => T))[]): T[] {
    return condition
        ? elements.map(e => typeof e === 'function' ? (e as Function)() : e)
        : [];
}