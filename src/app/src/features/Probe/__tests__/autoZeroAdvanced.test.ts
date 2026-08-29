/*
 * AutoZero Advanced - a touchplate type that behaves exactly like "AutoZero"
 * but exposes the probing-corner selector that was removed upstream in
 * 218cbaf3c ("Removed probe corner selection functionality").
 *
 * The physical plate is identical, so the routines, the Z thickness and the
 * G-code must all match stock AutoZero. The ONLY difference is that the user
 * is allowed to choose a corner other than the default bottom-left.
 *
 * The failure modes guarded here are silent - they all produce valid,
 * plausible-looking G-code that zeroes in the wrong place:
 *   - falling through to the standard-block routine
 *   - using the 15mm standard-block thickness instead of the 5mm plate
 *   - applying the wrong sign to the 22.5mm corner offset (a ~45mm error)
 */

import { getProbeCode } from 'app/lib/Probing';
import {
    TOUCHPLATE_TYPE_AUTOZERO,
    TOUCHPLATE_TYPE_AUTOZERO_ADVANCED,
    TOUCHPLATE_TYPE_STANDARD,
    TOUCHPLATE_TYPE_BITZERO,
    TOUCHPLATE_TYPE_ZERO,
    TOUCHPLATE_TYPE_3D,
    TOUCHPLATE_TYPES,
    isAutoZeroFamily,
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
        homingEnabled: false,
        firmware: 'grblHAL',
        plateType: TOUCHPLATE_TYPE_AUTOZERO_ADVANCED,
        probeType: PROBE_TYPE_AUTO,
        ...overrides,
    }) as ProbingOptions;

describe('isAutoZeroFamily', () => {
    it('matches both AutoZero variants', () => {
        expect(isAutoZeroFamily(TOUCHPLATE_TYPE_AUTOZERO)).toBe(true);
        expect(isAutoZeroFamily(TOUCHPLATE_TYPE_AUTOZERO_ADVANCED)).toBe(true);
    });

    it('does not match any other touchplate type', () => {
        expect(isAutoZeroFamily(TOUCHPLATE_TYPE_STANDARD)).toBe(false);
        expect(isAutoZeroFamily(TOUCHPLATE_TYPE_BITZERO)).toBe(false);
        expect(isAutoZeroFamily(TOUCHPLATE_TYPE_ZERO)).toBe(false);
        expect(isAutoZeroFamily(TOUCHPLATE_TYPE_3D)).toBe(false);
        expect(isAutoZeroFamily('')).toBe(false);
        expect(isAutoZeroFamily(undefined as unknown as string)).toBe(false);
    });
});

describe('AutoZero Advanced registration', () => {
    it('is a distinct type from stock AutoZero', () => {
        expect(TOUCHPLATE_TYPE_AUTOZERO_ADVANCED).toBe('AutoZero Advanced');
        expect(TOUCHPLATE_TYPE_AUTOZERO_ADVANCED).not.toBe(
            TOUCHPLATE_TYPE_AUTOZERO,
        );
    });

    it('appears in the TOUCHPLATE_TYPES map that drives the probe dropdown', () => {
        expect(Object.values(TOUCHPLATE_TYPES)).toContain(
            TOUCHPLATE_TYPE_AUTOZERO_ADVANCED,
        );
    });
});

describe('AutoZero Advanced routing in getProbeCode', () => {
    // The AutoZero routines are the only ones that emit an "AZ Probe" banner.
    // Falling through to the standard-block path is the silent failure we are
    // guarding against, so assert on that marker rather than on axis counts.
    const expectAutoZeroRoutine = (code: string[]) => {
        expect(code.join('\n')).toMatch(/; AZ Probe/);
    };

    it.each([
        ['Auto', PROBE_TYPE_AUTO],
        ['Tip', PROBE_TYPE_TIP],
        ['Diameter', PROBE_TYPE_DIAMETER],
    ])('routes probeType=%s to an AutoZero routine', (_label, probeType) => {
        const code = getProbeCode(
            baseOptions({
                probeType: probeType as ProbingOptions['probeType'],
            }),
            0,
        );
        expectAutoZeroRoutine(code);
    });

    it('produces byte-identical G-code to stock AutoZero for every corner', () => {
        // Same plate, same routine - the type name must not change the output.
        ([0, 1, 2, 3] as const).forEach((direction) => {
            const stock = getProbeCode(
                baseOptions({ plateType: TOUCHPLATE_TYPE_AUTOZERO }),
                direction,
            );
            const advanced = getProbeCode(
                baseOptions({ plateType: TOUCHPLATE_TYPE_AUTOZERO_ADVANCED }),
                direction,
            );
            expect(advanced).toEqual(stock);
        });
    });

    it('uses the 5mm autoZero thickness, never the 15mm standard block', () => {
        const code = getProbeCode(baseOptions(), 0).join('\n');
        expect(code).toContain('%Z_THICKNESS = 5');
        expect(code).not.toContain('%Z_THICKNESS = 15');
    });
});

describe('AutoZero Advanced corner offsets', () => {
    // 22.5mm from the probed pocket centre out to the workpiece corner. The
    // SIGN is the corner - getting it wrong puts the zero ~45mm out.
    const CORNERS: Array<[string, number, string, string]> = [
        ['bottom-left', 0, '22.5', '22.5'],
        ['top-left', 1, '22.5', '-22.5'],
        ['top-right', 2, '-22.5', '-22.5'],
        ['bottom-right', 3, '-22.5', '22.5'],
    ];

    it.each(CORNERS)(
        'emits the correct offsets for the %s corner',
        (_name, direction, xOff, yOff) => {
            const code = getProbeCode(baseOptions(), direction).join('\n');
            expect(code).toContain(`%X_OFF = ${xOff}`);
            expect(code).toContain(`%Y_OFF = ${yOff}`);
        },
    );

    it('records the chosen corner in the G-code comment for traceability', () => {
        const code = getProbeCode(baseOptions(), 2).join('\n');
        expect(code).toContain('direction: 2');
    });

    it('gives each corner a distinct offset pair', () => {
        const pairs = CORNERS.map(([, direction]) => {
            const code = getProbeCode(baseOptions(), direction).join('\n');
            const x = code.match(/%X_OFF = (-?[\d.]+)/)?.[1];
            const y = code.match(/%Y_OFF = (-?[\d.]+)/)?.[1];
            return `${x},${y}`;
        });
        expect(new Set(pairs).size).toBe(4);
    });
});
