// We do not test tooltips yet (Andrei, 2021-11-14).
describe("Wrong email, empty password", () => {
  // Visit the Fogbender Admin login page.
  it.skip('Expect the "Please fill out this field" tooltip error message', () => {
    cy.visit("/login");

    // The form is invalid due to its input fields.
    // We call the native HTML method.
    cy.get(".mt-5").then($form => expect($form[0].checkValidity()).to.be.false);
    // Both form and "Password" elements are invalid at the start.
    ////cy.get('.mt-5:invalid')
    ////  .should('have.length', 2)
    cy.get('input[name="password"]:invalid')
      .invoke("prop", "validationMessage")
      .should("equal", "Please fill out this field.");

    // Enter text into the "Email" input field.
    cy.get('input[name="email"]').type("a@b.com");

    // Click on the "Log in" button.
    cy.get('button[type="submit"]').click();

    // Verify that the "Please fill out this field" tooltip error message is visible.
    cy.contains("Please fill out this field").should("be.visible");
  });
});
