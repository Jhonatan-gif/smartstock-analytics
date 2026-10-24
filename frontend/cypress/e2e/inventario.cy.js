// E2E StockDinámico: la API se simula con cy.intercept (fixtures capturados de la API real)
// para que la prueba no dependa de SQL Server en CI.

function login(email, password) {
  cy.visit('/login');
  cy.get('input[type="email"]').type(email);
  cy.get('input[type="password"]').type(password, { log: false });
  cy.contains('button', 'Ingresar').click();
}

describe('Catálogo con precios dinámicos (cliente VIP)', () => {
  beforeEach(() => {
    cy.intercept('POST', '**/api/auth/login', { fixture: 'login-vip.json' }).as('login');
    cy.intercept('GET', '**/api/products', { fixture: 'products-vip.json' }).as('getProductos');
  });

  it('inicia sesión y ve su precio personalizado', () => {
    login('vip@supercorp.com', 'User123!');

    cy.wait('@login').its('request.body').should('deep.equal', {
      email: 'vip@supercorp.com', password: 'User123!',
    });
    cy.wait('@getProductos').its('request.headers.authorization').should('eq', 'Bearer e2e-vip-token');

    cy.location('pathname').should('eq', '/catalogo');
    cy.contains('span.badge', 'VIP').should('be.visible');
    cy.contains('.card', 'Leche Entera 1L').within(() => {
      cy.contains('$0.76').should('be.visible');
      cy.contains('$1.20').should('have.class', 'line-through');
    });
  });

  it('filtra el catálogo por categoría y por búsqueda', () => {
    login('vip@supercorp.com', 'User123!');
    cy.wait('@getProductos');

    cy.contains('button', 'Bebidas').click();
    cy.get('.card').should('have.length', 1).and('contain', 'Jugo de Naranja 1L');

    cy.contains('button', 'TODAS').click();
    cy.get('input[placeholder="Buscar producto..."]').type('PRD-007');
    cy.get('.card').should('have.length', 1).and('contain', 'Pan Integral 500g');
  });
});

describe('Panel de administración', () => {
  beforeEach(() => {
    cy.intercept('POST', '**/api/auth/login', { fixture: 'login-admin.json' }).as('login');
    cy.intercept('GET', '**/api/products/reports/inventory', { fixture: 'inventory.json' }).as('inventario');
    cy.intercept('GET', '**/api/products/reports/alerts', { fixture: 'alerts.json' }).as('alertas');
    cy.intercept('GET', '**/api/products', { fixture: 'products-admin.json' }).as('getProductos');
  });

  it('el admin llega al dashboard y revisa el stock por lotes', () => {
    login('admin@stockdinamico.com', 'Admin123!');
    cy.wait(['@inventario', '@alertas']);
    cy.location('pathname').should('eq', '/admin/dashboard');
    cy.contains('h1', 'Dashboard').should('be.visible');

    cy.contains('a', 'Productos').click();
    cy.wait('@getProductos');
    cy.contains('h1', 'Productos y Stock').should('be.visible');
    cy.contains('td', 'Leche Entera 1L').should('be.visible');
    cy.contains('td', 'Yogur Natural 400g').should('be.visible');
  });

  it('un admin no puede entrar al catálogo de clientes', () => {
    login('admin@stockdinamico.com', 'Admin123!');
    cy.wait('@login');
    cy.visit('/catalogo');
    cy.location('pathname').should('eq', '/admin/dashboard');
  });
});

describe('Login', () => {
  it('muestra el error con credenciales inválidas', () => {
    cy.intercept('POST', '**/api/auth/login', {
      statusCode: 401,
      body: { success: false, error: 'Credenciales inválidas' },
    }).as('loginFallido');

    login('ana@gmail.com', 'incorrecta');
    cy.wait('@loginFallido');
    cy.contains('Credenciales inválidas').should('be.visible');
    cy.location('pathname').should('eq', '/login');
  });
});
