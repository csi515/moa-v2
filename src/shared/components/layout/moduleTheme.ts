export type ModuleTheme = 'indigo' | 'teal' | 'orange' | 'sky' | 'rose';

export interface ModuleThemeTokens {
  shell: string;
  sidebarActive: string;
  sidebarActiveIcon: string;
  sidebarBadge: string;
  bottomNavActive: string;
  bottomSheetActive: string;
  bottomSheetActiveIcon: string;
}

export const MODULE_THEMES: Record<ModuleTheme, ModuleThemeTokens> = {
  indigo: {
    shell: 'min-h-screen bg-[#F1F5F9] text-slate-800 flex flex-col font-sans antialiased selection:bg-indigo-500 selection:text-white',
    sidebarActive: 'bg-indigo-50 text-indigo-700 font-bold',
    sidebarActiveIcon: 'text-indigo-600',
    sidebarBadge: 'bg-indigo-600 text-white',
    bottomNavActive: 'text-indigo-600 font-bold',
    bottomSheetActive: 'bg-indigo-50 border-indigo-200 text-indigo-700',
    bottomSheetActiveIcon: 'bg-indigo-600 text-white',
  },
  teal: {
    shell: 'min-h-screen bg-[#F1F5F9] text-slate-800 flex flex-col font-sans antialiased selection:bg-teal-500 selection:text-white',
    sidebarActive: 'bg-teal-50 text-teal-700 font-bold',
    sidebarActiveIcon: 'text-teal-600',
    sidebarBadge: 'bg-teal-600 text-white',
    bottomNavActive: 'text-teal-600 font-bold',
    bottomSheetActive: 'bg-teal-50 border-teal-200 text-teal-700',
    bottomSheetActiveIcon: 'bg-teal-600 text-white',
  },
  orange: {
    shell: 'min-h-screen bg-[#F1F5F9] text-slate-800 flex flex-col font-sans antialiased selection:bg-orange-500 selection:text-white',
    sidebarActive: 'bg-orange-50 text-orange-700 font-bold',
    sidebarActiveIcon: 'text-orange-600',
    sidebarBadge: 'bg-orange-600 text-white',
    bottomNavActive: 'text-orange-600 font-bold',
    bottomSheetActive: 'bg-orange-50 border-orange-200 text-orange-700',
    bottomSheetActiveIcon: 'bg-orange-600 text-white',
  },
  sky: {
    shell: 'min-h-screen bg-[#F1F5F9] text-slate-800 flex flex-col font-sans antialiased selection:bg-sky-500 selection:text-white',
    sidebarActive: 'bg-sky-50 text-sky-700 font-bold',
    sidebarActiveIcon: 'text-sky-600',
    sidebarBadge: 'bg-sky-600 text-white',
    bottomNavActive: 'text-sky-600 font-bold',
    bottomSheetActive: 'bg-sky-50 border-sky-200 text-sky-700',
    bottomSheetActiveIcon: 'bg-sky-600 text-white',
  },
  rose: {
    shell: 'min-h-screen bg-[#F1F5F9] text-slate-800 flex flex-col font-sans antialiased selection:bg-rose-500 selection:text-white',
    sidebarActive: 'bg-rose-50 text-rose-700 font-bold',
    sidebarActiveIcon: 'text-rose-600',
    sidebarBadge: 'bg-rose-600 text-white',
    bottomNavActive: 'text-rose-600 font-bold',
    bottomSheetActive: 'bg-rose-50 border-rose-200 text-rose-700',
    bottomSheetActiveIcon: 'bg-rose-600 text-white',
  },
};
