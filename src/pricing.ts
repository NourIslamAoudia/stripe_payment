// src/pricing.ts
export const productPrices: Record<string, number> = {
  pantalon: 500,   // 5.00€ en centimes
  veste: 800,
  robe: 1000,
  chemise: 600,
  manteau: 1200,
  autre: 700,
};

export const servicePrices: Record<string, number> = {
  retouche: 1000,       // 10.00€
  reparation: 1500,
  personnalisation: 2000,
  upcycling: 2500,
};