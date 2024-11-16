

import memoizeOne from './memoize-one';
import React, { createElement, PureComponent } from 'react';
import { cancelTimeout, requestTimeout } from './helper';
import { getScrollbarSize, getRTLOffsetType } from './helper';


export type ScrollToAlign = 'auto' | 'smart' | 'center' | 'start' | 'end';

type itemSize = number | ((index: number) => number);
// TODO Deprecate directions "horizontal" and "vertical"
type Direction = 'ltr' | 'rtl' | 'horizontal' | 'vertical';
type Layout = 'horizontal' | 'vertical';

type RenderComponentProps<T> = {
    data: T;
    index: number;
    isScrolling?: boolean;
    style: React.CSSProperties; // 更具体的类型
};

export type RenderComponent<T> = React.ComponentType<Partial<RenderComponentProps<T>>>;

type ScrollDirection = 'forward' | 'backward';

type onItemsRenderedCallback = (param: {
    overscanStartIndex: number;
    overscanStopIndex: number;
    visibleStartIndex: number;
    visibleStopIndex: number;
}) => void;

type onScrollCallback = (param: {
    scrollDirection: ScrollDirection;
    scrollOffset: number;
    scrollUpdateWasRequested: boolean;
}) => void;

type ScrollEvent = React.SyntheticEvent<HTMLDivElement>;
type ItemStyleCache = { [index: number]: React.CSSProperties };

type OuterProps = {
    children: React.ReactNode,
    className?: string,
    onScroll: (event: ScrollEvent) => void,
    style: Record<string, unknown>,
};

type InnerProps = {
    children: React.ReactNode,
    style: Record<string, unknown>,
};

export type Props<T> = {
    children:React.FC<{
        index: number; // index 属性
        style?: React.CSSProperties; // style 属性，使用 React.CSSProperties 类型
    }>;
    className?: string;
    direction: Direction;
    height: number | string;
    initialScrollOffset?: number;
    innerRef?: React.Ref<any> | string ;
    innerElementType?: string | React.ComponentType<InnerProps>;
    innerTagName?: string; // 已弃用
    itemCount: number;
    itemData: T;
    itemKey?: (index: number, data: T) => any;
    itemSize: itemSize;
    layout: Layout;
    onItemsRendered?: onItemsRenderedCallback;
    onScroll?: onScrollCallback;
    outerRef?: React.Ref<any>;
    outerElementType?: string | React.ComponentType<OuterProps>;
    outerTagName?: string; // 已弃用
    overscanCount: number;
    style?: React.CSSProperties;
    useIsScrolling: boolean;
    width: number | string;
};


export type State = {
    instance: any; // 可以根据实际情况更具体地定义类型
    isScrolling: boolean;
    scrollDirection: ScrollDirection;
    scrollOffset: number;
    scrollUpdateWasRequested: boolean;
};

type GetItemOffset = (
    props: Props<any>,
    index: number,
    instanceProps: any
) => number;
type GetItemSize = (
    props: Props<any>,
    index: number,
    instanceProps: any
) => number;
type GetEstimatedTotalSize = (props: Props<any>, instanceProps: any) => number;
type GetOffsetForIndexAndAlignment = (
    props: Props<any>,
    index: number,
    align: ScrollToAlign,
    scrollOffset: number,
    instanceProps: any,
    scrollbarSize: number
) => number;
type GetStartIndexForOffset = (
    props: Props<any>,
    offset: number,
    instanceProps: any
) => number;
type GetStopIndexForStartIndex = (
    props: Props<any>,
    startIndex: number,
    scrollOffset: number,
    instanceProps: any
) => number;
type InitInstanceProps = (props: Props<any>, instance: any) => any;
type ValidateProps = (props: Props<any>) => void;

const IS_SCROLLING_DEBOUNCE_INTERVAL = 150;

const defaultItemKey = (index: number, data: any) => index;



type InstanceProps = any;
const getItemOffset = (props: Props<any>, index: number): number => { return (index * (props.itemSize as number)) };
const getItemSize = (props: Props<any>, index: number): number => (props.itemSize as number);

const getEstimatedTotalSize = ({ itemCount, itemSize }: Props<any>) =>
    (itemSize as number) * itemCount;

const getOffsetForIndexAndAlignment = (
    { direction, height, itemCount, itemSize, layout, width }: Props<any>,
    index: number,
    align: ScrollToAlign,
    scrollOffset: number,
    scrollbarSize: number
): number => {
    // TODO Deprecate direction "horizontal"
    const isHorizontal = direction === 'horizontal' || layout === 'horizontal';
    const size = ((isHorizontal ? width : height) as unknown as number);



    const lastItemOffset = Math.max(
        0,
        itemCount * (itemSize as number) - size
    );
    const maxOffset = Math.min(
        lastItemOffset,
        index * (itemSize as number)
    );
    const minOffset = Math.max(
        0,
        index * (itemSize as number) - size + (itemSize as number) + scrollbarSize
    );

    if (align === 'smart') {
        if (
            scrollOffset >= minOffset - size &&
            scrollOffset <= maxOffset + size
        ) {
            align = 'auto';
        } else {
            align = 'center';
        }
    }

    switch (align) {
        case 'start':
            return maxOffset;
        case 'end':
            return minOffset;
        case 'center': {
            // "Centered" offset is usually the average of the min and max.
            // But near the edges of the list, this doesn't hold true.
            const middleOffset = Math.round(
                minOffset + (maxOffset - minOffset) / 2
            );
            if (middleOffset < Math.ceil(size / 2)) {
                return 0; // near the beginning
            } else if (middleOffset > lastItemOffset + Math.floor(size / 2)) {
                return lastItemOffset; // near the end
            } else {
                return middleOffset;
            }
        }
        case 'auto':
        default:
            if (scrollOffset >= minOffset && scrollOffset <= maxOffset) {
                return scrollOffset;
            } else if (scrollOffset < minOffset) {
                return minOffset;
            } else {
                return maxOffset;
            }
    }
};
const getStartIndexForOffset = (
    { itemCount, itemSize }: Props<any>,
    offset: number
): number =>
    Math.max(
        0,
        Math.min(itemCount - 1, Math.floor(offset / (itemSize as number)))
    );

const getStopIndexForStartIndex = (
    { direction, height, itemCount, itemSize, layout, width }: Props<any>,
    startIndex: number,
    scrollOffset: number
): number => {
    // TODO Deprecate direction "horizontal"
    const isHorizontal = direction === 'horizontal' || layout === 'horizontal';
    const offset = startIndex * (itemSize as number);
    const size = ((isHorizontal ? width : height) as unknown as number);
    const numVisibleItems = Math.ceil(
        (size + scrollOffset - offset) / (itemSize as number)
    );
    return Math.max(
        0,
        Math.min(
            itemCount - 1,
            startIndex + numVisibleItems - 1 // -1 is because stop index is inclusive
        )
    );
};


const shouldResetStyleCacheOnItemSizeChange = true;

class FixedSizeList<T> extends PureComponent<Props<T>, State> {
    _outerRef?: HTMLDivElement;
    _resetIsScrollingTimeoutId: number | null = null;

    static defaultProps = {
        direction: 'ltr',
        itemData: undefined,
        layout: 'vertical',
        overscanCount: 2,
        useIsScrolling: false,
    };




    state: State = {
        instance: this,
        isScrolling: false,
        scrollDirection: 'forward',
        scrollOffset:
            typeof this.props.initialScrollOffset === 'number'
                ? this.props.initialScrollOffset
                : 0,
        scrollUpdateWasRequested: false,
    };

    _callOnItemsRendered = memoizeOne(
        (
            overscanStartIndex: number,
            overscanStopIndex: number,
            visibleStartIndex: number,
            visibleStopIndex: number
        ) => {
            (this.props.onItemsRendered as onItemsRenderedCallback)({
                overscanStartIndex,
                overscanStopIndex,
                visibleStartIndex,
                visibleStopIndex,
            })
        }

    );

    // Always use explicit constructor for React components.
    // It produces less code after transpilation. (#26)
    // eslint-disable-next-line no-useless-constructor
    constructor(props: Props<T>) {
        super(props);
    }

    initInstanceProps(props: Props<any>): any {
        // Noop
    }


    _getItemStyleCache = memoizeOne((arg1: any, arg2: any, arg3?: any): ItemStyleCache => {
        return {}; // 根据实际需求返回具体的样式缓存
    });

    _resetIsScrolling = () => {
        this._resetIsScrollingTimeoutId = null;

        this.setState({ isScrolling: false }, () => {
            // Clear style cache after state update has been committed.
            // This way we don't break pure sCU for items that don't use isScrolling param.
            this._getItemStyleCache(-1, null);
        });
    };

    _resetIsScrollingDebounced = () => {
        if (this._resetIsScrollingTimeoutId !== null) {
            cancelTimeout(this._resetIsScrollingTimeoutId);
        }

        this._resetIsScrollingTimeoutId = requestTimeout(
            this._resetIsScrolling,
            IS_SCROLLING_DEBOUNCE_INTERVAL
        );
    };

    scrollTo(scrollOffset: number): void {
        scrollOffset = Math.max(0, scrollOffset);

        this.setState(prevState => {
            if (prevState.scrollOffset === scrollOffset) {
                return null;
            }
            return {
                scrollDirection:
                    prevState.scrollOffset < scrollOffset ? 'forward' : 'backward',
                scrollOffset: scrollOffset,
                scrollUpdateWasRequested: true,
            };
        }, this._resetIsScrollingDebounced);
    }

    scrollToItem(index: number, align: ScrollToAlign = 'auto'): void {
        const { itemCount, layout } = this.props;
        const { scrollOffset } = this.state;

        index = Math.max(0, Math.min(index, itemCount - 1));

        // The scrollbar size should be considered when scrolling an item into view, to ensure it's fully visible.
        // But we only need to account for its size when it's actually visible.
        // This is an edge case for lists; normally they only scroll in the dominant direction.
        let scrollbarSize = 0;
        if (this._outerRef) {
            const outerRef = (this._outerRef as HTMLElement);
            if (layout === 'vertical') {
                scrollbarSize =
                    outerRef.scrollWidth > outerRef.clientWidth
                        ? getScrollbarSize()
                        : 0;
            } else {
                scrollbarSize =
                    outerRef.scrollHeight > outerRef.clientHeight
                        ? getScrollbarSize()
                        : 0;
            }
        }

        this.scrollTo(
            getOffsetForIndexAndAlignment(
                this.props,
                index,
                align,
                scrollOffset,
                scrollbarSize
            )
        );
    }

    componentDidMount() {
        const { direction, initialScrollOffset, layout } = this.props;

        if (typeof initialScrollOffset === 'number' && this._outerRef != null) {
            const outerRef = (this._outerRef as HTMLElement);
            // TODO Deprecate direction "horizontal"
            if (direction === 'horizontal' || layout === 'horizontal') {
                outerRef.scrollLeft = initialScrollOffset;
            } else {
                outerRef.scrollTop = initialScrollOffset;
            }
        }

        this._callPropsCallbacks();
    }

    componentDidUpdate() {
        const { direction, layout } = this.props;
        const { scrollOffset, scrollUpdateWasRequested } = this.state;

        if (scrollUpdateWasRequested && this._outerRef != null) {
            const outerRef = (this._outerRef as HTMLElement);

            // TODO Deprecate direction "horizontal"
            if (direction === 'horizontal' || layout === 'horizontal') {
                if (direction === 'rtl') {
                    // TRICKY According to the spec, scrollLeft should be negative for RTL aligned elements.
                    // This is not the case for all browsers though (e.g. Chrome reports values as positive, measured relative to the left).
                    // So we need to determine which browser behavior we're dealing with, and mimic it.
                    switch (getRTLOffsetType()) {
                        case 'negative':
                            outerRef.scrollLeft = -scrollOffset;
                            break;
                        case 'positive-ascending':
                            outerRef.scrollLeft = scrollOffset;
                            break;
                        default:
                            const { clientWidth, scrollWidth } = outerRef;
                            outerRef.scrollLeft = scrollWidth - clientWidth - scrollOffset;
                            break;
                    }
                } else {
                    outerRef.scrollLeft = scrollOffset;
                }
            } else {
                outerRef.scrollTop = scrollOffset;
            }
        }

        this._callPropsCallbacks();
    }

    componentWillUnmount() {
        if (this._resetIsScrollingTimeoutId !== null) {
            cancelTimeout(this._resetIsScrollingTimeoutId);
        }
    }

    render() {
        const {
            children,
            className,
            direction,
            height,
            innerRef,
            innerElementType,
            innerTagName,
            itemCount,
            itemData,
            itemKey = defaultItemKey,
            layout,
            outerElementType,
            outerTagName,
            style,
            useIsScrolling,
            width,
        } = this.props;
        const { isScrolling } = this.state;

        // TODO Deprecate direction "horizontal"
        const isHorizontal =
            direction === 'horizontal' || layout === 'horizontal';

        const onScroll = isHorizontal
            ? this._onScrollHorizontal
            : this._onScrollVertical;

        const [startIndex, stopIndex] = this._getRangeToRender();

        const items: JSX.Element[] = [];
        if (itemCount > 0) {
            for (let index = startIndex; index <= stopIndex; index++) {
                items.push(
                    createElement(children, {
                        data: itemData,
                        key: itemKey(index, itemData),
                        index,
                        isScrolling: useIsScrolling ? isScrolling : undefined,
                        style: this._getItemStyle(index),
                    })
                );
            }
        }

        // Read this value AFTER items have been created,
        // So their actual sizes (if variable) are taken into consideration.
        const estimatedTotalSize = getEstimatedTotalSize(this.props);

        return (<div className={className} onScroll={onScroll} ref={this._outerRefSetter} style={{
            position: 'relative',
            height,
            width,
            overflow: 'auto',
            WebkitOverflowScrolling: 'touch',
            willChange: 'transform',
            direction: direction as any,
            ...style,
        }}>
            <div ref={innerRef} style={{
                height: isHorizontal ? '100%' : estimatedTotalSize,
                pointerEvents: isScrolling ? 'none' : undefined,
                width: isHorizontal ? estimatedTotalSize : '100%',
            }}>
                {
                items
            }
            </div>
        </div>)
    }




    _callOnScroll = memoizeOne(
        (
            scrollDirection: ScrollDirection,
            scrollOffset: number,
            scrollUpdateWasRequested: boolean
        ) =>
            (this.props.onScroll as onScrollCallback)({
                scrollDirection,
                scrollOffset,
                scrollUpdateWasRequested,
            })
    );

    _callPropsCallbacks() {
        if (typeof this.props.onItemsRendered === 'function') {
            const { itemCount } = this.props;
            if (itemCount > 0) {
                const [
                    overscanStartIndex,
                    overscanStopIndex,
                    visibleStartIndex,
                    visibleStopIndex,
                ] = this._getRangeToRender();
                this._callOnItemsRendered(
                    overscanStartIndex,
                    overscanStopIndex,
                    visibleStartIndex,
                    visibleStopIndex
                );
            }
        }

        if (typeof this.props.onScroll === 'function') {
            const {
                scrollDirection,
                scrollOffset,
                scrollUpdateWasRequested,
            } = this.state;
            this._callOnScroll(
                scrollDirection,
                scrollOffset,
                scrollUpdateWasRequested
            );
        }
    }

    // Lazily create and cache item styles while scrolling,
    // So that pure component sCU will prevent re-renders.
    // We maintain this cache, and pass a style prop rather than index,
    // So that List can clear cached styles and force item re-render if necessary.

    _getItemStyle = (index: number): Object => {
        const { direction, itemSize, layout } = this.props;

        const itemStyleCache = this._getItemStyleCache(
            shouldResetStyleCacheOnItemSizeChange && itemSize,
            shouldResetStyleCacheOnItemSizeChange && layout,
            shouldResetStyleCacheOnItemSizeChange && direction
        );

        let style: React.CSSProperties = {};
        if (itemStyleCache.hasOwnProperty(index)) {
            style = itemStyleCache[index];
        } else {
            const offset = getItemOffset(this.props, index,);
            const size = getItemSize(this.props, index);

            // TODO Deprecate direction "horizontal"
            const isHorizontal =
                direction === 'horizontal' || layout === 'horizontal';

            const isRtl = direction === 'rtl';
            const offsetHorizontal = isHorizontal ? offset : 0;
            itemStyleCache[index] = style = {
                position: 'absolute',
                left: isRtl ? undefined : offsetHorizontal,
                right: isRtl ? offsetHorizontal : undefined,
                top: !isHorizontal ? offset : 0,
                height: !isHorizontal ? size : '100%',
                width: isHorizontal ? size : '100%',
            };
        }

        return style;
    };



    _getRangeToRender(): [number, number, number, number] {
        const { itemCount, overscanCount } = this.props;
        const { isScrolling, scrollDirection, scrollOffset } = this.state;

        if (itemCount === 0) {
            return [0, 0, 0, 0];
        }

        const startIndex = getStartIndexForOffset(
            this.props,
            scrollOffset,
        );
        const stopIndex = getStopIndexForStartIndex(
            this.props,
            startIndex,
            scrollOffset
        );

        // Overscan by one item in each direction so that tab/focus works.
        // If there isn't at least one extra item, tab loops back around.
        const overscanBackward =
            !isScrolling || scrollDirection === 'backward'
                ? Math.max(1, overscanCount)
                : 1;
        const overscanForward =
            !isScrolling || scrollDirection === 'forward'
                ? Math.max(1, overscanCount)
                : 1;

        return [
            Math.max(0, startIndex - overscanBackward),
            Math.max(0, Math.min(itemCount - 1, stopIndex + overscanForward)),
            startIndex,
            stopIndex,
        ];
    }

    _onScrollHorizontal = (event: ScrollEvent): void => {
        const { clientWidth, scrollLeft, scrollWidth } = event.currentTarget;
        this.setState(prevState => {
            if (prevState.scrollOffset === scrollLeft) {
                // Scroll position may have been updated by cDM/cDU,
                // In which case we don't need to trigger another render,
                // And we don't want to update state.isScrolling.
                return null;
            }

            const { direction } = this.props;

            let scrollOffset = scrollLeft;
            if (direction === 'rtl') {
                // TRICKY According to the spec, scrollLeft should be negative for RTL aligned elements.
                // This is not the case for all browsers though (e.g. Chrome reports values as positive, measured relative to the left).
                // It's also easier for this component if we convert offsets to the same format as they would be in for ltr.
                // So the simplest solution is to determine which browser behavior we're dealing with, and convert based on it.
                switch (getRTLOffsetType()) {
                    case 'negative':
                        scrollOffset = -scrollLeft;
                        break;
                    case 'positive-descending':
                        scrollOffset = scrollWidth - clientWidth - scrollLeft;
                        break;
                }
            }

            // Prevent Safari's elastic scrolling from causing visual shaking when scrolling past bounds.
            scrollOffset = Math.max(
                0,
                Math.min(scrollOffset, scrollWidth - clientWidth)
            );

            return {
                isScrolling: true,
                scrollDirection:
                    prevState.scrollOffset < scrollOffset ? 'forward' : 'backward',
                scrollOffset,
                scrollUpdateWasRequested: false,
            };
        }, this._resetIsScrollingDebounced);
    };

    _onScrollVertical = (event: ScrollEvent): void => {
        const { clientHeight, scrollHeight, scrollTop } = event.currentTarget;
        this.setState(prevState => {
            if (prevState.scrollOffset === scrollTop) {
                // Scroll position may have been updated by cDM/cDU,
                // In which case we don't need to trigger another render,
                // And we don't want to update state.isScrolling.
                return null;
            }

            // Prevent Safari's elastic scrolling from causing visual shaking when scrolling past bounds.
            const scrollOffset = Math.max(
                0,
                Math.min(scrollTop, scrollHeight - clientHeight)
            );

            return {
                isScrolling: true,
                scrollDirection:
                    prevState.scrollOffset < scrollOffset ? 'forward' : 'backward',
                scrollOffset,
                scrollUpdateWasRequested: false,
            };
        }, this._resetIsScrollingDebounced);
    };

    _outerRefSetter = (ref: any): void => {
        const { outerRef } = this.props;

        this._outerRef = (ref as HTMLDivElement);

        if (typeof outerRef === 'function') {
            outerRef(ref);
        } else if (
            outerRef != null &&
            typeof outerRef === 'object' &&
            outerRef.hasOwnProperty('current')
        ) {
            // 怎么解决类型问题 ？
            // @ts-ignore
            outerRef.current = ref;
        }
    };
};

export default FixedSizeList;