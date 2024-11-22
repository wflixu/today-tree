type CallbackFn = (...args: any[]) => void;

interface EventEntry {
    fn: CallbackFn;
    ctx?: any;
}

interface IEmitter {
    e?: { [key: string]: EventEntry[] };
    on(name: string, callback: CallbackFn, ctx?: any): this;
    once(name: string, callback: CallbackFn, ctx?: any): this;
    emit(name: string, ...args: any[]): this;
    off(name: string, callback?: CallbackFn): this;
}

export class Emitter implements IEmitter {
    e?: { [key: string]: EventEntry[] };

    constructor() {
        // Keep this empty so it's easier to inherit from
    }

    on(name: string, callback: CallbackFn, ctx?: any): this {
        const e = this.e || (this.e = {});
        (e[name] || (e[name] = [])).push({ fn: callback, ctx });
        return this;
    }

    once(name: string, callback: CallbackFn, ctx?: any): this {
        const self = this;
        const listener: CallbackFn = function (...args) {
            self.off(name, listener);
            callback.apply(ctx, args);
        };

        listener._ = callback;
        return this.on(name, listener, ctx);
    }

    emit(name: string, ...args: any[]): this {
        const data = args;
        const evtArr = ((this.e || (this.e = {}))[name] || []).slice();
        const len = evtArr.length;

        for (let i = 0; i < len; i++) {
            evtArr[i].fn.apply(evtArr[i].ctx, data);
        }

        return this;
    }

    off(name: string, callback?: CallbackFn): this {
        const e = this.e || (this.e = {});
        const evts = e[name];
        const liveEvents: EventEntry[] = [];

        if (evts && callback) {
            for (let i = 0, len = evts.length; i < len; i++) {
                if (evts[i].fn !== callback && evts[i].fn._ !== callback) {
                    liveEvents.push(evts[i]);
                }
            }
        }

        (liveEvents.length) ? e[name] = liveEvents : delete e[name];

        return this;
    }
}

