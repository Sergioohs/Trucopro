export function updateMmr(mmrA: number, mmrB: number, scoreA: 0 | 1) {
  const k = 32;
  const expectedA = 1 / (1 + Math.pow(10, (mmrB - mmrA) / 400));
  const newA = Math.round(mmrA + k * (scoreA - expectedA));
  const newB = Math.round(mmrB + k * ((1 - scoreA) - (1 - expectedA)));
  return { newA, newB };
}
