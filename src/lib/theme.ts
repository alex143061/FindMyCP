import { useColorScheme } from 'react-native';

const palette = {
  light: {
    background: '#F4F7F6',
    surface: '#FFFFFF',
    surfaceAlt: '#EAF0EE',
    text: '#15231F',
    muted: '#66766F',
    border: '#DDE6E2',
    accent: '#087E67',
    accentSoft: '#D8F2E9',
    danger: '#B54745',
    warning: '#9A6700',
    map: '#E6EFEA',
    input: '#FFFFFF',
  },
  dark: {
    background: '#101816',
    surface: '#19231F',
    surfaceAlt: '#24312C',
    text: '#F0F6F3',
    muted: '#A2B0AA',
    border: '#33413B',
    accent: '#62D4B2',
    accentSoft: '#1C4138',
    danger: '#FF8B81',
    warning: '#F3C969',
    map: '#22332D',
    input: '#19231F',
  },
};

export function useAppTheme() {
  return palette[useColorScheme() === 'dark' ? 'dark' : 'light'];
}

export type AppTheme = ReturnType<typeof useAppTheme>;
