import { forwardRef, useEffect, useImperativeHandle, useLayoutEffect, useRef } from 'react';
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
        node.style.height = 'auto';
        node.style.height = `${Math.max(node.scrollHeight, 28)}px`;
    };

    useLayoutEffect(() => {
        resize();
        const frameId = requestAnimationFrame(resize);
        return () => cancelAnimationFrame(frameId);
    }, [props.value, props.defaultValue]);

    useEffect(() => {
        const node = innerRef.current;
        if (!node) return;

        let observer: ResizeObserver | null = null;
        if (typeof ResizeObserver !== 'undefined') {
            observer = new ResizeObserver(() => {
                resize();
            });
            observer.observe(node);
        }

        window.addEventListener('resize', resize);
        if ('fonts' in document) {
            document.fonts.ready.then(resize).catch(() => {});
        }

        return () => {
            observer?.disconnect();
            window.removeEventListener('resize', resize);
        };
    }, []);

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
                resize: 'none',
            }}
        />
    );
});

export default AutoGrowTextarea;
