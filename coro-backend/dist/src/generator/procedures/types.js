"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.COLORS = void 0;
exports.sid = sid;
exports.COLORS = {
    red: '#C0392B',
    orange: '#E67E22',
    yellow: '#F39C12',
    dark: '#2C3E50',
    blue: '#2980B9',
    green: '#27AE60',
};
function sid(procedureCode, index) {
    return `${procedureCode}_step_${index.toString().padStart(3, '0')}`;
}
//# sourceMappingURL=types.js.map