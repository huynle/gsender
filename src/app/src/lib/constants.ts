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
export const TOUCHPLATE_TYPE_BITZERO = 'BitZero';
export const TOUCHPLATE_TYPES = {
    TOUCHPLATE_TYPE_STANDARD: 'Standard Block',
    TOUCHPLATE_TYPE_AUTOZERO: 'AutoZero',
    TOUCHPLATE_TYPE_AUTOZERO_ADVANCED: 'AutoZero Advanced',
    TOUCHPLATE_TYPE_ZERO: 'Z Probe',
    TOUCHPLATE_TYPE_3D: '3D Probe',
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
