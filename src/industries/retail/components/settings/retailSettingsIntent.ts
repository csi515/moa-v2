export type RetailSettingsPanel = 'home' | 'points' | 'categories' | 'warehouses';

let pendingPanel: RetailSettingsPanel | null = null;

/** 다른 화면에서 설정 하위 패널을 열고 들어올 때 사용한다. */
export function openRetailSettingsPanel(panel: Exclude<RetailSettingsPanel, 'home'>): void {
  pendingPanel = panel;
}

export function peekRetailSettingsPanel(): RetailSettingsPanel | null {
  return pendingPanel;
}

export function clearRetailSettingsPanel(): void {
  pendingPanel = null;
}
