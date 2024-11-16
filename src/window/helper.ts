export type Align = "auto" | "smart" | "center" | "end" | "start";

let size: number = -1;

// This utility copied from "dom-helpers" package.
export function getScrollbarSize(recalculate: boolean = false): number {
    if (size === -1 || recalculate) {
        const div = document.createElement('div');
        const style = div.style;
        style.width = '50px';
        style.height = '50px';
        style.overflow = 'scroll';
        document.body.appendChild(div);
        size = div.offsetWidth - div.clientWidth;
        document.body.removeChild(div);
    }

    return size;
}

export type RTLOffsetType = 'negative' | 'positive-descending' | 'positive-ascending';

let cachedRTLResult: RTLOffsetType | null = null;

// TRICKY According to the spec, scrollLeft should be negative for RTL aligned elements.
// Chrome does not seem to adhere; its scrollLeft values are positive (measured relative to the left).
// Safari's elastic bounce makes detecting this even more complicated wrt potential false positives.
// The safest way to check this is to intentionally set a negative offset,
// and then verify that the subsequent "scroll" event matches the negative offset.
// If it does not match, then we can assume a non-standard RTL scroll implementation.
export function getRTLOffsetType(recalculate: boolean = false): RTLOffsetType {
    if (cachedRTLResult === null || recalculate) {
        const outerDiv = document.createElement('div');
        const outerStyle = outerDiv.style;
        outerStyle.width = '50px';
        outerStyle.height = '50px';
        outerStyle.overflow = 'scroll';
        outerStyle.direction = 'rtl';

        const innerDiv = document.createElement('div');
        const innerStyle = innerDiv.style;
        innerStyle.width = '100px';
        innerStyle.height = '100px';

        outerDiv.appendChild(innerDiv);
        document.body.appendChild(outerDiv);


        if (outerDiv.scrollLeft > 0) {
            cachedRTLResult = 'positive-descending';
        } else {
            outerDiv.scrollLeft = 1;
            if (outerDiv.scrollLeft === 0) {
                cachedRTLResult = 'negative';
            } else {
                cachedRTLResult = 'positive-ascending';
            }
        }
        document.body.removeChild(outerDiv);

        return cachedRTLResult;
    }

    return cachedRTLResult;
}

// Pulled from react-compat
// https://github.com/developit/preact-compat/blob/7c5de00e7c85e2ffd011bf3af02899b63f699d3a/src/index.js#L349
export function shallowDiffers(prev: Object, next: Object): boolean {
    for (let attribute in prev) {
        if (!(attribute in next)) {
            return true;
        }
    }
    for (let attribute in next) {
        if (prev[attribute as keyof typeof prev] !== next[attribute as keyof typeof next]) {
            return true;
        }
    }
    return false;
}

// Custom comparison function for React.memo().
// It knows to compare individual style props and ignore the wrapper object.
// See https://reactjs.org/docs/react-api.html#reactmemo
export function areEqual(
    prevProps: Record<string, any>,
    nextProps: Record<string, any>
): boolean {
    const { style: prevStyle, ...prevRest } = prevProps;
    const { style: nextStyle, ...nextRest } = nextProps;

    return (
        !shallowDiffers(prevStyle, nextStyle) && !shallowDiffers(prevRest, nextRest)
    );
}




const now = () => performance.now()



export function cancelTimeout(timeoutID: number) {
    cancelAnimationFrame(timeoutID);
}

export function requestTimeout(callback: Function, delay: number): number {
    const start = now();
    let timeoutID: number = 0;
    function tick() {
        if (now() - start >= delay) {
            callback.call(null);
        } else {
            timeoutID = requestAnimationFrame(tick);
        }
    }

    timeoutID = requestAnimationFrame(tick);

    return timeoutID;
}