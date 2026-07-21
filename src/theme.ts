export interface Theme {
  name: string;
  base: string;
  mantle: string;
  crust: string;
  surface0: string;
  surface1: string;
  text: string;
  subtext0: string;
  subtext1: string;
  overlay0: string;
  blue: string;
  red: string;
  yellow: string;
  teal: string;
  rosewater: string;
}

export const themes: Theme[] = [
  {
    name: "Catppuccin Mocha",
    base: "#1e1e2e",
    mantle: "#181825",
    crust: "#11111b",
    surface0: "#313244",
    surface1: "#45475a",
    text: "#cdd6f4",
    subtext0: "#a6adc8",
    subtext1: "#bac2de",
    overlay0: "#6c7086",
    blue: "#89b4fa",
    red: "#f38ba8",
    yellow: "#f9e2af",
    teal: "#94e2d5",
    rosewater: "#f5e0dc",
  },
  {
    name: "Catppuccin Macchiato",
    base: "#24273a",
    mantle: "#1e2030",
    crust: "#181926",
    surface0: "#363a4f",
    surface1: "#494d64",
    text: "#cad3f5",
    subtext0: "#a5adcb",
    subtext1: "#b8c0e0",
    overlay0: "#6e738d",
    blue: "#8aadf4",
    red: "#ed8796",
    yellow: "#eed49f",
    teal: "#8bd5ca",
    rosewater: "#f4dbd6",
  },
  {
    name: "Catppuccin Latte",
    base: "#eff1f5",
    mantle: "#e6e9ef",
    crust: "#dce0e8",
    surface0: "#ccd0da",
    surface1: "#bcc0cc",
    text: "#4c4f69",
    subtext0: "#6c6f85",
    subtext1: "#5c5f77",
    overlay0: "#9ca0b0",
    blue: "#1e66f5",
    red: "#d20f39",
    yellow: "#df8e1d",
    teal: "#179299",
    rosewater: "#dc8a78",
  },
  {
    name: "Catppuccin Frappé",
    base: "#303446",
    mantle: "#292c3c",
    crust: "#232634",
    surface0: "#414559",
    surface1: "#51576d",
    text: "#c6d0f5",
    subtext0: "#a5adce",
    subtext1: "#b5bfe2",
    overlay0: "#737994",
    blue: "#8caaee",
    red: "#e78284",
    yellow: "#e5c890",
    teal: "#81c8be",
    rosewater: "#f2d5cf",
  },
  {
    name: "Dracula",
    base: "#282a36",
    mantle: "#21222c",
    crust: "#21222c",
    surface0: "#44475a",
    surface1: "#6272a4",
    text: "#f8f8f2",
    subtext0: "#6272a4",
    subtext1: "#bd93f9",
    overlay0: "#6272a4",
    blue: "#bd93f9",
    red: "#ff5555",
    yellow: "#f1fa8c",
    teal: "#8be9fd",
    rosewater: "#ff79c6",
  },
  {
    name: "Nord",
    base: "#2e3440",
    mantle: "#2e3440",
    crust: "#2e3440",
    surface0: "#3b4252",
    surface1: "#434c5e",
    text: "#d8dee9",
    subtext0: "#4c566a",
    subtext1: "#e5e9f0",
    overlay0: "#4c566a",
    blue: "#81a1c1",
    red: "#bf616a",
    yellow: "#ebcb8b",
    teal: "#88c0d0",
    rosewater: "#b48ead",
  },
];
