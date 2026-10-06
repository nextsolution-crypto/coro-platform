export function applyFamilySelection(currentFamilyCodes, familyCode, selected) {
  if (selected) {
    return currentFamilyCodes.includes(familyCode)
      ? currentFamilyCodes
      : [...currentFamilyCodes, familyCode];
  }
  return currentFamilyCodes.filter((code) => code !== familyCode);
}
