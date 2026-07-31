import { forwardRef, useImperativeHandle, useLayoutEffect, useRef } from 'react';
import type { TextareaHTMLAttributes } from 'react';

type Props = TextareaHTMLAttributes<HTMLTextAreaElement>;

const AutoGrowTextarea = forwardRef<HTMLTextAreaElement, Props>(function AutoGrowTextarea(
    { onInput, style, ...props },
    forwardedRef
) {
    const innerRef = useRef<HTMLTextAreaElement>(null);

    useImperativeHandle(forwardedRef, () => innerRef.current as HTMLTextAreaElement, []);

    const resize = () => {
        const node = innerRef.current;
        if (!node) return;
        node.style.height = '0px';
        node.style.height = `${node.scrollHeight}px`;
    };

    useLayoutEffect(() => {
        resize();
    }, [props.value]);

    return (
        <textarea
            {...props}
            ref={innerRef}
            onInput={(event) => {
                resize();
                onInput?.(event);
            }}
            style={{
                ...style,
                overflow: 'hidden',
            }}
        />
    );
});

export default AutoGrowTextarea;
