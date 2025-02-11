var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define(["require", "exports"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.Converter = void 0;
    /**
     * Represents a conversion path
     */
    var Converter = /** @class */ (function () {
        function Converter(measures, value) {
            this.val = 0;
            this.destination = null;
            this.origin = null;
            if (typeof value === 'number') {
                this.val = value;
            }
            if (typeof measures !== 'object') {
                throw new Error('Measures cannot be blank');
            }
            this.measureData = measures;
        }
        /**
         * Lets the converter know the source unit abbreviation
         */
        Converter.prototype.from = function (from) {
            if (this.destination != null)
                throw new Error('.from must be called before .to');
            this.origin = this.getUnit(from);
            if (this.origin == null) {
                this.throwUnsupportedUnitError(from);
            }
            return this;
        };
        /**
         * Converts the unit and returns the value
         */
        Converter.prototype.to = function (to) {
            var _a, _b;
            if (this.origin == null)
                throw new Error('.to must be called after .from');
            this.destination = this.getUnit(to);
            if (this.destination == null) {
                this.throwUnsupportedUnitError(to);
            }
            var destination = this.destination;
            var origin = this.origin;
            // Don't change the value if origin and destination are the same
            if (origin.abbr === destination.abbr) {
                return this.val;
            }
            // You can't go from liquid to mass, for example
            if (destination.measure != origin.measure) {
                throw new Error("Cannot convert incompatible measures of " + destination.measure + " and " + origin.measure);
            }
            /**
             * Convert from the source value to its anchor inside the system
             */
            var result = this.val * origin.unit.to_anchor;
            /**
             * For some changes it's a simple shift (C to K)
             * So we'll add it when convering into the unit (later)
             * and subtract it when converting from the unit
             */
            if (origin.unit.anchor_shift) {
                result -= origin.unit.anchor_shift;
            }
            /**
             * Convert from one system to another through the anchor ratio. Some conversions
             * aren't ratio based or require more than a simple shift. We can provide a custom
             * transform here to provide the direct result
             */
            if (origin.system != destination.system) {
                var measure = this.measureData[origin.measure];
                var anchors = measure.anchors;
                if (anchors == null) {
                    throw new Error("Unable to convert units. Anchors are missing for \"" + origin.measure + "\" and \"" + destination.measure + "\" measures.");
                }
                var anchor = anchors[origin.system];
                if (anchor == null) {
                    throw new Error("Unable to find anchor for \"" + origin.measure + "\" to \"" + destination.measure + "\". Please make sure it is defined.");
                }
                var transform = (_a = anchor[destination.system]) === null || _a === void 0 ? void 0 : _a.transform;
                var ratio = (_b = anchor[destination.system]) === null || _b === void 0 ? void 0 : _b.ratio;
                if (typeof transform === 'function') {
                    result = transform(result);
                }
                else if (typeof ratio === 'number') {
                    result *= ratio;
                }
                else {
                    throw new Error('A system anchor needs to either have a defined ratio number or a transform function.');
                }
            }
            /**
             * This shift has to be done after the system conversion business
             */
            if (destination.unit.anchor_shift) {
                result += destination.unit.anchor_shift;
            }
            /**
             * Convert to another unit inside the destination system
             */
            return result / destination.unit.to_anchor;
        };
        /**
         * Converts the unit to the best available unit.
         */
        Converter.prototype.toBest = function (options) {
            var _a, _b, _c;
            if (this.origin == null)
                throw new Error('.toBest must be called after .from');
            var exclude = [];
            var cutOffNumber = 1;
            var system = this.origin.system;
            if (typeof options === 'object') {
                exclude = (_a = options.exclude) !== null && _a !== void 0 ? _a : [];
                cutOffNumber = (_b = options.cutOffNumber) !== null && _b !== void 0 ? _b : 1;
                system = (_c = options.system) !== null && _c !== void 0 ? _c : this.origin.system;
            }
            var best = null;
            /**
              Looks through every possibility for the 'best' available unit.
              i.e. Where the value has the fewest numbers before the decimal point,
              but is still higher than 1.
            */
            for (var _i = 0, _d = this.possibilities(); _i < _d.length; _i++) {
                var possibility = _d[_i];
                var unit = this.describe(possibility);
                var isIncluded = exclude.indexOf(possibility) === -1;
                if (isIncluded && unit.system === system) {
                    var result = this.to(possibility);
                    if (result < cutOffNumber) {
                        continue;
                    }
                    if (best == null || (result >= cutOffNumber && result < best.val)) {
                        best = {
                            val: result,
                            unit: possibility,
                            singular: unit.singular,
                            plural: unit.plural,
                        };
                    }
                }
            }
            return best;
        };
        /**
         * Finds the unit
         */
        Converter.prototype.getUnit = function (abbr) {
            var found = null;
            for (var _i = 0, _a = Object.entries(this.measureData); _i < _a.length; _i++) {
                var _b = _a[_i], measureName = _b[0], measure = _b[1];
                for (var _c = 0, _d = Object.entries(measure.systems); _c < _d.length; _c++) {
                    var _e = _d[_c], systemName = _e[0], system = _e[1];
                    for (var _f = 0, _g = Object.entries(system); _f < _g.length; _f++) {
                        var _h = _g[_f], testAbbr = _h[0], unit = _h[1];
                        if (testAbbr == abbr) {
                            return {
                                abbr: abbr,
                                measure: measureName,
                                system: systemName,
                                unit: unit,
                            };
                        }
                    }
                }
            }
            return found;
        };
        /**
         * An alias for getUnit
         */
        Converter.prototype.describe = function (abbr) {
            var result = this.getUnit(abbr);
            if (result != null) {
                return this.describeUnit(result);
            }
            this.throwUnsupportedUnitError(abbr);
        };
        Converter.prototype.describeUnit = function (unit) {
            return {
                abbr: unit.abbr,
                measure: unit.measure,
                system: unit.system,
                singular: unit.unit.name.singular,
                plural: unit.unit.name.plural,
            };
        };
        /**
         * Detailed list of all supported units
         *
         * If a measure is supplied the list will only contain
         * details about that measure. Otherwise the list will contain
         * details abaout all measures.
         *
         * However, if the measure doesn't exist, an empty array will be
         * returned
         *
         */
        Converter.prototype.list = function (measureName) {
            var list = [];
            if (measureName == null) {
                for (var _i = 0, _a = Object.entries(this.measureData); _i < _a.length; _i++) {
                    var _b = _a[_i], name_1 = _b[0], measure = _b[1];
                    for (var _c = 0, _d = Object.entries(measure.systems); _c < _d.length; _c++) {
                        var _e = _d[_c], systemName = _e[0], units = _e[1];
                        for (var _f = 0, _g = Object.entries(units); _f < _g.length; _f++) {
                            var _h = _g[_f], abbr = _h[0], unit = _h[1];
                            list.push(this.describeUnit({
                                abbr: abbr,
                                measure: name_1,
                                system: systemName,
                                unit: unit,
                            }));
                        }
                    }
                }
            }
            else if (!(measureName in this.measureData)) {
                throw new Error("Meausre \"" + measureName + "\" not found.");
            }
            else {
                var measure = this.measureData[measureName];
                for (var _j = 0, _k = Object.entries(measure.systems); _j < _k.length; _j++) {
                    var _l = _k[_j], systemName = _l[0], units = _l[1];
                    for (var _m = 0, _o = Object.entries(units); _m < _o.length; _m++) {
                        var _p = _o[_m], abbr = _p[0], unit = _p[1];
                        list.push(this.describeUnit({
                            abbr: abbr,
                            measure: measureName,
                            system: systemName,
                            unit: unit,
                        }));
                    }
                }
            }
            return list;
        };
        Converter.prototype.throwUnsupportedUnitError = function (what) {
            var validUnits = [];
            for (var _i = 0, _a = Object.values(this.measureData); _i < _a.length; _i++) {
                var measure = _a[_i];
                for (var _b = 0, _c = Object.values(measure.systems); _b < _c.length; _b++) {
                    var systems = _c[_b];
                    validUnits = validUnits.concat(Object.keys(systems));
                }
            }
            throw new Error("Unsupported unit " + what + ", use one of: " + validUnits.join(', '));
        };
        /**
         * Returns the abbreviated measures that the value can be
         * converted to.
         */
        Converter.prototype.possibilities = function (forMeasure) {
            var possibilities = [];
            var list_measures = [];
            if (typeof forMeasure == 'string') {
                list_measures.push(forMeasure);
            }
            else if (this.origin != null) {
                list_measures.push(this.origin.measure);
            }
            else {
                list_measures = Object.keys(this.measureData);
            }
            for (var _i = 0, list_measures_1 = list_measures; _i < list_measures_1.length; _i++) {
                var measure = list_measures_1[_i];
                var systems = this.measureData[measure].systems;
                for (var _a = 0, _b = Object.values(systems); _a < _b.length; _a++) {
                    var system = _b[_a];
                    possibilities = __spreadArray(__spreadArray([], possibilities, true), Object.keys(system), true);
                }
            }
            return possibilities;
        };
        /**
         * Returns the abbreviated measures that the value can be
         * converted to.
         */
        Converter.prototype.measures = function () {
            return Object.keys(this.measureData);
        };
        return Converter;
    }());
    exports.Converter = Converter;
    function default_1(measures) {
        return function (value) {
            return new Converter(measures, value);
        };
    }
    exports.default = default_1;
});
