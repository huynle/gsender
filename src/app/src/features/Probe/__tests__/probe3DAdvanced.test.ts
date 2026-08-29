/*
 * "3D Probe Advanced" - the same physical 3D probe as "3D Probe", plus:
 *   1. the probing-corner selector (the shared standard path already signs
 *      everything by corner; the UI simply never exposed it), and
 *   2. a Circle Center routine that finds the middle of a bore or a boss and
 *      zeroes XY there.
 *
 * The failure modes guarded here are silent - each produces valid G-code that
 * zeroes in the wrong place, or drives the probe through the work:
 *   - falling through to the standard-block routine (wrong tip compensation)
 *   - reading posx/posy without honouring $13, so the computed centre is in
 *     the wrong unit system (the bug d98e8947b fixed for AutoZero, and which
 *     the BitZero bore routine still has)
 *   - crossing a boss without lifting Z first (drags the probe through it)
 */

import { getProbeCode } from 'app/lib/Probing';
import {
    TOUCHPLATE_TYPE_3D,
    TOUCHPLATE_TYPE_3D_ADVANCED,
    TOUCHPLATE_TYPE_STANDARD,
    TOUCHPLATE_TYPE_AUTOZERO,
    TOUCHPLATE_TYPE_BITZERO,
    TOUCHPLATE_TYPES,
    is3DFamily,
    PROBE_TYPE_DIAMETER,
    CIRCLE_MODE_BORE,
    CIRCLE_MODE_BOSS,
    PROBE_ROUTINE_CIRCLE_CENTER,
    routineUsesCorner,
} from 'app/lib/constants';
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
        homingEnabled: false,
        firmware: 'grblHAL',
        plateType: TOUCHPLATE_TYPE_3D_ADVANCED,
        probeType: PROBE_TYPE_DIAMETER,
        circleDiameter: 20,
        circleMode: CIRCLE_MODE_BORE,
        circleProbeDepth: 5,
        ...overrides,
    }) as ProbingOptions;

const circleOptions = (overrides: Partial<ProbingOptions> = {}) =>
    baseOptions({
        routineId: PROBE_ROUTINE_CIRCLE_CENTER,
        axes: { x: true, y: true, z: false },
        ...overrides,
    });

describe('is3DFamily', () => {
    it('matches both 3D probe variants', () => {
        expect(is3DFamily(TOUCHPLATE_TYPE_3D)).toBe(true);
        expect(is3DFamily(TOUCHPLATE_TYPE_3D_ADVANCED)).toBe(true);
    });

    it('does not match any other touchplate type', () => {
        expect(is3DFamily(TOUCHPLATE_TYPE_STANDARD)).toBe(false);
        expect(is3DFamily(TOUCHPLATE_TYPE_AUTOZERO)).toBe(false);
        expect(is3DFamily(TOUCHPLATE_TYPE_BITZERO)).toBe(false);
        expect(is3DFamily('')).toBe(false);
        expect(is3DFamily(undefined as unknown as string)).toBe(false);
    });
});

describe('routineUsesCorner', () => {
    // Circle Center zeroes on a computed centre and ignores `direction`
    // entirely, so offering a corner alongside it is misleading - it implies a
    // choice that has no effect on the resulting zero.
    it('is false for Circle Center', () => {
        expect(routineUsesCorner(PROBE_ROUTINE_CIRCLE_CENTER)).toBe(false);
    });

    it('is true for the corner touch-off routines', () => {
        ['XYZ Touch', 'XY Touch', 'X Touch', 'Y Touch', 'Z Touch'].forEach(
            (id) => {
                expect(routineUsesCorner(id)).toBe(true);
            },
        );
    });

    it('defaults to true when the routine is unknown', () => {
        expect(routineUsesCorner(undefined)).toBe(true);
    });
});

describe('3D Probe Advanced registration', () => {
    it('is a distinct type from the stock 3D probe', () => {
        expect(TOUCHPLATE_TYPE_3D_ADVANCED).toBe('3D Probe Advanced');
        expect(TOUCHPLATE_TYPE_3D_ADVANCED).not.toBe(TOUCHPLATE_TYPE_3D);
    });

    it('appears in the touchplate map that drives the dropdown', () => {
        expect(Object.values(TOUCHPLATE_TYPES)).toContain(
            TOUCHPLATE_TYPE_3D_ADVANCED,
        );
    });
});

describe('3D Probe Advanced standard routines', () => {
    const AXES = [
        ['XYZ', { x: true, y: true, z: true }],
        ['XY', { x: true, y: true, z: false }],
        ['X', { x: true, y: false, z: false }],
        ['Y', { x: false, y: true, z: false }],
        ['Z', { x: false, y: false, z: true }],
    ] as const;

    it.each(AXES)(
        'produces byte-identical G-code to the stock 3D probe for %s',
        (_label, axes) => {
            const stock = getProbeCode(
                baseOptions({ plateType: TOUCHPLATE_TYPE_3D, axes: axes as never }),
                0,
            );
            const advanced = getProbeCode(
                baseOptions({ axes: axes as never }),
                0,
            );
            expect(advanced).toEqual(stock);
        },
    );

    it('is identical to the stock 3D probe for every corner', () => {
        ([0, 1, 2, 3] as const).forEach((direction) => {
            const stock = getProbeCode(
                baseOptions({ plateType: TOUCHPLATE_TYPE_3D }),
                direction,
            );
            const advanced = getProbeCode(baseOptions(), direction);
            expect(advanced).toEqual(stock);
        });
    });

    it('compensates the tip radius rather than the tool diameter', () => {
        const code = getProbeCode(baseOptions(), 0).join('\n');
        expect(code).toContain('%X_THICKNESS=-1');
        expect(code).not.toContain('%X_THICKNESS=-3.175');
    });
});

describe('Circle Center - shared behaviour', () => {
    it('is only reachable through the Circle Center routine id', () => {
        // Without the routine id the same axes must still mean "XY Touch",
        // otherwise selecting XY would silently run a bore cycle.
        const xyTouch = getProbeCode(
            baseOptions({ axes: { x: true, y: true, z: false } }),
            0,
        ).join('\n');
        expect(xyTouch).not.toContain('Circle Center');
        expect(xyTouch).toContain('; Initial Probe setup');
    });

    it.each([CIRCLE_MODE_BORE, CIRCLE_MODE_BOSS])(
        'zeroes X and Y at the centre in %s mode',
        (circleMode) => {
            const code = getProbeCode(circleOptions({ circleMode }), 0).join(
                '\n',
            );
            expect(code).toMatch(/G10 L20 P0 .*X0.*Y0/);
        },
    );

    it.each([CIRCLE_MODE_BORE, CIRCLE_MODE_BOSS])(
        'probes four walls in %s mode',
        (circleMode) => {
            const code = getProbeCode(circleOptions({ circleMode }), 0);
            const xProbes = code.filter((l) => /^G38\.2 X/.test(l)).length;
            const yProbes = code.filter((l) => /^G38\.2 Y/.test(l)).length;
            // Two walls per axis, each with a fast pass and a slow re-touch.
            expect(xProbes).toBeGreaterThanOrEqual(4);
            expect(yProbes).toBeGreaterThanOrEqual(4);
        },
    );

    it.each([CIRCLE_MODE_BORE, CIRCLE_MODE_BOSS])(
        'uses a relative midpoint delta in %s mode, never an absolute posx move',
        (circleMode) => {
            const code = getProbeCode(circleOptions({ circleMode }), 0).join(
                '\n',
            );
            // The AutoZero-proven form: delta from the last probed wall.
            expect(code).toMatch(/%X_CENTER=\(\(X_SECOND - X_FIRST\)\/2\)\*-1/);
            expect(code).toMatch(/%Y_CENTER=\(\(Y_SECOND - Y_FIRST\)\/2\)\*-1/);
            // An absolute move computed from posx is the BitZero $13 bug.
            expect(code).not.toMatch(/G90 G[01] X\[\(X/);
        },
    );

    it.each([CIRCLE_MODE_BORE, CIRCLE_MODE_BOSS])(
        'produces the same G-code for every corner in %s mode',
        (circleMode) => {
            // This is why the corner picker is hidden for Circle Center: the
            // corner cannot change the outcome, so showing it would imply a
            // choice that does nothing.
            const base = getProbeCode(circleOptions({ circleMode }), 0);
            ([1, 2, 3] as const).forEach((direction) => {
                expect(
                    getProbeCode(circleOptions({ circleMode }), direction),
                ).toEqual(base);
            });
        },
    );

    it('never sets a Z offset - Circle Center is an XY routine', () => {
        const code = getProbeCode(circleOptions(), 0).join('\n');
        expect(code).not.toMatch(/G10 L20 P0[^\n]*Z/);
    });
});

describe('Circle Center - $13 unit safety', () => {
    // posx/posy are reported in the units $13 selects, NOT the modal units.
    // Moving by a posx-derived delta without G20 is the d98e8947b bug.
    it.each([CIRCLE_MODE_BORE, CIRCLE_MODE_BOSS])(
        'prepends G20 to the centring move when $13=1 (%s)',
        (circleMode) => {
            const code = getProbeCode(
                circleOptions({ circleMode, $13: '1' }),
                0,
            ).join('\n');
            expect(code).toMatch(/G20 G91 G0 X\[X_CENTER\]/);
            expect(code).toMatch(/G20 G91 G0 Y\[Y_CENTER\]/);
        },
    );

    it.each([CIRCLE_MODE_BORE, CIRCLE_MODE_BOSS])(
        'omits G20 when $13=0 (%s)',
        (circleMode) => {
            const code = getProbeCode(
                circleOptions({ circleMode, $13: '0' }),
                0,
            ).join('\n');
            expect(code).not.toContain('G20');
        },
    );

    it('re-asserts G21 after the centring move so later moves stay metric', () => {
        const code = getProbeCode(circleOptions({ $13: '1' }), 0);
        const idx = code.findIndex((l) => /X\[X_CENTER\]/.test(l));
        expect(idx).toBeGreaterThan(-1);
        // The very next motion line must restore metric.
        const after = code.slice(idx + 1).find((l) => /^G\d/.test(l));
        expect(after).toMatch(/^G21/);
    });
});

describe('Circle Center - emitted G-code', () => {
    it.each([CIRCLE_MODE_BORE, CIRCLE_MODE_BOSS])(
        'is stable for %s',
        (circleMode) => {
            expect(
                getProbeCode(circleOptions({ circleMode }), 0),
            ).toMatchSnapshot();
        },
    );
});

describe('Circle Center - inside bore', () => {
    it('searches outward from the start point, bounded by the diameter', () => {
        const code = getProbeCode(
            circleOptions({ circleDiameter: 20 }),
            0,
        ).join('\n');
        // First wall: half the bore plus margin. Second: a full bore crossing.
        expect(code).toContain('%CIRCLE_SEARCH_HALF=');
        expect(code).toContain('%CIRCLE_SEARCH_FULL=');
    });

    it('never moves Z - the probe stays at depth inside the bore', () => {
        const code = getProbeCode(circleOptions(), 0);
        expect(code.filter((l) => /^G\d+.*\bZ/.test(l))).toHaveLength(0);
    });

    it('announces the mode and diameter for traceability', () => {
        const code = getProbeCode(
            circleOptions({ circleDiameter: 20 }),
            0,
        ).join('\n');
        expect(code).toContain('Circle Center');
        expect(code).toContain('inside bore');
        expect(code).toContain('20');
    });
});

describe('Circle Center - outside boss', () => {
    const bossCode = (o: Partial<ProbingOptions> = {}) =>
        getProbeCode(circleOptions({ circleMode: CIRCLE_MODE_BOSS, ...o }), 0);

    it('drops Z beside the boss before probing inward', () => {
        const code = bossCode();
        const firstProbe = code.findIndex((l) => /^G38\.2 X/.test(l));
        const dropBefore = code
            .slice(0, firstProbe)
            .some((l) => /G0 Z-\[CIRCLE_PROBE_DEPTH\]/.test(l));
        expect(dropBefore).toBe(true);
    });

    it('lifts Z before crossing to the opposite side', () => {
        // Crossing at probing depth would drag the probe straight through
        // the boss. Every crossing move must be preceded by a lift.
        const code = bossCode();
        const crossIdx = code.findIndex((l) =>
            /G0 X-\[CIRCLE_CROSS\]/.test(l),
        );
        expect(crossIdx).toBeGreaterThan(-1);
        const lifted = code
            .slice(0, crossIdx)
            .reverse()
            .find((l) => /Z\[CIRCLE_PROBE_DEPTH\]|Z-\[CIRCLE_PROBE_DEPTH\]/.test(l));
        expect(lifted).toMatch(/G0 Z\[CIRCLE_PROBE_DEPTH\]/);
    });

    it('returns Z to the starting height by the end of the cycle', () => {
        const code = bossCode();
        const downs = code.filter((l) =>
            /G0 Z-\[CIRCLE_PROBE_DEPTH\]/.test(l),
        ).length;
        const ups = code.filter((l) =>
            /G0 Z\[CIRCLE_PROBE_DEPTH\]/.test(l),
        ).length;
        expect(ups).toBe(downs);
    });

    it('announces the mode for traceability', () => {
        expect(bossCode().join('\n')).toContain('outside boss');
    });
});
