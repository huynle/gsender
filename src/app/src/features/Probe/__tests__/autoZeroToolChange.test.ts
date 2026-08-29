/*
 * Tool-change probing must use the AutoZero plate thickness for BOTH AutoZero
 * variants.
 *
 * getProbeSettings() falls back to the 15mm standard-block thickness for any
 * touchplate type it does not recognise. That produces a 10mm Z error after a
 * tool change with no error and no warning, so the Advanced variant is pinned
 * here explicitly.
 */

import {
    TOUCHPLATE_TYPE_AUTOZERO,
    TOUCHPLATE_TYPE_AUTOZERO_ADVANCED,
    TOUCHPLATE_TYPE_STANDARD,
    TOUCHPLATE_TYPE_ZERO,
    TOUCHPLATE_TYPE_3D,
    TOUCHPLATE_TYPE_BITZERO,
} from 'app/lib/constants';

const mockZThickness = {
    standardBlock: 15,
    autoZero: 5,
    zProbe: 15,
    probe3D: 0,
    bitZero: 13,
    bitZeroZOnly: 15.5,
};

const mockProbeWidget = {
    probeFeedrate: 75,
    probeFastFeedrate: 150,
    retractionDistance: 4,
    zProbeDistance: 30,
};

let mockTouchplateType: string = TOUCHPLATE_TYPE_STANDARD;

jest.mock('app/store', () => ({
    __esModule: true,
    default: {
        get: (key: string) => {
            if (key === 'workspace.probeProfile') {
                return { zThickness: mockZThickness };
            }
            if (key === 'widgets.probe') {
                return mockProbeWidget;
            }
            if (key === 'workspace.probeProfile.touchplateType') {
                return mockTouchplateType;
            }
            return undefined;
        },
        on: jest.fn(),
        removeListener: jest.fn(),
    },
}));

// eslint-disable-next-line import/first
import { getProbeSettings } from 'app/lib/toolChangeUtils';

describe('getProbeSettings - AutoZero plate thickness', () => {
    const thicknessFor = (touchplateType: string): number => {
        mockTouchplateType = touchplateType;
        return getProbeSettings().zProbeThickness;
    };

    it('uses the 5mm AutoZero thickness for the stock AutoZero plate', () => {
        expect(thicknessFor(TOUCHPLATE_TYPE_AUTOZERO)).toBe(
            mockZThickness.autoZero,
        );
    });

    it('uses the same 5mm thickness for AutoZero Advanced', () => {
        // Same physical plate - a different number here would mean the tool
        // change silently probes to the wrong Z.
        expect(thicknessFor(TOUCHPLATE_TYPE_AUTOZERO_ADVANCED)).toBe(
            mockZThickness.autoZero,
        );
    });

    it('never falls back to the 15mm standard block for AutoZero Advanced', () => {
        expect(thicknessFor(TOUCHPLATE_TYPE_AUTOZERO_ADVANCED)).not.toBe(
            mockZThickness.standardBlock,
        );
    });

    it('leaves the other touchplate types untouched', () => {
        expect(thicknessFor(TOUCHPLATE_TYPE_STANDARD)).toBe(
            mockZThickness.standardBlock,
        );
        expect(thicknessFor(TOUCHPLATE_TYPE_ZERO)).toBe(mockZThickness.zProbe);
        expect(thicknessFor(TOUCHPLATE_TYPE_3D)).toBe(mockZThickness.probe3D);
        expect(thicknessFor(TOUCHPLATE_TYPE_BITZERO)).toBe(
            mockZThickness.bitZeroZOnly,
        );
    });
});
