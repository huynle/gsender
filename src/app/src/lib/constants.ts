/*
 * Copyright (C) 2021 Sienci Labs Inc.
 *
 * This file is part of gSender.
 *
 * gSender is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, under version 3 of the License.
 *
 * gSender is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with gSender.  If not, see <https://www.gnu.org/licenses/>.
 *
 * Contact for information regarding this program and its license
 * can be sent through gSender@sienci.com or mailed to the main office
 * of Sienci Labs Inc. in Waterloo, Ontario, Canada.
 *
 */

export const modifierKeys = ['shift', 'alt', 'ctrl', 'meta'];

export const MAX_TERMINAL_INPUT_ARRAY_SIZE = 300;

export const TOUCHPLATE_TYPE_STANDARD = 'Standard Block';
export const TOUCHPLATE_TYPE_AUTOZERO = 'AutoZero';
export const TOUCHPLATE_TYPE_AUTOZERO_ADVANCED = 'AutoZero Advanced';
export const TOUCHPLATE_TYPE_ZERO = 'Z Probe';
export const TOUCHPLATE_TYPE_3D = '3D Probe';
export const TOUCHPLATE_TYPE_3D_ADVANCED = '3D Probe Advanced';
export const TOUCHPLATE_TYPE_BITZERO = 'BitZero';
export const TOUCHPLATE_TYPES = {
    TOUCHPLATE_TYPE_STANDARD: 'Standard Block',
    TOUCHPLATE_TYPE_AUTOZERO: 'AutoZero',
    TOUCHPLATE_TYPE_AUTOZERO_ADVANCED: 'AutoZero Advanced',
    TOUCHPLATE_TYPE_ZERO: 'Z Probe',
    TOUCHPLATE_TYPE_3D: '3D Probe',
    TOUCHPLATE_TYPE_3D_ADVANCED: '3D Probe Advanced',
    TOUCHPLATE_TYPE_BITZERO: 'BitZero',
};

/*
 * "AutoZero Advanced" is the same physical Sienci AutoZero plate as
 * "AutoZero" - identical routines, identical Z thickness, identical G-code.
 * The only difference is that Advanced exposes the probing-corner selector,
 * while plain AutoZero stays pinned to the default bottom-left corner.
 *
 * Every behavioural check on the AutoZero plate must therefore accept BOTH
 * types. Use this predicate instead of comparing against a single constant:
 * missing one of the call sites yields valid-looking G-code that zeroes in
 * the wrong place (wrong routine, wrong thickness, or a ~45mm corner error).
 */
export const isAutoZeroFamily = (touchplateType: string): boolean =>
    touchplateType === TOUCHPLATE_TYPE_AUTOZERO ||
    touchplateType === TOUCHPLATE_TYPE_AUTOZERO_ADVANCED;

/*
 * "3D Probe Advanced" is the same physical 3D/touch probe as "3D Probe".
 * The 3D probe has no routine of its own: it runs the standard-block code with
 * parameter overrides (tip-radius compensation instead of tool diameter, no
 * plate thickness in XY, the probe3D Z thickness, and the xyRetract3D
 * reposition). Advanced reuses all of that untouched and only adds the
 * probing-corner selector and the Circle Center routine.
 *
 * As with the AutoZero family, use this predicate rather than comparing
 * against a single constant - a missed call site silently reverts to
 * tool-diameter compensation and the standard-block thickness.
 */
export const is3DFamily = (touchplateType: string): boolean =>
    touchplateType === TOUCHPLATE_TYPE_3D ||
    touchplateType === TOUCHPLATE_TYPE_3D_ADVANCED;

/*
 * Circle Center finds the middle of a round feature and zeroes XY there.
 * Bore = probe outward to the inside walls of a hole; boss = probe inward to
 * the outside of a round part. Both take the midpoint of two opposing touches,
 * so the tip radius cancels and needs no compensation.
 */
export const CIRCLE_MODE_BORE = 'Inside bore';
export const CIRCLE_MODE_BOSS = 'Outside boss';
export const CIRCLE_MODES = {
    CIRCLE_MODE_BORE,
    CIRCLE_MODE_BOSS,
};

/*
 * getProbeCode dispatches on plate type and axes alone, and the centre-finding
 * routines' axes ({x, y}) collide with the plain "XY Touch" routine. Routines
 * that need their own G-code therefore carry an explicit id.
 *
 * Bore and boss are two separate routines rather than one routine with a mode
 * setting. They drive very different motion - one starts inside a hole, the
 * other steps around the outside of a part - so each gets its own button. The
 * probe buttons label themselves from the first word of the id, giving "Bore"
 * and "Boss".
 */
export const PROBE_ROUTINE_BORE_CENTER = 'Bore Center';
export const PROBE_ROUTINE_BOSS_CENTER = 'Boss Center';

export const isCentreFindingRoutine = (routineId?: string): boolean =>
    routineId === PROBE_ROUTINE_BORE_CENTER ||
    routineId === PROBE_ROUTINE_BOSS_CENTER;

/*
 * Which corner of the stock you are on matters for the touch-off routines,
 * because it decides the direction the probe travels and the sign of the
 * offsets. Circle Center derives its zero from the midpoint of two opposing
 * walls instead, so `direction` never reaches its G-code. Offering a corner
 * next to it implies a choice that has no effect on the resulting zero.
 */
export const routineUsesCorner = (routineId?: string): boolean =>
    !isCentreFindingRoutine(routineId);

export const PROBE_TYPE_AUTO = 'Auto';
export const PROBE_TYPE_TIP = 'Tip';
export const PROBE_TYPE_DIAMETER = 'Diameter';
export const PROBE_TYPES = {
    PROBE_TYPE_AUTO: 'Auto',
    PROBE_TYPE_TIP: 'Tip',
    PROBE_TYPE_DIAMETER: 'Diameter',
};

export const END_MILL = 'End Mill';
export const DRILL = 'Drill';
