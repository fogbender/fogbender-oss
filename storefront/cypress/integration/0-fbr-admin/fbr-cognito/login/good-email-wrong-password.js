describe("Good email; wrong password", () => {
  // Visit the Fogbender Admin login page.
  it('Expect the "Incorrect password, please try again." error message', () => {
    cy.visit("/login");

    // Enter text into the "Email" input field.
    cy.get('input[name="email"]').type("boris.soroker+1@gmail.com");

    // Enter text into the "Password" input field.
    cy.get('input[name="password"]').type("wrongpassword");

    // Click on the "Log in" button.
    cy.get('button[type="submit"]').click();

    // Verify that the "No such user" error message is visible.
    cy.get(".mt-7.text-brand-pink-500")
      .contains("Incorrect password, please try again.")
      .should("be.visible");
  });
});
