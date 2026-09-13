export interface Plato {
  id: string
  nombre: string
  categoria: string
  precio: number
  disponible: boolean
}

const filas: [string, string, number][] = [
  ['Ceviche clásico', 'Fríos', 38],
  ['Tiradito de lenguado', 'Fríos', 42],
  ['Causa limeña', 'Fríos', 24],
  ['Leche de tigre', 'Fríos', 22],
  ['Lomo saltado', 'Fondos', 48],
  ['Ají de gallina', 'Fondos', 36],
  ['Arroz con mariscos', 'Fondos', 45],
  ['Seco de cabrito', 'Fondos', 52],
  ['Tacu tacu con lomo', 'Fondos', 49],
  ['Anticuchos', 'Entradas', 28],
  ['Papa a la huancaína', 'Entradas', 18],
  ['Choclo con queso', 'Entradas', 16],
  ['Suspiro limeño', 'Postres', 16],
  ['Picarones', 'Postres', 18],
  ['Chicha morada', 'Bebidas', 9],
  ['Pisco sour', 'Bebidas', 24],
  ['Inca Kola 500 ml', 'Bebidas', 7],
]

/** Carta de ejemplo para las demos de la documentación. */
export const platos: Plato[] = filas.map(([nombre, categoria, precio], i) => ({
  id: `demo-${i}`,
  nombre,
  categoria,
  precio,
  disponible: i % 5 !== 3,
}))
