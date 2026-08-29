/*
 * Regression guard for the stock "3D Probe" touchplate path.
 *
 * The 3D probe has no routine of its own - it runs the standard-block code
 * with parameter overrides applied by updateOptionsForDirection (tip-radius
 * compensation, xyThickness forced to 0, the probe3D Z thickness, the
 * xyRetract3D reposition and a hard-coded 5mm Z offset).
 *
 * "3D Probe Advanced" reuses that exact path and only adds corner selection
 * plus the Circle Center routine, so the stock 3D output must not move.
 * These snapshots were recorded BEFORE that work began.
 */

import { getProbeCode } from 'app/lib/Probing';
import { TOUCHPLATE_TYPE_3D, PROBE_TYPE_DIAMETER } from 'app/lib/constants';
import type { ProbingOptions } from '../definitions';

const baseOptions = (overrides: Partial<ProbingOptions> = {}): ProbingOptions =>
    ({
        modal: '21',
        units: 'mm',
        axes: { x: true, y: true, z: true },
        probeFast: 200,
        probeSlow: 75,
        retract: 2,
        zRetractNormal: 2,
        zRetractAuto: 1,
        toolDiameter: 6.35,
        tipDiameter3D: 2,
        xyRetract3D: 10,
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
        // Homing off keeps Z travel literal; getZDownTravel() needs soft-limit
        // store state that does not exist under Jest.
        homingEnabled: false,
        firmware: 'grblHAL',
        plateType: TOUCHPLATE_TYPE_3D,
        probeType: PROBE_TYPE_DIAMETER,
        ...overrides,
    }) as ProbingOptions;

describe('3D Probe (stock) regression guard', () => {
    const AXES = [
        ['XYZ', { x: true, y: true, z: true }],
        ['XY', { x: true, y: true, z: false }],
        ['X', { x: true, y: false, z: false }],
        ['Y', { x: false, y: true, z: false }],
        ['Z', { x: false, y: false, z: true }],
    ] as const;

    it.each(AXES)('emits stable G-code for %s', (_label, axes) => {
        expect(
            getProbeCode(baseOptions({ axes: axes as never }), 0),
        ).toMatchSnapshot();
    });

    it('compensates the tip radius, not the tool diameter', () => {
        // tip 2mm -> radius 1mm; xyThickness is forced to 0 for the 3D probe,
        // so X/Y zero lands exactly one tip radius off the touched face.
        const code = getProbeCode(baseOptions(), 0).join('\n');
        expect(code).toContain('%X_THICKNESS=-1');
        expect(code).toContain('%Y_THICKNESS=-1');
        // The 6.35mm tool diameter must not leak into the offsets.
        expect(code).not.toContain('%X_THICKNESS=-3.175');
    });

    it('uses the probe3D Z thickness rather than the standard block', () => {
        const code = getProbeCode(baseOptions(), 0).join('\n');
        expect(code).toContain('%Z_THICKNESS=0');
        expect(code).not.toContain('%Z_THICKNESS=15');
    });

    describe('corner support already present in the shared standard path', () => {
        // The 3D probe runs updateOptionsForDirection, which signs the probe
        // distances and thicknesses by corner. This already works today - the
        // UI simply never exposed it - so pin it before unlocking the picker.
        const CORNERS: Array<[string, number, string, string]> = [
            ['bottom-left', 0, '30', '30'],
            ['top-left', 1, '30', '-30'],
            ['top-right', 2, '-30', '-30'],
            ['bottom-right', 3, '-30', '30'],
        ];

        it.each(CORNERS)(
            'signs the probe distances for the %s corner',
            (_name, direction, xDist, yDist) => {
                const code = getProbeCode(baseOptions(), direction).join('\n');
                expect(code).toContain(`%X_PROBE_DISTANCE=${xDist}`);
                expect(code).toContain(`%Y_PROBE_DISTANCE=${yDist}`);
            },
        );

        it.each(CORNERS)(
            'signs the tip-radius offset for the %s corner',
            (_name, direction, xDist) => {
                const code = getProbeCode(baseOptions(), direction).join('\n');
                const sign = xDist.startsWith('-') ? '1' : '-1';
                expect(code).toContain(`%X_THICKNESS=${sign}`);
            },
        );
    });
});
