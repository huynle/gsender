/*
 * Regression guard for the stock "AutoZero" touchplate path.
 *
 * The AutoZero Advanced feature adds a second touchplate type that reuses the
 * exact same probing routines. These snapshots pin the G-code emitted by the
 * ORIGINAL "AutoZero" type so that any accidental change to the default,
 * shipped-by-Sienci behaviour fails loudly.
 *
 * These snapshots were recorded BEFORE the AutoZero Advanced work began.
 * If one of them changes, the default AutoZero path has been altered - that is
 * almost certainly a bug, not an expected update.
 */

import { getProbeCode } from 'app/lib/Probing';
import {
    TOUCHPLATE_TYPE_AUTOZERO,
    PROBE_TYPE_AUTO,
    PROBE_TYPE_TIP,
    PROBE_TYPE_DIAMETER,
} from 'app/lib/constants';
import type { ProbingOptions } from '../definitions';

const baseOptions = (overrides: Partial<ProbingOptions> = {}): ProbingOptions =>
    ({
        modal: 'G21',
        units: 'mm',
        axes: { x: true, y: true, z: true },
        probeFast: 200,
        probeSlow: 75,
        retract: 2,
        zRetractNormal: 1,
        zRetractAuto: 1,
        toolDiameter: 6.35,
        tipDiameter3D: 2,
        xyRetract3D: 3,
        xyThickness: 10,
        probeDistances: { x: 30, y: 30, z: 30 },
        probeMovementSpeed: 0,
        probeMovementSpeedAuto: 0,
        zThickness: {
            standardBlock: 15,
            autoZero: 5,
            zProbe: 15,
            probe3D: 0,
            bitZero: 13,
            bitZeroZOnly: 15.5,
        },
        $13: '0',
        // Homing off keeps the Z travel a literal 25mm. With homing on, the
        // routine calls getZDownTravel(), which depends on soft-limit store
        // state that does not exist under Jest and yields a nonsense distance.
        homingEnabled: false,
        firmware: 'grblHAL',
        plateType: TOUCHPLATE_TYPE_AUTOZERO,
        probeType: PROBE_TYPE_AUTO,
        ...overrides,
    }) as ProbingOptions;

describe('AutoZero (stock) regression guard', () => {
    describe.each([
        ['Auto', PROBE_TYPE_AUTO],
        ['Tip', PROBE_TYPE_TIP],
        ['Diameter', PROBE_TYPE_DIAMETER],
    ])('probeType=%s', (_label, probeType) => {
        it('emits stable G-code for XYZ', () => {
            const code = getProbeCode(
                baseOptions({
                    probeType: probeType as ProbingOptions['probeType'],
                    axes: { x: true, y: true, z: true },
                }),
                0,
            );
            expect(code).toMatchSnapshot();
        });

        it('emits stable G-code for XY', () => {
            const code = getProbeCode(
                baseOptions({
                    probeType: probeType as ProbingOptions['probeType'],
                    axes: { x: true, y: true, z: false },
                }),
                0,
            );
            expect(code).toMatchSnapshot();
        });

        it('emits stable G-code for Z only', () => {
            const code = getProbeCode(
                baseOptions({
                    probeType: probeType as ProbingOptions['probeType'],
                    axes: { x: false, y: false, z: true },
                }),
                0,
            );
            expect(code).toMatchSnapshot();
        });
    });

    it('still honours the autoZero thickness (not standardBlock)', () => {
        const code = getProbeCode(baseOptions(), 0).join('\n');
        expect(code).toContain('%Z_THICKNESS = 5');
        expect(code).not.toContain('%Z_THICKNESS = 15');
    });

    it('defaults to the bottom-left corner offsets', () => {
        const code = getProbeCode(baseOptions(), 0).join('\n');
        expect(code).toContain('%X_OFF = 22.5');
        expect(code).toContain('%Y_OFF = 22.5');
    });
});
