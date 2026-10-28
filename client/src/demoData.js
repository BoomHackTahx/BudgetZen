export function createDemoData(month) {
  const sampleTransactions = [
    { id: 1, type: 'income', amount: '320000.0000', category: 'salary', note: 'Volan-kely isam-bolana', date: `${month}-02` },
    { id: 2, type: 'expense', amount: '68000.0000', category: 'food', note: 'Tsena sy sakafo', date: `${month}-04` },
    { id: 3, type: 'expense', amount: '24000.0000', category: 'transport', note: 'Saran-dalana', date: `${month}-06` },
    { id: 4, type: 'expense', amount: '45000.0000', category: 'study', note: 'Boky sy fitaovana', date: `${month}-09` },
    { id: 5, type: 'expense', amount: '32000.0000', category: 'leisure', note: 'Fialam-boly', date: `${month}-12` },
    { id: 6, type: 'income', amount: '50000.0000', category: 'other', note: 'Asa fanampiny', date: `${month}-15` },
  ];

  return {
    month,
    totals: { income: '370000.0000', expenses: '169000.0000' },
    recent: sampleTransactions.slice().reverse(),
    expensesByCategory: [
      { category: 'food', amount: '68000.0000' },
      { category: 'study', amount: '45000.0000' },
      { category: 'leisure', amount: '32000.0000' },
      { category: 'transport', amount: '24000.0000' },
    ],
    budgets: [
      { category: 'food', limitAmount: '100000.0000', spent: '68000.0000' },
      { category: 'transport', limitAmount: '50000.0000', spent: '24000.0000' },
      { category: 'study', limitAmount: '60000.0000', spent: '45000.0000' },
    ],
    transactions: sampleTransactions.slice().reverse(),
    user: { name: 'Demo', currency: 'MGA' },
  };
}
