// Curated font list. All OFL via Google Fonts CDN through jsDelivr.
// Variable-font URLs use URL-encoded brackets (%5B / %5D) and commas (%2C).

export interface FontOption {
  url: string;
  label: string;
}

const J = "https://cdn.jsdelivr.net/gh/google/fonts@main";

export const FONTS: FontOption[] = [
  { url: `${J}/ofl/unifrakturmaguntia/UnifrakturMaguntia-Book.ttf`,           label: "UnifrakturMaguntia (blackletter)" },
  { url: `${J}/ofl/unifrakturcook/UnifrakturCook-Bold.ttf`,                   label: "UnifrakturCook (blackletter)" },
  { url: `${J}/ofl/pirataone/PirataOne-Regular.ttf`,                          label: "Pirata One (blackletter)" },
  { url: `${J}/ofl/newrocker/NewRocker-Regular.ttf`,                          label: "New Rocker (blackletter-rock)" },
  { url: `${J}/ofl/metalmania/MetalMania-Regular.ttf`,                        label: "Metal Mania (gothic metal)" },
  { url: `${J}/ofl/imfellenglish/IMFeENrm28P.ttf`,                            label: "IM Fell English (old gothic serif)" },
  { url: `${J}/ofl/cinzel/Cinzel%5Bwght%5D.ttf`,                              label: "Cinzel (Roman caps)" },
  { url: `${J}/ofl/playfairdisplay/PlayfairDisplay%5Bwght%5D.ttf`,            label: "Playfair Display (display serif)" },
  { url: `${J}/ofl/merriweather/Merriweather%5Bopsz%2Cwdth%2Cwght%5D.ttf`,    label: "Merriweather (slab serif)" },
  { url: `${J}/ofl/lato/Lato-Regular.ttf`,                                    label: "Lato (sans)" },
  { url: `${J}/ofl/anton/Anton-Regular.ttf`,                                  label: "Anton (heavy sans)" },
  { url: `${J}/ofl/oswald/Oswald%5Bwght%5D.ttf`,                              label: "Oswald (condensed sans)" },
  { url: `${J}/ofl/bebasneue/BebasNeue-Regular.ttf`,                          label: "Bebas Neue (tall narrow)" },
  { url: `${J}/ofl/blackopsone/BlackOpsOne-Regular.ttf`,                      label: "Black Ops One (stencil)" },
  { url: `${J}/ofl/bowlbyonesc/BowlbyOneSC-Regular.ttf`,                      label: "Bowlby One SC (chunky display)" },
];

export const DEFAULT_FONT_URL = FONTS[0].url;
