// Ejemplo: frontend/cypress/e2e/inventario.cy.js
// La API se simula con cy.intercept para que el E2E no dependa de MySQL en CI.
describe('Inventario SmartStock', () => {
  beforeEach(() => {
    cy.intercept('GET', '**/api/productos*', {
      statusCode: 200,
      body: [
        { id: 1, nombre: 'Teclado mecánico', stock: 12, precio: 45.9 },
        { id: 2, nombre: 'Mouse inalámbrico', stock: 3, precio: 18.5 },
      ],
    }).as('getProductos')
  })

  it('lista los productos del inventario', () => {
    cy.visit('/productos')
    cy.wait('@getProductos')
    cy.contains('Teclado mecánico').should('be.visible')
    cy.contains('Mouse inalámbrico').should('be.visible')
  })
})
