"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.COLORS = void 0;
exports.sid = sid;
exports.COLORS = {
    red: '#C0392B',
    green: '#27AE60',
    blue: '#2980B9',
    gray: '#7F8C8D',
    white: '#ECF0F1',
    dark: '#2C3E50',
    orange: '#E67E22',
    yellow: '#F1C40F',
    brown: '#8B4513',
    turquoise: '#1ABC9C',
    garnet: '#8B0000',
    pink: '#E91E63',
    purple: '#8E44AD',
    silver: '#95A5A6',
    indigo: '#4B0082',
    fireAlert: '#FF6600',
    fireAlarm: '#FF0000',
    teal: '#008B8B',
    slate: '#607D8B',
    olive: '#808000',
    amber: '#FF8F00',
    onyx: '#353839',
    steel: '#4682B4',
    coral: '#FF6B6B',
    sapphire: '#0057A8',
    glacier: '#A8D8EA',
    cobalt: '#0047AB',
    scarlet: '#FF2400',
};
function sid(procedureCode, index) {
    return `${procedureCode}_step_${index.toString().padStart(3, '0')}`;
}
//# sourceMappingURL=types.js.map