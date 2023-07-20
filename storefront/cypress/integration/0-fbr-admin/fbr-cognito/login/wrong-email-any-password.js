describe("Wrong email; any password", () => {
  // Visit the Fogbender Admin login page.
  it('Expect the "No such user" error message', () => {
    cy.visit("/login");

    // Enter text into the "Email" input field.
    cy.get('input[name="email"]').type("a@b.com");

    // Enter text into the "Password" input field.
    cy.get('input[name="password"]').type("anypassword");

    // Click on the "Log in" button.
    cy.get('button[type="submit"]').contains("Log in").click();

    // Verify that the "No such user" error message is visible.
    cy.get(".mt-7.text-brand-pink-500").contains("No such user").should("be.visible");
  });
});
