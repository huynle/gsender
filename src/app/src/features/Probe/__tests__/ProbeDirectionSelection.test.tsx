/*
 * The corner selector restored for AutoZero Advanced.
 *
 * The rotation classes are the only visual cue for which corner is armed, and
 * the label is what the operator reads back before committing to a probe, so
 * both are pinned here.
 */

import { render, screen, fireEvent } from '@testing-library/react';
import ProbeDirectionSelection from '../ProbeDirectionSelection';

const noop = () => {};

describe('ProbeDirectionSelection', () => {
    it.each([
        [0, 'Front-Left corner'],
        [1, 'Top-Left corner'],
        [2, 'Top-Right corner'],
        [3, 'Front-Right corner'],
    ])('labels direction %i as "%s"', (direction, label) => {
        render(
            <ProbeDirectionSelection direction={direction} onClick={noop} />,
        );
        expect(
            screen.getByRole('button', {
                name: `Current probing corner: ${label}. Click to cycle.`,
            }),
        ).toBeInTheDocument();
    });

    it('cycles to the next corner when clicked', () => {
        const onClick = jest.fn();
        render(<ProbeDirectionSelection direction={0} onClick={onClick} />);

        fireEvent.click(screen.getByRole('button'));

        expect(onClick).toHaveBeenCalledTimes(1);
    });

    it.each([
        [0, 'rotate(0deg)'],
        [1, 'rotate(90deg)'],
        [2, 'rotate(180deg)'],
        [3, 'rotate(270deg)'],
    ])('rotates the indicator for direction %i', (direction, rotation) => {
        render(
            <ProbeDirectionSelection direction={direction} onClick={noop} />,
        );
        expect(screen.getByRole('button').className).toContain(rotation);
    });

    it('falls back to a clear label for an out-of-range direction', () => {
        render(<ProbeDirectionSelection direction={9} onClick={noop} />);
        expect(screen.getByRole('button').getAttribute('aria-label')).toContain(
            'Unknown corner',
        );
    });

    it('is absolutely positioned by default and static when asked', () => {
        const { container, rerender } = render(
            <ProbeDirectionSelection direction={0} onClick={noop} />,
        );
        expect(container.firstChild).toHaveClass('absolute');

        rerender(
            <ProbeDirectionSelection
                direction={0}
                onClick={noop}
                isAbsolute={false}
            />,
        );
        expect(container.firstChild).not.toHaveClass('absolute');
    });
});
