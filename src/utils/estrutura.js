// Estrutura completa do hospital
export const ESTRUTURA_HOSPITAL = [
  {
    divisao: "Internamento",
    unidades: [
      {
        unidade: "Unidade A",
        quartos: [
          { quarto: "Quarto 1", leitos: 3 },
          { quarto: "Quarto 2", leitos: 3 },
          { quarto: "Quarto 3", leitos: 4 },
        ]
      },
      {
        unidade: "Unidade B",
        quartos: Array.from({ length: 8 }, (_, i) => ({ quarto: `Quarto ${i + 1}`, leitos: 4 }))
      },
      {
        unidade: "Unidade C",
        quartos: [
          { quarto: "Quarto 1", leitos: 4 },
          { quarto: "Quarto 2", leitos: 5 },
          { quarto: "Quarto 3", leitos: 5 },
        ]
      },
      {
        unidade: "Unidade D",
        quartos: [
          { quarto: "Quarto 1", leitos: 3 },
          { quarto: "Quarto 2", leitos: 3 },
          { quarto: "Quarto 3", leitos: 3 },
          { quarto: "Quarto 4", leitos: 4 },
          { quarto: "Quarto 5", leitos: 3 },
          { quarto: "Quarto 6", leitos: 4 },
          { quarto: "Quarto 7", leitos: 3 },
          { quarto: "Quarto 8", leitos: 3 },
          { quarto: "Quarto 9", leitos: 3 },
          { quarto: "Quarto 10", leitos: 4 },
          { quarto: "Quarto 11", leitos: 3 },
          { quarto: "Quarto 12", leitos: 4 },
          { quarto: "Quarto 13", leitos: 4 },
          { quarto: "Quarto 14", leitos: 3 },
        ]
      },
      {
        unidade: "Unidade E",
        quartos: [
          { quarto: "Quarto 1", leitos: 2 },
          { quarto: "Quarto 2", leitos: 2 },
          { quarto: "Quarto 3", leitos: 3 },
          { quarto: "Quarto 4", leitos: 3 },
          { quarto: "Quarto 5", leitos: 1 },
          { quarto: "Quarto 6", leitos: 2 },
          { quarto: "Quarto 7", leitos: 1 },
          { quarto: "Quarto 8", leitos: 2 },
          { quarto: "Quarto 9", leitos: 2 },
          { quarto: "Quarto 10", leitos: 2 },
          { quarto: "Quarto 11", leitos: 2 },
          { quarto: "Quarto 12", leitos: 2 },
        ]
      },
      {
        unidade: "Unidade F",
        quartos: [
          { quarto: "Quarto 1", leitos: 2 },
          { quarto: "Quarto 2", leitos: 6 },
          { quarto: "Quarto 3", leitos: 3 },
          { quarto: "Quarto 4", leitos: 4 },
          { quarto: "Quarto 5", leitos: 1 },
          { quarto: "Quarto 6", leitos: 1 },
        ]
      },
    ]
  },
  {
    divisao: "Unidade de Terapia Intensiva",
    unidades: [
      { unidade: "UTI 1", quartos: [{ quarto: "UTI 1", leitos: ["101","102","103","104","105","106","107","108","109","110"] }] },
      { unidade: "UTI 2", quartos: [{ quarto: "UTI 2", leitos: ["201","202","203","204","205","206","207","208","209","210"] }] },
      { unidade: "UTI 3", quartos: [{ quarto: "UTI 3", leitos: ["301","302","303","304","305","306","307","308","309","310"] }] },
      { unidade: "UTI 4", quartos: [{ quarto: "UTI 4", leitos: ["401","402","403","404","405","406","407","408","409","410"] }] },
      { unidade: "UTI 5", quartos: [{ quarto: "UTI 5", leitos: ["501","502","503","504","505","506","507","508","509","510"] }] },
      { unidade: "UTI 6", quartos: [{ quarto: "UTI 6", leitos: ["601","602","603","604","605","607","608"] }] },
    ]
  }
];

// Gera todos os leitos da estrutura como objetos prontos para criação
export function gerarTodosLeitos() {
  const resultado = [];
  ESTRUTURA_HOSPITAL.forEach(({ divisao, unidades }) => {
    unidades.forEach(({ unidade, quartos }) => {
      quartos.forEach(({ quarto, leitos }) => {
        const lista = Array.isArray(leitos)
          ? leitos
          : Array.from({ length: leitos }, (_, i) => `Leito ${i + 1}`);
        lista.forEach(numero => {
          resultado.push({ divisao, unidade, quarto, numero, status: 'livre', ativo: true, bloqueado: false });
        });
      });
    });
  });
  return resultado;
}